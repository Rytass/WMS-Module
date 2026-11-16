#!/usr/bin/env node
/**
 * The pre-publish package gate: packs the project once, then runs every check
 * against that one tarball.
 *
 * Packing once is the point. The targets this replaces each ran `npm pack`
 * themselves and then globbed `libs/<name>/*.tgz`, so an interrupted run that
 * left a stale tarball behind made the next run analyse the wrong artefact —
 * and the answer it gave was plausible either way. Everything below now reads
 * the exact file this script produced.
 *
 * The checks:
 *
 *   publint  — package.json shape against the *extracted* tarball, so the
 *              `files` allowlist is applied first. Running it on the working
 *              directory instead lets a file that never ships satisfy a field.
 *   attw     — whether the types resolve, and resolve to the same module kind
 *              as the JavaScript beside them, under node10 / node16 / bundler.
 *   one file — every condition of a subpath resolves to the same JavaScript,
 *              so the package cannot be loaded twice in one process.
 *   imports  — every bare specifier in the shipped JavaScript is declared in
 *              dependencies, peerDependencies or optionalDependencies. Neither
 *              of the other two looks at this, which is how `tslib` shipped
 *              undeclared in core and graphql: every real consumer already had
 *              it transitively, so a clean install was the only thing that
 *              could have failed, and nothing did a clean install.
 *
 * Usage: node tools/pkg-gate.mjs <projectRoot> [--attw-ignore rule[,rule...]]
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const projectRoot = argv[0];
const ignoreIndex = argv.indexOf('--attw-ignore');
const attwIgnore = ignoreIndex === -1 ? null : argv[ignoreIndex + 1];

if (!projectRoot || projectRoot.startsWith('--')) {
  console.error('usage: node tools/pkg-gate.mjs <projectRoot> [--attw-ignore rules]');
  process.exit(1);
}

const workspaceRoot = process.cwd();
const staging = mkdtempSync(join(tmpdir(), 'wms-pkg-gate-'));
const failures = [];

const run = (label, file, args, opts = {}) => {
  process.stdout.write(`\n── ${label} ──\n`);

  try {
    execFileSync(file, args, { stdio: 'inherit', cwd: workspaceRoot, ...opts });
  } catch {
    failures.push(label);
  }
};

try {
  // 1. Pack once. `--json` reports the filename npm chose, so nothing globs.
  const packed = JSON.parse(
    execFileSync(
      'npm',
      ['pack', '--json', '--pack-destination', staging, resolve(projectRoot)],
      { cwd: workspaceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
    ),
  );

  const tarball = join(staging, packed[0].filename);

  execFileSync('tar', ['-xzf', tarball, '-C', staging]);

  const extracted = join(staging, 'package');
  const pkg = JSON.parse(readFileSync(join(extracted, 'package.json'), 'utf8'));

  console.log(`\n${pkg.name}@${pkg.version} — ${packed[0].filename}`);

  // 2. publint, against what actually ships.
  run('publint', 'npx', ['-y', 'publint', 'run', extracted, '--pack', 'false']);

  // 3. attw, against the same tarball.
  run('attw', 'npx', [
    '-y',
    '@arethetypeswrong/cli',
    tarball,
    ...(attwIgnore ? ['--ignore-rules', attwIgnore] : []),
  ]);

  // 4. One runtime file per entry point.
  //
  // A package that resolves `import` and `require` to different files has two
  // module records in a process that reaches both, and therefore two of
  // everything they export. That is fatal here rather than merely wasteful:
  // these packages export DI Symbols and TypeORM entity classes, and both are
  // identities. Measured on the published 0.9.1, all 64 exported Symbols and
  // all 57 entity classes differed between the ESM and CJS copies, so a
  // provider lookup or an `instanceof` crossing the boundary silently missed.
  //
  // The rule is therefore structural: every condition of a subpath must point
  // at the same file, so no resolver can produce a second copy. `types` is
  // exempt — declarations have no runtime identity.
  process.stdout.write('\n── one runtime file per entry point ──\n');

  const runtimeTargets = (node, underTypes = false) => {
    if (typeof node === 'string') return underTypes ? [] : [node];
    if (node === null || typeof node !== 'object') return [];

    return Object.entries(node).flatMap(([condition, child]) =>
      runtimeTargets(child, underTypes || condition === 'types'),
    );
  };

  const forked = Object.entries(pkg.exports ?? {})
    .map(([subpath, node]) => [subpath, new Set(runtimeTargets(node))])
    .filter(([, targets]) => targets.size > 1);

  if (forked.length > 0) {
    for (const [subpath, targets] of forked) {
      console.log(`${subpath} resolves to ${[...targets].join(' and ')}`);
    }

    console.log(
      'Each of those can be loaded twice in one process, giving two of every ' +
        'Symbol and class the subpath exports. Collapse the conditions onto ' +
        'one file.',
    );
    failures.push('one runtime file per entry point');
  } else {
    const subpaths = Object.keys(pkg.exports ?? {}).length;

    console.log(`no subpath forks into two runtime files (${subpaths} checked)`);
  }

  // 5. Undeclared imports.
  process.stdout.write('\n── declared dependencies ──\n');

  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]);

  const patterns = [
    /(?:^|[\s;{}()=])import\s+[^'"()]*?from\s*['"]([^'"]+)['"]/g,
    /(?:^|[\s;{}()=])import\s*['"]([^'"]+)['"]/g,
    /(?:^|[^.\w])require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:^|[^.\w])import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  const collect = (dir, acc = new Set()) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);

      if (statSync(path).isDirectory()) {
        collect(path, acc);
        continue;
      }

      if (!/\.(js|mjs|cjs)$/.test(entry)) continue;

      const source = readFileSync(path, 'utf8');

      for (const pattern of patterns) {
        pattern.lastIndex = 0;

        let match;

        while ((match = pattern.exec(source)) !== null) acc.add(match[1]);
      }
    }

    return acc;
  };

  const packageNameOf = (specifier) =>
    specifier.startsWith('@')
      ? specifier.split('/').slice(0, 2).join('/')
      : specifier.split('/')[0];

  const undeclared = [
    ...new Set(
      [...collect(extracted)]
        .filter((specifier) => !specifier.startsWith('.') && !specifier.startsWith('/'))
        .filter((specifier) => !specifier.startsWith('node:'))
        .map(packageNameOf)
        .filter((name) => !builtinModules.includes(name))
        .filter((name) => name !== pkg.name)
        .filter((name) => !declared.has(name)),
    ),
  ].sort();

  if (undeclared.length > 0) {
    console.log(
      `undeclared imports in the published files: ${undeclared.join(', ')}`,
    );
    console.log(
      'Add each to dependencies or peerDependencies, or stop marking it ' +
        'external in rollup.config.mjs so it is bundled.',
    );
    failures.push('declared dependencies');
  } else {
    console.log('every bare specifier in the shipped files is declared');
  }
} finally {
  rmSync(staging, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\npkg-gate failed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log('\npkg-gate passed');
