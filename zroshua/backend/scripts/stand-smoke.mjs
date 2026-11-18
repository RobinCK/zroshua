#!/usr/bin/env node
/**
 * Runs the add-on through the stand and checks it in a real browser.
 *
 * Starts the backend in simulator mode (a fake Home Assistant with the virtual garden, a fresh
 * database, its own ports), then drives the add-on panel and the Lovelace card on a phone and
 * on a desktop, in the dark and the light theme:
 *
 *   - every page and every card view renders, with no console error and no page error;
 *   - nothing on a phone is wider than the screen (no sideways scrolling);
 *   - the things people do most actually work end to end: open a zone and water it, stop it,
 *     quick-run a zone, filter zones, tap a chart bar, open a zone from the card and run it.
 *
 * Screenshots go to $ZROSHUA_SMOKE_OUT (default: <tmp>/zroshua-smoke). Exit code 1 on any
 * failure. Build first: `npm run build` here and in ../frontend.
 *
 *   node scripts/stand-smoke.mjs
 *
 * Playwright is not a dependency of the project: the script uses a globally installed one and
 * exits 0 with a notice when there is none.
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const outDir = resolve(process.env.ZROSHUA_SMOKE_OUT || join(os.tmpdir(), 'zroshua-smoke'));
const PORT = Number(process.env.ZROSHUA_SMOKE_PORT || 8199);
const HA_PORT = Number(process.env.ZROSHUA_SMOKE_HA_PORT || 8224);
const BASE = `http://localhost:${PORT}`;

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    /* not resolvable from here; try the global prefix */
  }
  try {
    const root = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return createRequire(join(root, 'noop.js'))('playwright');
  } catch {
    return null;
  }
}

const failures = [];
let checks = 0;
function check(ok, what) {
  checks++;
  if (!ok) {
    failures.push(what);
    console.log(`  ✗ ${what}`);
  }
}

async function waitFor(fn, ms, what) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if (await fn()) return true;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  check(false, `timed out waiting for ${what}`);
  return false;
}

const api = async (path, init) => {
  const res = await fetch(`${BASE}/api${path}`, { headers: { 'content-type': 'application/json' }, ...init });
  return res.json();
};

function startStand() {
  const data = mkdtempSync(join(os.tmpdir(), 'zroshua-stand-'));
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: backend,
    env: {
      ...process.env,
      ZROSHUA_SIMULATE: '1',
      ZROSHUA_SIM_SCENARIO: process.env.ZROSHUA_SIM_SCENARIO || 'summer',
      ZROSHUA_DATA_DIR: data,
      ZROSHUA_PORT: String(PORT),
      ZROSHUA_SIM_HA_PORT: String(HA_PORT),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (b) => (log += b));
  child.stderr.on('data', (b) => (log += b));
  return { child, data, log: () => log };
}

/** A fresh page that records console errors and failed requests to our own server. */
async function openPage(browser, { phone, scheme, page }) {
  const { devices } = loadPlaywright();
  const ctx = await browser.newContext(
    phone ? { ...devices['iPhone 13'], deviceScaleFactor: 2, colorScheme: scheme } : { viewport: { width: 1440, height: 1000 }, colorScheme: scheme },
  );
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('response', (r) => r.url().startsWith(BASE) && r.status() >= 500 && errors.push(`${r.status()} ${r.url()}`));
  if (page) await p.addInitScript((k) => localStorage.setItem('zroshua.page', k), page);
  return { ctx, p, errors };
}

const noSideScroll = (p) => p.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth + 1);

