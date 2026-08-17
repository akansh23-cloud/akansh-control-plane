#!/usr/bin/env node
/**
 * Dependency-free structural audit for The Lockworks.
 *
 * This catches a class of production defects that TypeScript does not: a
 * `styles.foo` reference whose CSS-module export does not exist, and a local
 * import that points at a file that was renamed or removed. It intentionally
 * requires only Node, so it can run before the dependency graph is healthy.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const failures = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function resolves(base) {
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.css`,
    `${base}.module.css`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ].some((candidate) => existsSync(candidate));
}

const sourceFiles = walk(SRC).filter((file) => ['.ts', '.tsx'].includes(extname(file)));

for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  const importRe = /(?:from\s+|import\s+)["']([^"']+)["']/g;
  for (const match of text.matchAll(importRe)) {
    const spec = match[1];
    let base;
    if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
    else if (spec.startsWith('.')) base = resolve(dirname(file), spec);
    else continue;
    if (!resolves(base)) failures.push(`${file}: unresolved local import ${spec}`);
  }

  if (extname(file) !== '.tsx') continue;
  const cssImportRe = /import\s+(\w+)\s+from\s+["']([^"']+\.module\.css)["']/g;
  for (const match of text.matchAll(cssImportRe)) {
    const [, binding, spec] = match;
    const cssFile = resolve(dirname(file), spec);
    if (!existsSync(cssFile)) continue;
    const css = readFileSync(cssFile, 'utf8');
    const definitions = new Set(
      [...css.matchAll(/\.([A-Za-z_][\w-]*)\b/g)].map((m) => m[1]),
    );
    const useRe = new RegExp(`\\b${binding}\\.([A-Za-z_][\\w]*)\\b`, 'g');
    const uses = new Set([...text.matchAll(useRe)].map((m) => m[1]));
    for (const className of uses) {
      if (!definitions.has(className)) {
        failures.push(`${file}: ${binding}.${className} has no export in ${cssFile}`);
      }
    }
  }
}

if (failures.length) {
  console.error('source audit FAILED');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`source audit passed · ${sourceFiles.length} TS/TSX files · local imports + CSS modules`);
