#!/usr/bin/env node
/**
 * Copies the design tokens (src/ui/tokens/base.ts) into the token block of the Lovelace card,
 * so the card and the panel can never drift apart. The block sits in ../card/zroshua-card.js
 * between the markers
 *
 *     /* @tokens:begin *\/ … /* @tokens:end *\/
 *
 * and is regenerated whole: `const TOKENS = { dark, light, states, radii }`.
 *
 *   node scripts/tokens-to-card.mjs           rewrite the block
 *   node scripts/tokens-to-card.mjs --check   exit 1 if the block is out of date
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, 'src', 'ui', 'tokens', 'base.ts');
const CARD = resolve(ROOT, '..', 'card', 'zroshua-card.js');
const BEGIN = '/* @tokens:begin */';
const END = '/* @tokens:end */';

async function loadTokens() {
  const out = ts.transpileModule(readFileSync(BASE, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dir = mkdtempSync(join(tmpdir(), 'tokens-'));
  const file = join(dir, 'base.mjs');
  writeFileSync(file, out);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

function literal(v, indent = '') {
  const pad = `${indent}  `;
  if (Array.isArray(v)) return `[${v.map((x) => literal(x, pad)).join(', ')}]`;
  if (v && typeof v === 'object') {
    const entries = Object.entries(v);
    const flat = entries.every(([, x]) => typeof x !== 'object' || x === null);
    const key = (k) => (IDENT.test(k) ? k : `'${k}'`);
    if (flat && entries.length <= 5) return `{ ${entries.map(([k, x]) => `${key(k)}: ${literal(x)}`).join(', ')} }`;
    return `{\n${entries.map(([k, x]) => `${pad}${key(k)}: ${literal(x, pad)},`).join('\n')}\n${indent}}`;
  }
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  return String(v);
}

function block(t) {
  const scheme = (s) => ({
    ...s.neutrals,
    actionBg: s.action.bg,
    actionFg: s.action.fg,
    tones: s.tones,
    series: s.series,
    mark: s.mark,
  });
  const value = { dark: scheme(t.BASE_DARK), light: scheme(t.BASE_LIGHT), states: t.STATE_TONE, radii: t.RADII };
  return `\n// generated from frontend/src/ui/tokens/base.ts by \`npm run tokens:card\` — do not edit by hand\nconst TOKENS = ${literal(value)};\n`;
}

async function main() {
  const check = process.argv.includes('--check');
  const tokens = await loadTokens();
  const card = readFileSync(CARD, 'utf8');
  const b = card.indexOf(BEGIN);
  const e = card.indexOf(END, b + BEGIN.length);
  if (b < 0 || e < 0) {
    console.error(`tokens-to-card: markers ${BEGIN} … ${END} not found in ${CARD}`);
    process.exit(1);
  }
  const next = card.slice(0, b + BEGIN.length) + block(tokens) + card.slice(e);
  if (check) {
    if (next !== card) {
      console.error('tokens-to-card: the card token block is out of date — run `npm run tokens:card`');
      process.exit(1);
    }
    console.log('tokens-to-card: up to date');
    return;
  }
  if (next !== card) writeFileSync(CARD, next);
  console.log(`tokens-to-card: ${next === card ? 'no change' : 'token block rewritten'}`);
}

await main();