async function panel(browser) {
  const pages = ['dashboard', 'timeline', 'groups', 'zones', 'onetime', 'sources', 'sensors', 'map', 'stats', 'journal', 'settings'];
  for (const phone of [true, false]) {
    for (const scheme of ['dark', 'light']) {
      for (const page of pages) {
        const tag = `panel ${page} · ${phone ? 'phone' : 'desktop'} · ${scheme}`;
        const { ctx, p, errors } = await openPage(browser, { phone, scheme, page });
        await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
        await p.waitForTimeout(1200);
        check(errors.length === 0, `${tag}: no console errors (${errors.slice(0, 3).join(' | ')})`);
        if (phone) check(await noSideScroll(p), `${tag}: nothing wider than the screen`);
        if (scheme === 'dark' || page === 'dashboard') await p.screenshot({ path: join(outDir, `panel-${page}-${phone ? 'phone' : 'desktop'}-${scheme}.png`), fullPage: true });
        await ctx.close();
      }
    }
  }
}

async function panelFlows(browser) {
  console.log('• panel flows');
  const { ctx, p, errors } = await openPage(browser, { phone: true, scheme: 'dark', page: 'dashboard' });
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  // like a thumb: bring the control to the middle of the screen (not under the tab bar), then tap
  const tap = async (loc) => {
    await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await loc.click({ timeout: 10000 });
  };

  // the overview says what is happening, in words
  check(await p.getByRole('heading', { level: 2 }).first().isVisible(), 'overview: the status headline is shown');
  check((await p.locator('[aria-label="Irrigation status"] button').count()) >= 3, 'overview: status badges are shown');

  // open a zone from its tile and water it from the sheet
  await tap(p.getByRole('button', { name: /^Bed 2 —/ }));
  const water = p.getByRole('button', { name: /^Water \d+ min$/ });
  check(await water.isVisible().catch(() => false), 'zone sheet: opens from the tile with a Water button');
  await water.click();
  await waitFor(async () => (await api('/state')).active.some((a) => a.zoneId === 'bed_2'), 10000, 'Bed 2 to start watering from the sheet');
  await p.waitForTimeout(1500);
  const tile = p.getByRole('button', { name: /^Bed 2 — .* left$/ });
  check(await tile.isVisible().catch(() => false), 'zone tile: shows the minutes left once watering');
  await tap(tile);
  const stop = p.getByRole('button', { name: 'Stop watering' });
  check(await stop.isVisible().catch(() => false), 'zone sheet: a watering zone offers Stop watering');
  await stop.click();
  await waitFor(async () => !(await api('/state')).active.some((a) => a.zoneId === 'bed_2'), 10000, 'Bed 2 to stop');

  // quick run: pick a zone and a duration, start
  await p.keyboard.press('Escape');
  await p.waitForTimeout(600);
  const quick = p.locator('article[aria-label="Quick run"]');
  await tap(quick.getByRole('button', { name: 'Bed 3', exact: true })).catch(() => undefined);
  await tap(quick.getByRole('button', { name: /^5m/ }));
  await tap(quick.getByRole('button', { name: /^Start .* · 5 min$/ }));
  await waitFor(async () => (await api('/state')).active.some((a) => a.plannedMin === 5), 10000, 'the quick run to start a 5 min zone');
  await api('/stop-all', { method: 'POST' });

  // the next 7 days: a row's menu skips only that run, and the same menu brings it back
  const next7 = p.locator('[aria-label="Next 7 days"]');
  await tap(next7.getByRole('button', { name: 'Pause', exact: true }).first());
  await p.getByRole('menuitem').first().waitFor({ timeout: 5000 }).catch(() => undefined);
  const rowItems = await p.getByRole('menuitem').allTextContents();
  check(rowItems.includes('Skip this run') && rowItems.includes('Pause 6 h'), `next 7 days: a row's menu offers skip and pause (${rowItems.join(', ')})`);
  await p.getByRole('menuitem', { name: 'Skip this run' }).click();
  await waitFor(async () => (await next7.getByRole('button', { name: 'Resume', exact: true }).count()) > 0, 10000, 'the skipped run to show as paused');
  await tap(next7.getByRole('button', { name: 'Resume', exact: true }).first());
  await p.getByRole('menuitem', { name: 'Resume' }).click();
  await waitFor(async () => (await next7.getByRole('button', { name: 'Resume', exact: true }).count()) === 0, 10000, 'the skipped run to be resumed');

  // «Pause all» asks for how long, from hours to two weeks
  await tap(p.getByRole('button', { name: /^Pause all/ }));
  await p.getByRole('menuitem').first().waitFor({ timeout: 5000 }).catch(() => undefined);
  const durations = await p.getByRole('menuitem').allTextContents();
  check(durations.length === 6 && durations[0] === 'Pause 6 h' && durations[5] === 'Pause 14 days', `pause all: offers six durations (${durations.join(', ')})`);
  await p.getByRole('menuitem', { name: 'Pause 12 h' }).click();
  await waitFor(async () => (await api('/state')).snoozeUntil > Date.now() + 11 * 3_600_000, 10000, 'pause all to pause for 12 h');
  await tap(p.getByRole('button', { name: 'Resume watering' }));
  await waitFor(async () => !((await api('/state')).snoozeUntil > Date.now()), 10000, 'watering to resume');

  // the bottom tab bar is how a phone moves between pages
  const tab = (name) => p.locator('nav[aria-label="Sections"] button:visible', { hasText: name }).first().click();

  // zones page: the filter narrows the board
  await tab('Zones');
  await p.waitForTimeout(1200);
  check(await p.getByRole('heading', { name: 'Zones', level: 3 }).isVisible().catch(() => false), 'tab bar: Zones opens the zones page');
  const before = await p.locator('button[aria-label*=" — "]').count();
  await tap(p.getByRole('group', { name: 'Filter zones' }).getByRole('button', { name: /^Off/ }));
  const after = await p.locator('button[aria-label*=" — "]').count();
  check(before > after && after > 0, `zones: the Off filter narrows the board (${before} → ${after})`);

  // statistics: a tapped bar tells its value
  await tab('Statistics');
  await p.waitForTimeout(1500);
  await tap(p.locator('article[aria-label="Water"] [aria-pressed]').nth(3));
  const readout = await p.locator('article[aria-label="Water"] [aria-live="polite"]').textContent();
  check(/L|m³/.test(readout || '') && !/Tap a bar/.test(readout || ''), `stats: a tapped bar shows its value («${readout}»)`);

  // «More» opens the other sections
  await tab('More');
  await p.getByRole('button', { name: 'Journal' }).click();
  await p.waitForTimeout(1000);
  check((await p.locator('nav[aria-label="Sections"] button[aria-current="page"]:visible').textContent())?.includes('More'), 'tab bar: More reaches the journal');

  check(errors.length === 0, `panel flows: no console errors (${errors.slice(0, 3).join(' | ')})`);
  await ctx.close();
}

