#!/usr/bin/env node
/**
 * Coverage gate over the merged `coverage/coverage-final.json`.
 *
 * Jest's own `coverageThreshold` cannot do this job: `@swc/jest` is configured
 * with `decoratorMetadata`, which emits `typeof X === "undefined" ? Object : X`
 * for every constructor parameter and decorated property. Each such ternary is
 * an istanbul `cond-expr` branch that only ever takes one side, so a class-heavy
 * package reads about 15 points worse on branches than its tests deserve, and
 * there is no way to tell jest to ignore them.
 *
 * Exclusion rule: a `cond-expr` branch is dropped unless the source text of the
 * whole conditional (`branch.loc`) holds a real ternary `?` (one not followed by
 * `.`, `?` or `:`, so `?.`, `??` and `foo?: T` do not count). For the generated
 * metadata ternary the location resolves to the type annotation, which never
 * has one.
 *
 * Thresholds live in `tools/coverage-thresholds.json`, tightened phase by phase.
 *
 * Usage: node tools/coverage-gate.mjs [coverage-final.json] [--report]
 *   --report  print the numbers and exit 0 (used to take a baseline).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const reportOnly = args.includes('--report');
const coveragePath = resolve(
  root,
  args.find((a) => !a.startsWith('--')) ?? 'coverage/coverage-final.json',
);
const config = JSON.parse(
  readFileSync(resolve(root, 'tools/coverage-thresholds.json'), 'utf8'),
);

const REAL_TERNARY = /\?(?![.?:])/;

const globToRegExp = (glob) =>
  new RegExp(
    `^${glob
      .split(/(\*\*\/|\*\*|\*)/)
      .map((part) =>
        part === '**/'
          ? '(?:.*/)?'
          : part === '**'
            ? '.*'
            : part === '*'
              ? '[^/]*'
              : part.replace(/[.+^${}()|[\]\\]/g, '\\$&'),
      )
      .join('')}$`,
  );

const sourceCache = new Map();
const sourceLines = (file) => {
  if (!sourceCache.has(file)) {
    sourceCache.set(
      file,
      existsSync(file) ? readFileSync(file, 'utf8').split('\n') : [],
    );
  }

  return sourceCache.get(file);
};

const spanText = (lines, { start, end }) => {
  if (!start || !end || start.line == null || end.line == null) return '';

  if (start.line === end.line) {
    return (lines[start.line - 1] ?? '').slice(start.column, end.column);
  }

  return [
    (lines[start.line - 1] ?? '').slice(start.column),
    ...lines.slice(start.line, end.line - 1),
    (lines[end.line - 1] ?? '').slice(0, end.column ?? undefined),
  ].join('\n');
};

/** @returns {{lines: [number, number], branches: [number, number]}} [covered, total] */
const measure = (file, data) => {
  const perLine = new Map();

  for (const [id, loc] of Object.entries(data.statementMap)) {
    const count = data.s[id];
    const prev = perLine.get(loc.start.line);

    if (prev === undefined || prev < count) perLine.set(loc.start.line, count);
  }

  const lines = sourceLines(file);
  let branchTotal = 0;
  let branchCovered = 0;

  for (const [id, branch] of Object.entries(data.branchMap)) {
    if (
      branch.type === 'cond-expr' &&
      !REAL_TERNARY.test(spanText(lines, branch.loc ?? branch.locations[0]))
    ) {
      continue;
    }

    data.b[id].forEach((hits) => {
      branchTotal += 1;
      if (hits > 0) branchCovered += 1;
    });
  }

  return {
    lines: [[...perLine.values()].filter((c) => c > 0).length, perLine.size],
    branches: [branchCovered, branchTotal],
  };
};

const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));
const files = Object.entries(coverage).map(([path, data]) => ({
  rel: relative(root, path),
  ...measure(path, data),
}));

const pct = ([covered, total]) => (total === 0 ? 100 : (covered / total) * 100);
const fmt = (n) => `${n.toFixed(1)}%`;
const sum = (rows, key) =>
  rows.reduce(([c, t], row) => [c + row[key][0], t + row[key][1]], [0, 0]);

let failed = false;

const check = (label, measured, floor, unit) => {
  const value = pct(measured);

  if (floor === undefined) return;

  // Compare at the precision that is displayed, so a printed "92.0%" never
  // fails a floor of 92.
  const ok = Number(value.toFixed(1)) >= floor;

  if (!ok) failed = true;
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${unit.padEnd(8)} ${fmt(value).padStart(7)} (${measured[0]}/${measured[1]})  floor ${floor}`,
  );
  void label;
};

console.log(
  `coverage gate (${config.phase}) on ${relative(root, coveragePath)}`,
);

for (const group of config.groups) {
  const matchers = group.include.map(globToRegExp);
  const excluded = (group.exclude ?? []).map(globToRegExp);
  const rows = files.filter(
    ({ rel }) =>
      matchers.some((m) => m.test(rel)) && !excluded.some((m) => m.test(rel)),
  );

  console.log(`\n${group.name}  [${rows.length} files]`);

  if (rows.length === 0) {
    console.log('  FAIL matched no files (stale glob?)');
    failed = true;
    continue;
  }

  if (group.perFile) {
    rows.forEach((row) => {
      const lineOk = Number(pct(row.lines).toFixed(1)) >= (group.lines ?? 0);
      const branchOk =
        Number(pct(row.branches).toFixed(1)) >= (group.branches ?? 0);

      if (!lineOk || !branchOk) {
        failed = true;
        console.log(
          `  FAIL ${row.rel}  lines ${fmt(pct(row.lines))}  branches ${fmt(pct(row.branches))}`,
        );
      }
    });
    console.log(
      `  per-file floor: lines ${group.lines}, branches ${group.branches}`,
    );
    continue;
  }

  check(group.name, sum(rows, 'lines'), group.lines, 'lines');
  check(group.name, sum(rows, 'branches'), group.branches, 'branches');
}

if (reportOnly) {
  console.log('\n(report only)');
  process.exit(0);
}

console.log(failed ? '\ncoverage gate FAILED' : '\ncoverage gate passed');
process.exit(failed ? 1 : 0);
