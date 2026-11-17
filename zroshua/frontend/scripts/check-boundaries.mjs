#!/usr/bin/env node
/**
 * Keeps the UI kit a kit. Everything under src/ui/ draws what it is given and never reaches
 * into the app: no API client, no hooks that fetch, no pages, no app components. That is what
 * lets the kit be re-themed, shown in the gallery with fixtures and reused by any page.
 *
 *   src/ui/tokens   pure data and maths: imports nothing but itself
 *   src/ui/theme    tokens + Mantine
 *   src/ui/kit      primitives: tokens, theme-free React, Mantine
 *   src/ui/garden   irrigation composites: kit + tokens + the i18n `t`
 *
 * Exits 1 with a list of offending imports.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const UI = join(SRC, 'ui');

/** layer → folders (relative to src) it may import from, besides itself and packages */
const ALLOWED = {
  tokens: [],
  theme: ['ui/tokens'],
  kit: ['ui/tokens'],
  garden: ['ui/tokens', 'ui/kit', 'i18n'],
  gallery: ['ui/tokens', 'ui/kit', 'ui/garden', 'i18n'],
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

const problems = [];
for (const file of walk(UI)) {
  const layer = relative(UI, file).split(sep)[0];
  const allowed = ALLOWED[layer];
  if (!allowed) continue;
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1] ?? m[2];
    if (!spec.startsWith('.')) continue;
    const target = relative(SRC, resolve(dirname(file), spec)).split(sep).join('/');
    const own = `ui/${layer}`;
    if (target === own || target.startsWith(`${own}/`)) continue;
    if (allowed.some((a) => target === a || target.startsWith(`${a}/`) || target.startsWith(`${a}.`))) continue;
    problems.push(`${relative(SRC, file)}: imports ${spec} (${target}) — not allowed in ui/${layer}`);
  }
}

if (problems.length) {
  console.error('check-boundaries: the UI kit reaches outside its layer:\n' + problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log('check-boundaries: ok');