async function cards(browser) {
  console.log('• lovelace card');
  for (const layout of ['phone', 'desktop']) {
    for (const theme of ['dark', 'light']) {
      const tag = `card · ${layout} · ${theme}`;
      const { ctx, p, errors } = await openPage(browser, { phone: layout === 'phone', scheme: theme });
      await p.goto(`${BASE}/api/dev/cards?layout=${layout}&theme=${theme}`, { waitUntil: 'networkidle' });
      await p.waitForSelector('body[data-ready="true"]', { timeout: 15000 });
      await p.waitForTimeout(2500);
      const waiting = await p.evaluate(() =>
        [...document.querySelectorAll('zroshua-card')].filter((c) => c.shadowRoot && c.shadowRoot.textContent.includes('Waiting for the Zroshua hub')).length,
      );
      const total = await p.locator('zroshua-card').count();
      check(total >= 12 && waiting === 0, `${tag}: all ${total} views draw from the hub (${waiting} still waiting)`);
      check(errors.length === 0, `${tag}: no console errors (${errors.slice(0, 3).join(' | ')})`);
      if (layout === 'phone') check(await noSideScroll(p), `${tag}: nothing wider than the screen`);
      if (layout === 'phone') {
        // a row that scrolls sideways must be a «…carousel» element, or a card that pages on a
        // swipe around it (deck-card) takes the gesture and the row cannot be scrolled
        const rows = await p.evaluate(() =>
          [...document.querySelectorAll('zroshua-card')].flatMap((c) =>
            [...c.shadowRoot.querySelectorAll('*')]
              .filter((el) => /auto|scroll/.test(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.localName),
          ),
        );
        check(rows.length > 0 && rows.every((n) => n === 'zroshua-carousel'), `${tag}: every sideways row is a carousel (${rows.join(', ')})`);
      }
      await p.screenshot({ path: join(outDir, `card-${layout}-${theme}.png`), fullPage: true });

      if (layout === 'phone' && theme === 'dark') {
        // open a zone from the zones view and water it: the command goes over MQTT to the engine
        const zonesCard = p.locator('zroshua-card').nth(4);
        const tile = zonesCard.locator('button.zone[data-id="bed_4"]');
        await tile.scrollIntoViewIfNeeded();
        await tile.click();
        const water = zonesCard.locator('.sheet button[data-act="run-zone"]');
        check(await water.isVisible().catch(() => false), 'card: a zone tile opens the zone sheet');
        await water.click();
        await waitFor(async () => (await api('/state')).active.some((a) => a.zoneId === 'bed_4'), 15000, 'Bed 4 to start from the card');
        await waitFor(
          async () => (await zonesCard.locator('button.zone[data-id="bed_4"].s-watering').count()) > 0,
          30000,
          'the card to show Bed 4 watering (hub published)',
        );
        const stats = p.locator('zroshua-card').nth(9);
        await stats.locator('[data-bar="2"]').click();
        const ro = await stats.locator('.ro').textContent();
        check(!/Tap a bar/.test(ro || ''), `card chart: a tapped bar shows its value («${ro}»)`);
        await api('/stop-all', { method: 'POST' });
      }
      await ctx.close();
    }
  }
}

async function main() {
  const pw = loadPlaywright();
  if (!pw) {
    console.log('stand-smoke: Playwright is not installed globally — skipped');
    return;
  }
  if (!existsSync(join(backend, 'dist', 'main.js')) || !existsSync(resolve(backend, '..', 'frontend', 'dist', 'index.html'))) {
    console.error('stand-smoke: build the backend and the frontend first (npm run build in both)');
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  const stand = startStand();
  const stop = () => {
    stand.child.kill('SIGTERM');
    rmSync(stand.data, { recursive: true, force: true });
  };
  try {
    console.log(`• starting the stand on ${BASE} (fake Home Assistant on :${HA_PORT})`);
    const up = await waitFor(async () => (await fetch(`${BASE}/api/health`)).ok, 30000, 'the stand to start');
    if (!up) throw new Error(stand.log());
    // the scene: the hub is published and the front lawn is watering
    await waitFor(async () => (await api('/state')).active.length > 0, 30000, 'the scene to start watering');
    const browser = await pw.chromium.launch();
    try {
      // a step that throws is one failure, not the end of the run
      for (const [name, step] of [
        ['panel pages', panel],
        ['panel flows', panelFlows],
        ['lovelace card', cards],
      ]) {
        if (name === 'panel pages') console.log('• panel pages');
        try {
          await step(browser);
        } catch (e) {
          check(false, `${name}: ${String(e.message || e).split('\n').slice(0, 4).join(' ')}`);
        }
      }
    } finally {
      await browser.close();
    }
    const log = stand.log();
    check(!/unhandled rejection|Error: /i.test(log.replace(/did not turn on: .*$/gm, '')), 'stand log: no unhandled errors');
  } finally {
    stop();
  }
  console.log(`\nstand-smoke: ${checks - failures.length}/${checks} checks passed · screenshots in ${outDir}`);
  if (failures.length) {
    console.log(failures.map((f) => `  ✗ ${f}`).join('\n'));
    process.exit(1);
  }
}

await main();
