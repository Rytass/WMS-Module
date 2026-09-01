/**
 * Give every relative specifier in the emitted `.d.ts` files an explicit path.
 *
 * This package is `"type": "module"`, so a consumer on TypeScript's `node16` or
 * `nodenext` module resolution follows Node's ESM rules for our declarations —
 * and those rules have no directory-index lookup and no extension guessing.
 * TypeScript emits declarations with the specifier written in the source
 * (`export … from './apollo'`), which is fine for `bundler` resolution and
 * unresolvable for `node16`. The result was that every single export of this
 * package failed to resolve for such a consumer, while Next.js users — who use
 * `bundler` — never saw a thing.
 *
 * Rollup already rewrites the runtime `.js` imports; only the declarations are
 * left carrying source specifiers, which is why this runs after the build
 * rather than being a compiler setting.
 *
 * `./x` becomes `./x.js` when `x.d.ts` exists, or `./x/index.js` when the
 * directory has one. Anything that resolves to neither is reported and left
 * alone rather than guessed at.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? '.');

/** Every emitted declaration file, i.e. everything outside `src/`. */
function declarationFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'src' || entry.name === 'node_modules') continue;
    if (entry.name === 'scripts' || entry.name === 'docs') continue;

    const path = join(dir, entry.name);

    if (entry.isDirectory()) declarationFiles(path, acc);
    else if (entry.name.endsWith('.d.ts')) acc.push(path);
  }

  return acc;
}

/** `./apollo` → `./apollo.js` or `./apollo/index.js`, relative to `fromDir`. */
function resolveSpecifier(specifier, fromDir) {
  if (/\.(js|json|css|scss)$/.test(specifier)) return null;

  const target = resolve(fromDir, specifier);

  if (existsSync(`${target}.d.ts`)) return `${specifier}.js`;
  if (existsSync(join(target, 'index.d.ts'))) return `${specifier}/index.js`;

  return null;
}

const RELATIVE = /(\bfrom\s*|\bimport\s*|\bimport\(\s*)(['"])(\.\.?\/[^'"]*)\2/g;

let rewritten = 0;
let skipped = 0;

for (const file of declarationFiles(ROOT)) {
  const source = readFileSync(file, 'utf8');
  const dir = dirname(file);

  const next = source.replace(RELATIVE, (match, keyword, quote, specifier) => {
    const fixed = resolveSpecifier(specifier, dir);

    if (!fixed) {
      if (!/\.(js|json|css|scss)$/.test(specifier)) {
        skipped += 1;
        console.warn(`[fix-dts] unresolved: ${specifier} in ${file}`);
      }

      return match;
    }

    rewritten += 1;

    return `${keyword}${quote}${fixed}${quote}`;
  });

  if (next !== source) writeFileSync(file, next);
}

console.log(`[fix-dts] rewrote ${rewritten} specifiers` + (skipped ? `, left ${skipped} unresolved` : ''));

if (skipped) process.exitCode = 1;
