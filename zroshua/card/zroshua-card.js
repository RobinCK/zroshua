/**
 * Zroshua Lovelace card.
 *
 * Reads the irrigation snapshot from the hub sensor attributes (published by the add-on over
 * MQTT; the entity is found by the shape of its attributes) and sends commands back through
 * the `mqtt.publish` service on topic `zroshua/command`. No build step, no dependencies —
 * a plain custom element.
 *
 * It draws the same cards as the add-on panel, with the same anatomy (panel · status tile ·
 * one action), the same state words and the same colours: the token block below is generated
 * from frontend/src/ui/tokens/base.ts by `npm run tokens:card` in the frontend.
 *
 * Usage:
 *   type: custom:zroshua-card
 *   view: status          # status | badges | quick | groups | zones | upcoming | timeline |
 *                         # sources | sensors | chart | insights | attention   (dashboard = status)
 *   metric: water         # chart: water | energy | time
 *   entity: sensor.x      # chart: a history line of any entity instead of a metric
 *   hours: 6              # chart with entity: how far back
 *   title: Irrigation     # optional, replaces the card's own title
 *   theme: auto           # auto | dark | light
 *   ha_theme: false       # true: surfaces and text follow the Home Assistant theme
 *   hub: sensor.zroshua_state   # optional override of the hub entity
 */
/** Rows that scroll sideways are this element, not a div: container cards that page on a swipe
 *  (deck-card) leave a gesture that starts on a «…carousel» element to it, so the row scrolls. */
const STRIP = 'zroshua-carousel';
const VIEWS = ['status', 'badges', 'quick', 'groups', 'zones', 'upcoming', 'timeline', 'sources', 'sensors', 'chart', 'insights', 'attention'];
const ALIASES = { dashboard: 'status' };

/* @tokens:begin */
// generated from frontend/src/ui/tokens/base.ts by `npm run tokens:card` — do not edit by hand
const TOKENS = {
  dark: {
    bgPage: '#0E1013',
    bgChrome: '#121417',
    surface1: '#171A1E',
    surface2: '#1F2328',
    surface3: '#272C32',
    surface4: '#2E333A',
    surfaceElevated: '#1B1E23',
    shadowElevated: '0 8px 24px rgba(0,0,0,.35)',
    border: '#2A2F36',
    borderStrong: '#343A42',
    divider: '#23272D',
    ring: '#4A515A',
    track: '#262A30',
    dot: '#3A4048',
    controlOff: '#5A616B',
    text1: '#ECEEF1',
    text2: '#B3BAC3',
    text3: '#8C949E',
    textNeutralStrong: '#D5D9DE',
    textDisabled: '#6B737D',
    band: 'rgba(236,238,241,.09)',
    scrim: 'rgba(5,6,8,.62)',
    actionBg: '#ECEEF1',
    actionFg: '#0E1013',
    tones: {
      water: { bg: 'rgba(77,166,255,.15)', fg: '#9CCBFF', line: '#4DA6FF', solid: '#4DA6FF', ink: '#04172A' },
      event: { bg: 'rgba(155,135,245,.14)', fg: '#CFC5FF', line: '#9B87F5', solid: '#9B87F5', ink: '#140F2E' },
      hold: { bg: '#272C32', fg: '#D5D9DE', line: '#8C949E', solid: '#5A616B', ink: '#ECEEF1' },
      ok: { bg: 'rgba(76,195,138,.13)', fg: '#8FE0B5', line: '#4CC38A', solid: '#4CC38A', ink: '#04201A' },
      warn: { bg: 'rgba(242,193,78,.14)', fg: '#F5D57E', line: '#F2C14E', solid: '#F2C14E', ink: '#1E1603' },
      err: { bg: 'rgba(240,113,107,.15)', fg: '#FF9F9A', line: '#F0716B', solid: '#F0716B', ink: '#2B0A08' },
      off: { bg: '#1F2328', fg: '#9AA2AC', line: '#5A616B', solid: '#5A616B', ink: '#ECEEF1' },
    },
    series: { water: '#4DA6FF', energy: '#FACC15', time: '#3BB6B0' },
    mark: { tile: '#4CC38A', ink: '#04201A' },
  },
  light: {
    bgPage: '#F2F3F5',
    bgChrome: '#FFFFFF',
    surface1: '#FFFFFF',
    surface2: '#F4F5F7',
    surface3: '#E9EBEF',
    surface4: '#E3E6EA',
    surfaceElevated: '#FFFFFF',
    shadowElevated: '0 8px 24px rgba(20,23,26,.12)',
    border: '#E1E4E9',
    borderStrong: '#D3D7DD',
    divider: '#E9EBEF',
    ring: '#B9BFC8',
    track: '#E6E8EC',
    dot: '#C9CED6',
    controlOff: '#9AA1AA',
    text1: '#14171A',
    text2: '#454D57',
    text3: '#646C76',
    textNeutralStrong: '#343B44',
    textDisabled: '#9AA1AA',
    band: 'rgba(20,23,26,.07)',
    scrim: 'rgba(5,6,8,.62)',
    actionBg: '#14171A',
    actionFg: '#FFFFFF',
    tones: {
      water: { bg: '#E2EEFC', fg: '#1D64B3', line: '#2F86E0', solid: '#1D6FC4', ink: '#FFFFFF' },
      event: { bg: '#EEEAFE', fg: '#5B47C9', line: '#7C68E6', solid: '#5B47C9', ink: '#FFFFFF' },
      hold: { bg: '#EEF0F3', fg: '#343B44', line: '#646C76', solid: '#646C76', ink: '#FFFFFF' },
      ok: { bg: '#DDF3E7', fg: '#1A7149', line: '#1E8A57', solid: '#1A7149', ink: '#FFFFFF' },
      warn: { bg: '#FFF1CC', fg: '#7D5700', line: '#C48F00', solid: '#F2C14E', ink: '#1E1603' },
      err: { bg: '#FCE6E4', fg: '#A8261C', line: '#D9483D', solid: '#C23A2F', ink: '#FFFFFF' },
      off: { bg: '#F1F2F4', fg: '#5A626C', line: '#9AA1AA', solid: '#646C76', ink: '#FFFFFF' },
    },
    series: { water: '#2F86E0', energy: '#CA9A04', time: '#13857F' },
    mark: { tile: '#1A7149', ink: '#FFFFFF' },
  },
  states: {
    watering: 'water',
    queued: 'event',
    next: 'hold',
    done: 'ok',
    skip: 'warn',
    paused: 'warn',
    fault: 'err',
    off: 'off',
  },
  radii: {
    xs: 3,
    sm: 6,
    chip: 8,
    md: 10,
    lg: 12,
    xl: 14,
    card: 16,
    sheet: 24,
    pill: 999,
  },
};
/* @tokens:end */

const STATES = ['watering', 'queued', 'next', 'done', 'skip', 'paused', 'fault', 'off'];
const MIN = 60000;
const HOUR = 3600000;
const DAY = 86400000;

/* icons: 24px stroke, the Tabler style the panel uses ----------------------------------- */
const svg = (body, fill = false) =>
  `<svg viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${body}</svg>`;
const I = {
  sprinkler: svg('<path d="M12 20v-8"/><path d="M8.5 20h7"/><path d="M12 8.5V4.5"/><path d="M8.2 9.7 6 7.5"/><path d="M15.8 9.7 18 7.5"/><path d="M7.5 12.5h-3"/><path d="M19.5 12.5h-3"/>'),
  seedling: svg('<path d="M12 10a6 6 0 0 0-6-6H3v2a6 6 0 0 0 6 6h3"/><path d="M12 14a6 6 0 0 1 6-6h3v1a6 6 0 0 1-6 6h-3"/><path d="M12 20V10"/>'),
  drop: svg('<path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602-2.105 3.262-5.708 1.566-8.546l-4.89-7.26c-.42-.625-1.287-.803-1.936-.397a1.376 1.376 0 0 0-.41.397l-4.893 7.26C4.24 13.715 4.9 17.318 7.502 19.423z"/>'),
  leaf: svg('<path d="M5 21c.5-4.5 2.5-8 7-10"/><path d="M9 18c6.218 0 10.5-3.288 11-12v-2h-4.014c-9 0-11.986 4-12 9c0 1 0 3 2 5h3z"/>'),
  tree: svg('<path d="M12 13l-2-2"/><path d="M12 12l2-2"/><path d="M12 21v-13"/><path d="M9.824 16a3 3 0 0 1-2.743-3.69a3 3 0 0 1 .304-4.833a3 3 0 0 1 4.615-3.707a3 3 0 0 1 4.614 3.707a3 3 0 0 1 .305 4.833a3 3 0 0 1-2.919 3.695h-4z"/>'),
  plant: svg('<path d="M6 9h12v2a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2l0-2z"/><path d="M8 13l1 7h6l1-7"/><path d="M12 9v-3"/><path d="M12 6c0-1.5 1-3 3-3c0 1.5-1 3-3 3z"/><path d="M12 6c0-1.5-1-3-3-3c0 1.5 1 3 3 3z"/>'),
  rain: svg('<path d="M7 18a4.6 4.4 0 0 1 0-9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7"/><path d="M11 13v2m0 3v2m4-5v2m0 3v2"/>'),
  pump: svg('<path d="M5 10h14"/><path d="M5 10a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2"/><path d="M8 10v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8"/><path d="M12 14v3"/>'),
  tank: svg('<path d="M5 8a7 3 0 1 0 14 0a7 3 0 1 0-14 0"/><path d="M5 8v8c0 1.66 3.13 3 7 3s7-1.34 7-3v-8"/><path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3"/>'),
  bolt: svg('<path d="M13 3l0 7l6 0l-8 11l0-7l-6 0l8-11"/>'),
  clock: svg('<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0"/><path d="M12 7v5l3 3"/>'),
  gauge: svg('<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0"/><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/><path d="M13.41 10.59l2.59-2.59"/><path d="M7 12a5 5 0 0 1 5-5"/>'),
  play: svg('<path d="M6 4v16a1 1 0 0 0 1.524.852l13-8a1 1 0 0 0 0-1.704l-13-8A1 1 0 0 0 6 4z"/>', true),
  stop: svg('<path d="M17 4h-10a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-10a3 3 0 0 0-3-3z"/>', true),
  pause: svg('<path d="M9 4h-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-12a2 2 0 0 0-2-2z"/><path d="M17 4h-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-12a2 2 0 0 0-2-2z"/>', true),
  plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  x: svg('<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>'),
  chev: svg('<path d="M6 9l6 6l6-6"/>'),
  right: svg('<path d="M9 6l6 6l-6 6"/>'),
  warn: svg('<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87l-8.106-13.536a1.914 1.914 0 0 0-3.274 0z"/><path d="M12 16h.01"/>'),
  offline: svg('<path d="M12 18l.01 0"/><path d="M9.172 15.172a4 4 0 0 1 5.656 0"/><path d="M6.343 12.343a7.963 7.963 0 0 1 3.864-2.14m4.163.155a7.965 7.965 0 0 1 3.287 2"/><path d="M3.515 9.515a12 12 0 0 1 3.544-2.455m3.101-.92a12 12 0 0 1 10.325 3.374"/><path d="M3 3l18 18"/>'),
  battery: svg('<path d="M6 7h11a2 2 0 0 1 2 2v.5a.5 .5 0 0 0 .5 .5a.5 .5 0 0 1 .5 .5v3a.5 .5 0 0 1-.5 .5a.5 .5 0 0 0-.5 .5v.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2"/><path d="M7 10v4"/>'),
  idea: svg('<path d="M3 12h1m8-9v1m8 8h1m-15.4-6.4l.7 .7m12.1-.7l-.7 .7"/><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0-1 3a2 2 0 0 1-4 0a3.5 3.5 0 0 0-1-3"/><path d="M9.7 17l4.6 0"/>'),
  ok: svg('<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0"/><path d="M9 12l2 2l4-4"/>'),
  seq: svg('<path d="M5 12l14 0"/><path d="M13 18l6-6"/><path d="M13 6l6 6"/>'),
  par: svg('<path d="M5 10h14"/><path d="M5 14h14"/>'),
  logo: svg('<path d="M10.708 2.372a2.382 2.382 0 0 0-.71.686l-4.892 7.26c-1.981 3.314-1.22 7.466 1.767 9.882c2.969 2.402 7.286 2.402 10.254 0c2.987-2.416 3.748-6.569 1.795-9.836l-4.919-7.306c-.722-1.075-2.192-1.376-3.295-.686z"/>', true),
};
const ZONE_ICON = { lawn: I.sprinkler, sprinkler: I.sprinkler, beds: I.seedling, drip: I.drop, shrubs: I.leaf, tree: I.tree };
const zoneIcon = (type) => ZONE_ICON[type] || I.sprinkler;

/* colour helpers ---------------------------------------------------------------------------- */
function rgba(color, alpha) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (m) {
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  const f = /^rgba?\(([^)]+)\)$/i.exec(color);
  if (f) {
    const [r, g, b, a] = f[1].split(',').map(Number);
    return `rgba(${r},${g},${b},${(Number.isFinite(a) ? a : 1) * alpha})`;
  }
  return color;
}

function resolveScheme(hass, config) {
  if (config.theme === 'dark' || config.theme === 'light') return config.theme;
  const dm = hass && hass.themes ? hass.themes.darkMode : undefined;
  if (dm === true) return 'dark';
  if (dm === false) return 'light';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

/** The palette as custom properties: neutrals, the action colour and one set per state. */
function paletteCss(scheme, followHa) {
  const t = TOKENS[scheme] || TOKENS.dark;
  const ha = (name, fallback) => (followHa ? `var(${name}, ${fallback})` : fallback);
  const v = [
    `--z-s1:${followHa ? `var(--ha-card-background, var(--card-background-color, ${t.surface1}))` : t.surface1}`,
    `--z-s2:${ha('--secondary-background-color', t.surface2)}`,
    `--z-s3:${t.surface3}`,
    `--z-s4:${t.surface4}`,
    `--z-elev:${t.surfaceElevated}`,
    `--z-shadow:${t.shadowElevated}`,
    `--z-bd:${followHa ? `var(--ha-card-border-color, var(--divider-color, ${t.border}))` : t.border}`,
    `--z-bd2:${t.borderStrong}`,
    `--z-div:${ha('--divider-color', t.divider)}`,
    `--z-ring:${t.ring}`,
    `--z-track:${t.track}`,
    `--z-dot:${t.dot}`,
    `--z-coff:${t.controlOff}`,
    `--z-t1:${ha('--primary-text-color', t.text1)}`,
    `--z-t2:${ha('--secondary-text-color', t.text2)}`,
    `--z-t3:${t.text3}`,
    `--z-tns:${t.textNeutralStrong}`,
    `--z-band:${t.band}`,
    `--z-scrim:${t.scrim}`,
    `--z-abg:${t.actionBg}`,
    `--z-afg:${t.actionFg}`,
    `--z-water:${t.series.water}`,
    `--z-energy:${t.series.energy}`,
    `--z-time:${t.series.time}`,
    `--z-mark:${t.mark.tile}`,
    `--z-mark-ink:${t.mark.ink}`,
    `--z-r:${TOKENS.radii.card}px`,
    `--z-r-lg:${TOKENS.radii.lg}px`,
    `--z-r-md:${TOKENS.radii.md}px`,
    `--z-r-chip:${TOKENS.radii.chip}px`,
  ];
  for (const [tone, c] of Object.entries(t.tones)) {
    v.push(`--tone-${tone}-bg:${c.bg}`, `--tone-${tone}-fg:${c.fg}`, `--tone-${tone}-line:${c.line}`, `--tone-${tone}-solid:${c.solid}`, `--tone-${tone}-ink:${c.ink}`);
    v.push(`--tone-${tone}-halo:${rgba(c.line, 0.25)}`, `--tone-${tone}-tint:${rgba(c.line, 0.08)}`, `--tone-${tone}-edge:${rgba(c.line, 0.4)}`);
  }
  // a state is a pointer to a tone, exactly as STATE_TONE says in the panel
  const states = STATES.map((st) => {
    const tone = TOKENS.states[st];
    return `.s-${st}{${['bg', 'fg', 'line', 'solid', 'ink', 'halo', 'tint', 'edge'].map((p) => `--s-${p}:var(--tone-${tone}-${p})`).join(';')}}`;
  });
  return `:host{${v.join(';')}}\n${states.join('\n')}`;
}

const STYLE = `
  :host { display: block; -webkit-tap-highlight-color: transparent; }
  ha-card { overflow: hidden; container-type: inline-size; background: var(--z-s1); border: 1px solid var(--z-bd);
    border-radius: var(--z-r); color: var(--z-t1); box-shadow: none; }
  ha-card.bare { background: transparent; border: 0; }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; }
  .panel { display: flex; flex-direction: column; gap: 14px; padding: 16px; }
  .panel.lg { padding: 20px; gap: 16px; }
  .head { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .head .txt { flex: 1; min-width: 0; }
  .title { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
  .title.lg { font-size: 17px; }
  .sub { margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12.5px; line-height: 1.35; color: var(--z-t3); }
  .sub svg { flex: none; align-self: flex-start; margin-top: 2px; width: 14px; height: 14px; }
  .sub > svg + span { flex: 1 1 0; min-width: 0; }
  .aside { flex: none; margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .muted { color: var(--z-t3); }

  .chip { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;
    border-radius: 12px; background: var(--z-s2); color: var(--z-t2); }
  .chip svg { width: 22px; height: 22px; }
  .chip.c36 { width: 36px; height: 36px; border-radius: 10px; } .chip.c36 svg { width: 20px; height: 20px; }
  .chip.c32 { width: 32px; height: 32px; border-radius: 9px; } .chip.c32 svg { width: 18px; height: 18px; }
  .chip.c44 { width: 44px; height: 44px; border-radius: 12px; } .chip.c44 svg { width: 24px; height: 24px; }
  .chip.tint { background: var(--s-bg); color: var(--s-fg); }

  .tile { min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: var(--z-r-lg);
    background: var(--z-s2); border: 1px solid var(--z-s2); }
  .tile.grow { flex: 1; }
  .tile.tinted { background: var(--s-tint); border-color: var(--s-edge); }
  .tile.edge { border-color: var(--s-edge); }
  .tile.off { background: transparent; border: 1px dashed var(--z-bd2); }

  .sl { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 12.5px; line-height: 1.3; }
  .dot { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--s-line, var(--z-t3)); }
  .dot.pulse { box-shadow: 0 0 0 3px var(--s-halo); animation: zpulse 1.6s ease-in-out infinite; }
  @keyframes zpulse { 0%,100% { box-shadow: 0 0 0 3px var(--s-halo); } 50% { box-shadow: 0 0 0 1px var(--s-halo); } }
  .sl .w { flex: 1; min-width: 0; font-weight: 600; color: var(--s-fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sl.wrap { align-items: flex-start; } .sl.wrap .dot { margin-top: 5px; } .sl.wrap .w { white-space: normal; overflow-wrap: anywhere; font-weight: 500;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .sl .a { flex: none; color: var(--z-t3); white-space: nowrap; }
  .pill { flex: none; display: inline-flex; align-items: center; gap: 7px; height: 26px; padding: 0 11px; border-radius: 999px;
    background: var(--s-bg); color: var(--s-fg); font-size: 12px; font-weight: 600; white-space: nowrap; }
  .pill.sm { height: 22px; padding: 0 9px; font-size: 11.5px; gap: 6px; }
  .count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px;
    border-radius: 999px; background: var(--s-solid); color: var(--s-ink); font-size: 11px; font-weight: 700; }

  .h15 { font-size: 15px; font-weight: 500; line-height: 1.35; font-variant-numeric: tabular-nums; }
  .det { font-size: 12.5px; line-height: 1.4; color: var(--z-t3); }
  .det.warn { color: var(--tone-warn-fg); } .det.err { color: var(--tone-err-fg); }

  .segs { display: flex; gap: 3px; }
  .seg { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .seg i { display: block; height: 6px; border-radius: 3px; background: var(--s-line); }
  .seg.s-next i { background: var(--z-coff); }
  .seg.s-off i { background: repeating-linear-gradient(135deg, var(--z-dot) 0 2px, transparent 2px 5px); }
  .seg span { font-size: 12px; color: var(--z-t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .seg.on span { color: var(--s-fg); font-weight: 500; }

  .metric { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; }
  .metric b { font-size: 30px; font-weight: 500; letter-spacing: -0.6px; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .metric b.big { font-size: 40px; letter-spacing: -1.2px; line-height: 1; }
  .metric .u { font-size: 15px; color: var(--z-t2); }
  .metric .x { margin-left: auto; font-size: 12.5px; color: var(--z-t3); font-variant-numeric: tabular-nums; }
  .meter { display: flex; flex-direction: column; gap: 6px; }
  .track { position: relative; height: 8px; border-radius: 4px; background: var(--z-track); }
  .track.thin { height: 6px; }
  .track .fill { height: 100%; border-radius: 4px; background: var(--s-line, var(--z-t2)); }
  .track .mk { position: absolute; top: -4px; bottom: -4px; width: 3px; margin-left: -1.5px; border-radius: 2px;
    background: var(--z-t1); box-shadow: 0 0 0 2px var(--z-s1); }
  .scale { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--z-t3); }

  .stats { display: grid; grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); gap: 8px; }
  .stats.auto { grid-template-columns: repeat(auto-fit, minmax(var(--min, 140px), 1fr)); }
  .stats.foot { padding-top: 12px; border-top: 1px solid var(--z-div); }
  .cell { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .cell .l { font-size: 11.5px; color: var(--z-t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cell .v { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cell .n { font-size: 11.5px; color: var(--z-t3); }
  .cell.warn .v, .cell.warn .n { color: var(--tone-warn-fg); }
  .cell.big { padding: 12px; border-radius: var(--z-r-lg); background: var(--z-s2); gap: 3px; }
  .cell.big .l { font-size: 12px; } .cell.big .v { font-size: 20px; font-weight: 500; letter-spacing: -0.3px; line-height: 1.2; }
  .cell.big .n { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 0; height: 40px; padding: 0 16px;
    border: 0; border-radius: var(--z-r-md); font-size: 14px; font-weight: 600; line-height: 1; white-space: nowrap; cursor: pointer;
    background: var(--z-s3); color: var(--z-t1); transition: filter .15s, transform .15s; }
  .btn svg { width: 15px; height: 15px; flex: none; }
  .btn:active { transform: scale(.98); }
  @media (hover: hover) { .btn:hover { filter: brightness(1.08); } }
  .btn.primary { background: var(--z-abg); color: var(--z-afg); }
  .btn.danger { background: var(--tone-err-bg); color: var(--tone-err-fg); }
  .btn.ghost { background: transparent; color: var(--z-t2); }
  .btn.sm { height: 32px; padding: 0 12px; font-size: 13px; border-radius: var(--z-r-chip); }
  .btn.lg { height: 48px; font-size: 15px; border-radius: var(--z-r-lg); }
  .btn.xl { height: 52px; font-size: 15px; border-radius: var(--z-r-lg); }
  .btn.icon { width: 40px; padding: 0; flex: none; }
  .btn.block { width: 100%; } .btn.grow { flex: 1; }
  .btn:focus-visible, .zone:focus-visible, .ch:focus-visible { outline: 2px solid var(--z-t1); outline-offset: 2px; }
  .row { display: flex; gap: 8px; } .wrapr { flex-wrap: wrap; }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips.scroll { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .chips.scroll::-webkit-scrollbar { display: none; }
  .chips.cols { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); }
  .ch { flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 32px; padding: 0 12px;
    border-radius: 999px; border: 1px solid var(--z-bd); background: var(--z-s2); color: var(--z-t2); font-size: 13px; font-weight: 600;
    cursor: pointer; white-space: nowrap; }
  .ch.on { background: var(--z-abg); border-color: var(--z-abg); color: var(--z-afg); }
  .ch .c { font-weight: 500; opacity: .75; }
  .ch.sq { border-radius: var(--z-r-md); height: 40px; padding: 0 14px; font-size: 14px; }
  .chips.cols .ch { width: 100%; padding: 0 4px; }
  .ch.stack { flex-direction: column; gap: 0; height: 44px; }
  .ch .h { font-size: 10.5px; font-weight: 500; opacity: .8; }
  .tabs { display: grid; grid-auto-columns: minmax(0, 1fr); grid-auto-flow: column; gap: 4px; padding: 4px;
    border-radius: var(--z-r-lg); background: var(--z-s2); }
  .tab { height: 40px; border: 0; border-radius: var(--z-r-md); background: transparent; color: var(--z-t2); font-size: 14px; font-weight: 600; cursor: pointer; }
  .tab.on { background: var(--z-s4); color: var(--z-t1); }
  .lbl { font-size: 12px; font-weight: 600; color: var(--z-t3); }

  /* zones */
  .zgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); grid-auto-rows: 1fr; gap: 8px; }
  @container (max-width: 520px) { .zgrid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); } }
  .zone { position: relative; overflow: hidden; width: 100%; min-height: 68px; display: flex; align-items: center; gap: 12px;
    padding: 12px 14px 12px 12px; border-radius: var(--z-r-lg); background: var(--z-s2); border: 1px solid var(--z-bd);
    text-align: left; cursor: pointer; }
  .zone.s-watering, .zone.s-fault { background: var(--s-tint); border-color: var(--s-edge); }
  .zone.s-queued, .zone.s-paused { border-color: var(--s-edge); }
  .zone.s-off { background: transparent; border-style: dashed; border-color: var(--z-bd2); }
  .zone .zt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .zone .zn { font-size: 14px; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .zone.s-off .zn { color: var(--z-t2); }
  .zone .pr { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--s-tint); }
  .zone .pr i { display: block; height: 100%; background: var(--s-line); border-radius: 0 3px 3px 0; }
  @container (max-width: 520px) { .zone { gap: 10px; padding: 10px; } }
  .zsec { display: flex; flex-direction: column; gap: 8px; }
  .zhead { display: flex; align-items: center; gap: 8px; min-height: 40px; border: 0; background: transparent; text-align: left; cursor: pointer; padding: 0; }
  .zhead svg { width: 18px; height: 18px; flex: none; color: var(--z-t3); transition: transform .15s; }
  .zhead.closed svg { transform: rotate(-90deg); }
  .zhead b { font-size: 14px; font-weight: 600; white-space: nowrap; }
  .zhead span { flex: 1; min-width: 0; font-size: 12.5px; color: var(--z-t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* groups / sources as a grid of panels inside one card */
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 12px; }
  .cards > .panel { border: 1px solid var(--z-bd); border-radius: var(--z-r); background: var(--z-s1); }
  .cards > .panel.s-watering, .cards > .panel.s-fault { border-color: var(--s-edge); }
  @container (max-width: 520px) {
    .cards { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: 16px; scrollbar-width: none; margin: 0 -16px; padding: 0 16px 4px; }
    .cards::-webkit-scrollbar { display: none; }
    .cards > .panel { flex: none; width: min(290px, 84%); scroll-snap-align: start; }
  }
  .cards > .panel, .gp { min-height: 0; }

  /* status hero */
  .kick { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .mark { flex: none; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
    background: var(--z-mark); color: var(--z-mark-ink); }
  .mark svg { width: 16px; height: 16px; }
  .hl { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.4px; line-height: 1.2; }
  .hsub { margin: 0; font-size: 14px; line-height: 1.45; color: var(--z-t2); }
  .att { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--z-r-lg); width: 100%;
    background: var(--tone-err-tint); border: 1px solid var(--tone-err-edge); text-align: left; cursor: pointer; }
  .att svg { width: 20px; height: 20px; flex: none; color: var(--tone-err-fg); }
  .att b { display: block; font-size: 14px; font-weight: 600; color: var(--tone-err-fg); }
  .att span { display: block; font-size: 12.5px; line-height: 1.4; color: var(--z-t2); }
  @container (max-width: 520px) { .acts .btn { flex: 1 1 auto; } }

  /* upcoming */
  .week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .day { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 2px; border-radius: var(--z-r-md); }
  .day.today { background: var(--z-s2); }
  .day .n { font-size: 11.5px; color: var(--z-t3); white-space: nowrap; }
  .day .t { font-size: 14px; font-weight: 600; }
  .day .r { font-size: 11.5px; font-weight: 500; color: var(--z-t3); }
  .day .r.wet { color: var(--tone-water-fg); }
  .lined > div { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid var(--z-div); }
  .lined > div:first-child { border-top: 0; }
  .ut { flex: none; width: 66px; display: flex; flex-direction: column; gap: 1px; }
  .ut span { font-size: 11.5px; color: var(--z-t3); }
  .ut b { font-family: ui-monospace, Menlo, monospace; font-size: 14px; font-weight: 500; white-space: nowrap; }
  .ux { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .ux b { font-size: 14px; font-weight: 600; line-height: 1.3; }
  .ux span { font-size: 12.5px; line-height: 1.35; color: var(--z-t3); }
  .us { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .us span { font-size: 12px; color: var(--z-t3); white-space: nowrap; }

  /* timeline */
  .tl { position: relative; display: flex; flex-direction: column; gap: 8px; padding-top: 22px; }
  .lane { display: flex; align-items: center; gap: 12px; }
  .ll { flex: none; width: 150px; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  @container (max-width: 520px) { .ll { width: 92px; } }
  .ll b { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ll span { font-size: 11.5px; color: var(--z-t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .trk { position: relative; flex: 1; min-width: 0; height: 30px; border-radius: var(--z-r-chip); background-color: var(--z-s2);
    background-image: linear-gradient(to right, var(--z-bd) 1px, transparent 1px); background-size: 16.6667% 100%; }
  .bar { position: absolute; top: 3px; bottom: 3px; min-width: 4px; display: flex; align-items: center; padding: 0 7px; border-radius: 6px;
    font-size: 11.5px; font-weight: 600; white-space: nowrap; overflow: hidden; background: var(--s-solid); color: var(--s-ink); }
  .bar.s-queued { background: var(--s-bg); border: 1px solid var(--s-line); color: var(--s-fg); }
  .bar.s-next { background: var(--z-ring); color: var(--z-t1); }
  .bar.s-skip, .bar.s-paused { background: repeating-linear-gradient(135deg, var(--s-halo) 0 5px, var(--s-tint) 5px 10px);
    border: 1px solid var(--s-edge); color: var(--s-fg); }
  .nowl { position: absolute; top: 0; bottom: 0; right: 0; pointer-events: none; z-index: 1; }
  .nowl .tag { position: absolute; top: 0; transform: translateX(-50%); padding: 1px 6px; border-radius: 4px; background: var(--z-t1);
    color: var(--z-s1); font-family: ui-monospace, Menlo, monospace; font-size: 11px; font-weight: 500; }
  .nowl .ln { position: absolute; top: 18px; bottom: 0; width: 2px; margin-left: -1px; background: var(--z-t1); border-radius: 1px; }
  .ticks { flex: 1; display: flex; justify-content: space-between; font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; color: var(--z-t3); }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; color: var(--z-t2); }
  .legend span { display: inline-flex; align-items: center; gap: 7px; }
  .legend i { position: static; width: 14px; height: 10px; border-radius: 3px; padding: 0; }
  .empty { margin: 0; padding: 12px 2px; font-size: 14px; color: var(--z-t3); }

  /* charts */
  .plot { position: relative; height: 140px; }
  .plot .g { position: absolute; left: 0; right: 0; top: 0; border-top: 1px solid var(--z-div); }
  .plot .al { position: absolute; left: 0; top: 3px; font-size: 11px; color: var(--z-t3); }
  .plot .avg { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--z-coff); }
  .plot .avl { position: absolute; right: 0; margin-bottom: 3px; padding-left: 4px; font-size: 11px; color: var(--z-t3); background: var(--z-s1); }
  .bars { position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 6px; border-bottom: 1px solid var(--z-bd2); }
  .bars button { flex: 1; min-width: 0; height: 100%; display: flex; align-items: flex-end; justify-content: center; padding: 0; border: 0; background: transparent; cursor: pointer; }
  .bars i { display: block; width: 100%; max-width: 36px; min-height: 2px; border-radius: 4px 4px 0 0; background: var(--c); }
  .xlab { display: flex; gap: 6px; } .xlab span { flex: 1; min-width: 0; text-align: center; font-size: 11.5px; color: var(--z-t3); white-space: nowrap; overflow: hidden; }
  .xlab span.on { color: var(--z-t1); font-weight: 600; }
  .ro { min-height: 18px; font-size: 13px; color: var(--z-t3); font-variant-numeric: tabular-nums; } .ro.on { color: var(--z-t1); }
  .line svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .hits { position: absolute; inset: 0; display: flex; } .hits button { flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; background: transparent; cursor: crosshair; }
  .cross { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--z-coff); pointer-events: none; }
  .mkr { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 2px var(--z-s1); pointer-events: none; }
  .echart { display: flex; flex-direction: column; justify-content: center; gap: 6px; height: 140px; padding: 0 16px; border-radius: var(--z-r-lg); border: 1px dashed var(--z-bd2); }
  .echart b { font-size: 15px; font-weight: 500; } .echart span { font-size: 13px; color: var(--z-t3); }
  .spark { display: block; width: 100%; overflow: visible; }
  .edge { display: flex; justify-content: space-between; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--z-t3); }
  .strip { display: flex; gap: 2px; } .strip i { flex: 1; height: 14px; border-radius: 2px; background: var(--z-track); }
  .strip i.on { background: var(--tone-water-line); opacity: .6; }

  /* findings / usage */
  .list { display: flex; flex-direction: column; gap: 8px; }
  .lr { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: var(--z-r-lg); background: var(--z-s2); border: 1px solid var(--z-s2); }
  .lr.s-fault { background: var(--s-tint); border-color: var(--s-edge); }
  .lr.s-skip { border-color: var(--s-edge); }
  .lr.s-off { background: transparent; border: 1px dashed var(--z-bd2); }
  .lr .lt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .lr b { font-size: 14px; font-weight: 600; line-height: 1.35; }
  .lr span { font-size: 12.5px; line-height: 1.45; color: var(--z-t2); }
  .lr em { font-style: normal; font-size: 12.5px; font-weight: 600; color: var(--s-fg); }
  .use { display: flex; flex-direction: column; gap: 6px; }
  .use .tp { display: flex; align-items: baseline; gap: 8px; font-size: 13.5px; }
  .use .tp b { flex: 1; min-width: 0; font-weight: 600; } .use .tp span { width: 40px; text-align: right; color: var(--z-t3); font-size: 12.5px; }
  .use .tk { height: 8px; border-radius: 4px; background: var(--z-s2); } .use .tk i { display: block; height: 100%; border-radius: 4px; background: var(--z-water); }

  /* badges */
  .badges { display: flex; flex-wrap: wrap; gap: 8px; }
  @container (max-width: 520px) { .badges { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; } .badges::-webkit-scrollbar { display: none; } }
  .badge { flex: none; display: flex; align-items: center; gap: 9px; height: 48px; padding: 0 14px 0 7px; border-radius: 14px;
    background: var(--z-s1); border: 1px solid var(--z-bd); text-align: left; }
  .badge.s-watering, .badge.s-fault { border-color: var(--s-edge); }
  .badge .bd { flex: none; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--s-bg); }
  .badge .bt { display: flex; flex-direction: column; gap: 1px; white-space: nowrap; }
  .badge .bt span { font-size: 11.5px; color: var(--z-t3); } .badge .bt b { font-size: 13.5px; font-weight: 600; }

  /* zone sheet */
  .ovl { position: fixed; inset: 0; background: var(--z-scrim); z-index: 6; }
  .sheet { position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; width: min(460px, 100vw); z-index: 7; padding: 10px 16px calc(20px + env(safe-area-inset-bottom, 0px));
    display: flex; flex-direction: column; gap: 16px; background: var(--z-elev); border: 1px solid var(--z-bd); border-bottom: 0;
    border-radius: 24px 24px 0 0; box-shadow: var(--z-shadow); max-height: 92vh; overflow-y: auto; }
  @media (min-width: 700px) { .sheet { bottom: auto; top: 50%; transform: translate(-50%, -50%); border-radius: var(--z-r); border-bottom: 1px solid var(--z-bd); } }
  .sheet.anim { animation: zup .2s ease-out; }
  @keyframes zup { from { opacity: 0; } to { opacity: 1; } }
  .grab { align-self: center; width: 36px; height: 4px; border-radius: 2px; background: var(--z-ring); }
  .kv { display: flex; flex-direction: column; margin: 0; }
  .kv div { display: flex; align-items: center; gap: 12px; min-height: 42px; border-bottom: 1px solid var(--z-div); }
  .kv div:last-child { border-bottom: 0; }
  .kv dt { flex: none; width: 40%; font-size: 13px; color: var(--z-t3); }
  .kv dd { margin: 0; flex: 1; min-width: 0; font-size: 14px; text-align: right; }
  .wait { padding: 16px; font-size: 14px; color: var(--z-t3); }
  code { background: var(--z-s2); padding: 1px 5px; border-radius: 4px; }
`;

/* small pure helpers ------------------------------------------------------------------------ */
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = (v) => Math.max(0, Math.min(100, v));
const dayStart = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

class ZroshuaCard extends HTMLElement {
  setConfig(config) {
    const view = ALIASES[config.view] || config.view || 'status';
    if (!VIEWS.includes(view)) throw new Error(`view must be one of ${VIEWS.join(', ')}`);
    this._config = { ...config, view };
    this._ui = { filter: 'all', open: {}, sel: null, anim: false, qMode: 'zone', qPick: {}, qDur: null, bar: null, sheetDur: null };
    this._built = false;
    this._history = null;
  }

  set hass(hass) {
    this._hass = hass;
    this._lang = (hass && ((hass.locale && hass.locale.language) || hass.language)) || 'en';
    // hass fires on every entity change in HA: draw only when what this card shows changed,
    // otherwise taps die on a DOM rebuilt mid-touch
    const st = this._hub();
    const extra = this._config.view === 'chart' && this._config.entity ? hass.states[this._config.entity] : null;
    const scheme = resolveScheme(hass, this._config);
    if (this._built && st === this._lastHub && extra === this._lastExtra && scheme === this._scheme) return;
    this._lastHub = st;
    this._lastExtra = extra;
    this._render();
  }

  connectedCallback() {
    // countdowns move even when nothing is published
    this._tick = setInterval(() => this._built && this._render(), 30000);
  }
  disconnectedCallback() {
    clearInterval(this._tick);
  }

  getCardSize() {
    return { status: 6, zones: 8, timeline: 5, badges: 1, chart: 5, groups: 5 }[this._config.view] || 5;
  }
  getGridOptions() {
    const wide = ['status', 'zones', 'timeline', 'groups', 'sources', 'badges', 'sensors'].includes(this._config.view);
    return { columns: wide ? 12 : 6, min_columns: 6 };
  }
  static getConfigElement() {
    return document.createElement('zroshua-card-editor');
  }
  static getStubConfig() {
    return { view: 'status' };
  }

  // ---- data -----------------------------------------------------------------------------

  _hub() {
    if (!this._hass) return null;
    const id = this._config.hub || 'sensor.zroshua_state';
    if (this._hass.states[id]) return this._hass.states[id];
    if (this._foundId && this._hass.states[this._foundId]) return this._hass.states[this._foundId];
    for (const eid of Object.keys(this._hass.states)) {
      if (!eid.startsWith('sensor.') || !/zroshua/.test(eid)) continue;
      const at = this._hass.states[eid].attributes;
      if (at && Array.isArray(at.zones) && Array.isArray(at.groups) && Array.isArray(at.upcoming)) {
        this._foundId = eid;
        return this._hass.states[eid];
      }
    }
    return null;
  }
  _cmd(action, extra = {}, message) {
    if (!this._hass) return;
    this._hass.callService('mqtt', 'publish', { topic: 'zroshua/command', payload: JSON.stringify({ action, ...extra }) });
    if (message) this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true }));
  }

  // ---- words ----------------------------------------------------------------------------

  _hhmm(ts) {
    return new Date(ts).toLocaleTimeString(this._lang, { hour: '2-digit', minute: '2-digit' });
  }
  _wd(ts) {
    return new Date(ts).toLocaleDateString(this._lang, { weekday: 'short' });
  }
  _dayWord(ts, now) {
    const diff = Math.round((dayStart(ts) - dayStart(now)) / DAY);
    return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : this._wd(ts);
  }
  _when(ts, now) {
    const diff = Math.round((dayStart(ts) - dayStart(now)) / DAY);
    return diff === 0 ? this._hhmm(ts) : `${this._dayWord(ts, now)} ${this._hhmm(ts)}`;
  }
  _whenShort(ts, now) {
    return ts - now < 20 * HOUR ? this._hhmm(ts) : `${this._wd(ts)} ${this._hhmm(ts)}`;
  }
  _min(n) {
    const m = Math.round(n);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} h ${String(r).padStart(2, '0')} min` : `${h} h`;
  }
  _in(ts, now) {
    const m = Math.max(0, Math.round((ts - now) / MIN));
    if (m < 1) return 'now';
    if (m < 60) return `in ${m} min`;
    if (m < 1440) return `in ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
    return `in ${Math.round(m / 1440)} days`;
  }
  _ago(ts, now) {
    const m = Math.max(0, Math.round((now - ts) / MIN));
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)} days ago`;
  }
  _num(n, d = 0) {
    return Number(n).toLocaleString(this._lang, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  _l(n) {
    return n >= 10000 ? `${this._num(n / 1000, 1)} m³` : `${this._num(Math.round(n))} L`;
  }
  _dateLong(ts) {
    return new Date(ts).toLocaleDateString(this._lang, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // ---- view models: the same rules as the panel's src/view/garden.ts ------------------------

  _waitShort(reason) {
    const r = String(reason || '').toLowerCase();
    if (r.includes('sequential')) return 'Next in line';
    if (r.includes('flow')) return 'Waits for flow budget';
    if (r.includes('mutex') || r.includes('never overlap')) return 'Waits for another group';
    if (r.includes('soak') || r.includes('delay')) return 'Soaking';
    if (r.includes('pump') || r.includes('source')) return 'Waiting for water';
    return 'Queued';
  }
  _nextFor(a, zoneId, now) {
    for (const u of a.upcoming || []) {
      if (u.ts <= now || !u.zoneIds) continue;
      const i = u.zoneIds.indexOf(zoneId);
      if (i >= 0) return { u, minutes: (u.zoneMinutes || [])[i] };
    }
    return null;
  }
  _zone(a, z, now) {
    const base = { id: z.id, name: z.name, kind: z.type };
    if (z.fault) return { ...base, state: 'fault', label: 'Not responding · tap' };
    const run = (a.active || []).find((r) => r.zoneId === z.id);
    if (run) return { ...base, state: 'watering', label: `${this._min(Math.max(0, (run.endsAt - now) / MIN))} left`, progress: Math.round((run.progress || 0) * 100) };
    const q = (a.queue || []).find((x) => x.zoneId === z.id);
    if (q) return { ...base, state: 'queued', label: `${this._waitShort(q.waitReason)} · ${this._min(q.durationMin)}` };
    if (z.pausedUntil && z.pausedUntil > now) return { ...base, state: 'paused', label: `Paused until ${this._whenShort(z.pausedUntil, now)}` };
    if (!z.enabled) return { ...base, state: 'off', label: 'Off · not scheduled' };
    const next = this._nextFor(a, z.id, now);
    if (next && (next.u.willSkip || next.u.maybeSkip)) return { ...base, state: 'skip', label: `${next.u.willSkip ? 'Will skip' : 'May skip'} · ${this._whenShort(next.u.ts, now)}` };
    if (z.lastTs && z.lastTs >= dayStart(now) && (!next || dayStart(next.u.ts) > dayStart(now))) return { ...base, state: 'done', label: `Done ${this._hhmm(z.lastTs)}` };
    if (next) return { ...base, state: 'next', label: `${this._whenShort(next.u.ts, now)} · ${this._min(next.minutes || z.baseMin)}` };
    return { ...base, state: 'next', label: 'Manual only' };
  }
  _groupZones(a, g) {
    const ids = g.zoneIds || (a.zones || []).filter((z) => (z.groupIds || []).includes(g.id)).map((z) => z.id);
    return ids.map((id) => (a.zones || []).find((z) => z.id === id)).filter(Boolean);
  }
  _modeWord(g) {
    return g.mode === 'sequential' ? 'Sequential' : g.mode === 'parallel_limit' ? `${g.parallelLimit || 2} at a time` : 'Parallel';
  }
  _kind(zones) {
    const c = {};
    for (const z of zones) c[z.type] = (c[z.type] || 0) + 1;
    return Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] || 'sprinkler';
  }
  _group(a, g, now) {
    const zones = this._groupZones(a, g);
    const on = zones.filter((z) => z.enabled);
    const meta = [this._modeWord(g), on.length === zones.length ? `${zones.length} zones` : `${on.length} of ${zones.length} zones`, g.schedules ? `${g.schedules} schedule${g.schedules === 1 ? '' : 's'}` : 'no schedules'].join(' · ');
    const zv = zones.map((z) => this._zone(a, z, now));
    const base = { id: g.id, name: g.name, kind: this._kind(zones), mode: g.mode, meta, segs: zv.map((z) => ({ state: z.state, label: z.name, on: z.state === 'watering' })), paused: false };
    const active = (a.active || []).filter((r) => r.groupId === g.id);
    const queued = (a.queue || []).filter((q) => q.groupId === g.id);
    const paused = g.pausedUntil && g.pausedUntil > now;
    if (active.length || queued.length) {
      const ends = Math.max(now, ...active.map((r) => r.endsAt)) + (g.mode === 'sequential' ? queued.reduce((s, q) => s + q.durationMin * MIN, 0) : 0);
      const first = active[0];
      const idx = first ? on.findIndex((z) => z.id === first.zoneId) + 1 : 0;
      const nq = queued[0];
      return {
        ...base,
        paused,
        state: active.length ? 'watering' : 'queued',
        word: active.length ? 'Watering' : 'Queued',
        when: `until ${this._hhmm(ends)}`,
        headline: first
          ? active.length > 1
            ? `${active.length} zones · ${this._min(Math.max(...active.map((r) => (r.endsAt - now) / MIN)))} left`
            : `${first.zoneName} · ${this._min((first.endsAt - now) / MIN)} left`
          : `Waiting: ${queued[0].waitReason}`,
        detail: g.mode === 'sequential' && first ? (nq ? `Zone ${Math.max(1, idx)} of ${on.length} · then ${nq.zoneName}, ${this._min(nq.durationMin)}` : `Zone ${Math.max(1, idx)} of ${on.length} · the last one`) : queued.length ? `${queued.length} more waiting` : '',
        primary: 'stop',
      };
    }
    if (paused) return { ...base, paused: true, state: 'paused', word: 'Paused', when: `until ${this._when(g.pausedUntil, now)}`, headline: 'Automatic runs are paused', detail: 'Manual runs still work', primary: on.length ? 'run' : 'none' };
    if (!g.enabled || !on.length)
      return { ...base, state: 'off', word: 'Off', headline: on.length ? 'Group is off' : 'Nothing to run', detail: on.length ? 'Turn it on in the add-on' : `All ${zones.length} zones are switched off`, primary: on.length ? 'run' : 'none' };
    const next = (a.upcoming || []).find((u) => u.groupId === g.id && (u.kind || 'group') === 'group' && u.ts > now);
    if (!g.schedules || !next)
      return { ...base, state: g.schedules ? 'next' : 'off', word: g.schedules ? 'Next run' : 'Schedules off', when: g.lastTs ? `last ${this._ago(g.lastTs, now)}` : '', headline: g.schedules ? 'Nothing in the next 7 days' : 'No schedules', detail: 'Manual runs still work', primary: 'run' };
    const dur = next.minutes || 0;
    const span = `${this._dayWord(next.ts, now)} ${this._hhmm(next.ts)} → ${this._hhmm(next.ts + dur * MIN)}`;
    const how = `${(next.zones || []).length} zones ${g.mode === 'sequential' ? 'one by one' : 'at once'} · ${this._min(dur)}`;
    if (next.willSkip || next.maybeSkip)
      return { ...base, state: 'skip', word: next.willSkip ? 'Will skip' : 'May skip', when: this._when(next.ts, now), headline: span, detail: (next.willSkip ? next.skipReason : next.maybeSkip) || how, tone: 'warn', primary: 'run' };
    if (g.lastTs && g.lastTs >= dayStart(now) && dayStart(next.ts) > dayStart(now))
      return { ...base, state: 'done', word: 'Done today', when: this._hhmm(g.lastTs), headline: `Next: ${this._when(next.ts, now)}`, detail: how, primary: 'run' };
    return { ...base, state: 'next', word: 'Next run', when: this._in(next.ts, now), headline: span, detail: how, primary: 'run' };
  }
  _source(a, s, now) {
    const kind = s.level ? 'tank' : s.pump ? 'pump' : 'mains';
    const feeds = s.groups && s.groups.length ? `feeds ${s.groups.join(', ')}` : 'no groups use it';
    const meta = `${s.level ? `Barrel · ${this._num(s.level.capacityL)} L` : s.pump ? 'Pump' : 'Mains'} · ${feeds}`;
    const stats = [];
    if (s.flowLpm != null) stats.push({ l: 'Flow', v: `${this._num(s.flowLpm)} l/min` });
    stats.push({ l: 'Water today', v: this._l(s.litersToday) }, { l: 'Energy today', v: `${this._num(s.kwhToday, 1)} kWh` });
    if (s.level && s.level.refillLpm) stats.splice(0, stats.length === 3 ? 1 : 0, { l: 'Refill', v: `+${this._num(s.level.refillLpm)} l/min` });
    const offline = s.pump && s.pump.state === 'unavailable';
    let state = 'next';
    let word = 'Idle';
    let when = '';
    if (offline) {
      state = 'fault';
      word = 'Pump offline';
      when = s.pump.since ? `since ${this._when(s.pump.since, now)}` : '';
    } else if (s.pump && s.pump.state === 'on') {
      state = 'watering';
      word = 'Running';
      when = s.pump.since ? `since ${this._hhmm(s.pump.since)}` : '';
    } else if (s.level && s.level.pct != null && s.level.blockBelowPct != null && s.level.pct < s.level.blockBelowPct) {
      state = 'fault';
      word = 'Too low to water';
    } else if (s.level && s.level.pct != null && s.level.lowReservePct != null && s.level.pct < s.level.lowReservePct) {
      state = 'skip';
      word = 'Low reserve';
    } else if (s.level) {
      state = 'done';
      word = 'Enough water';
    }
    const v = { id: s.id, name: s.name, kind, meta, state, word, when, stats };
    if (s.level && s.level.pct != null) {
      v.metric = { value: this._num(s.level.liters || 0), unit: 'L', aside: `${s.level.pct}% of ${this._num(s.level.capacityL)} L` };
      v.meter = { pct: s.level.pct, mark: s.level.lowReservePct, scale: ['0', s.level.lowReservePct != null ? `reserve ${s.level.lowReservePct}%` : '', `${this._num(s.level.capacityL)} L`] };
    } else if (s.pressure && s.pressure.bar != null && !offline) {
      const target = s.pressure.target;
      const max = Math.max(4, Math.ceil((target || 3) * 1.33));
      v.metric = { value: this._num(s.pressure.bar, 1), unit: 'bar', aside: target != null ? `target ${this._num(target, 1)} bar` : '' };
      v.meter = { pct: (s.pressure.bar / max) * 100, mark: target != null ? (target / max) * 100 : null, scale: ['0', '', `${max} bar`] };
    } else if (s.flowLpm != null && s.maxFlowLpm && !offline) {
      v.metric = { value: this._num(s.flowLpm), unit: 'l/min', aside: `budget ${this._num(s.maxFlowLpm)} l/min` };
      v.meter = { pct: (s.flowLpm / s.maxFlowLpm) * 100, scale: ['0', '', `${this._num(s.maxFlowLpm)} l/min`] };
    }
    if (offline) {
      const mins = s.pump.since ? (now - s.pump.since) / MIN : null;
      v.problem = { headline: mins != null ? `No answer for ${this._min(mins)}` : 'The pump does not answer', detail: s.groups && s.groups.length ? `${s.groups.join(', ')} wait until it is back` : 'Check the pump in Home Assistant' };
    }
    return v;
  }
  _readings(s) {
    const r = s.readings || {};
    const out = [];
    if (r.temperature != null) out.push({ l: 'Soil temp', v: `${this._num(r.temperature, 1)} °C` });
    if (r.illuminance != null) out.push({ l: 'Light', v: r.illuminance >= 1000 ? `${this._num(r.illuminance / 1000, 1)}k lx` : `${this._num(r.illuminance)} lx` });
    if (r.conductivity != null) out.push({ l: 'Fertility', v: `${this._num(r.conductivity)} µS/cm`, n: r.conductivity < 350 ? 'low' : 'good', warn: r.conductivity < 350 });
    if (r.battery != null) out.push({ l: 'Battery', v: `${this._num(r.battery)}%`, n: r.battery < 20 ? 'replace soon' : '', warn: r.battery < 20 });
    return out;
  }
  _sensor(a, s, now) {
    const readings = this._readings(s);
    if (s.kind === 'rain') {
      const tomorrow = a.weather && a.weather.days && a.weather.days[1] ? a.weather.days[1].p : null;
      const strip = (s.history || []).map((v) => v === 1);
      return s.wet
        ? { id: s.id, name: s.name, kind: 'rain', meta: 'Rain sensor · all zones', state: 'skip', word: 'Wet', when: s.updatedTs ? `since ${this._when(s.updatedTs, now)}` : '', headline: 'Rain detected — schedules wait', detail: 'Watering resumes after the dry-out window', tone: 'warn', strip, readings }
        : { id: s.id, name: s.name, kind: 'rain', meta: 'Rain sensor · all zones', state: 'done', word: 'Dry', when: s.updatedTs ? `wet until ${this._when(s.updatedTs, now)}` : '', headline: tomorrow != null ? `No rain now · ${tomorrow}% tomorrow` : 'No rain now', strip, readings };
    }
    const meta = `${s.kind === 'plant' ? 'Plant sensor' : 'Soil sensor'}${s.target ? ` · ${s.target}` : ''}`;
    const stale = s.available && s.staleAfterHours && s.updatedTs && now - s.updatedTs > s.staleAfterHours * HOUR;
    if (!s.available || stale || s.moisture == null) {
      const h = s.updatedTs ? Math.max(1, Math.round((now - s.updatedTs) / HOUR)) : null;
      return { id: s.id, name: s.name, kind: s.kind, meta, state: 'off', word: 'No data', when: s.updatedTs ? `last ${this._when(s.updatedTs, now)}` : '', headline: h ? `No readings for ${h} h` : 'No readings yet', detail: s.target ? `Triggers ignore stale data — ${s.target} waters by schedule` : 'Triggers ignore stale data', readings };
    }
    const m = s.moisture;
    let state = 'done';
    let word = 'Moist enough';
    let detail = s.startBelowPct != null && s.target ? `Below ${s.startBelowPct}% it waters ${s.target}` : '';
    let tone = '';
    if (s.startBelowPct != null && m < s.startBelowPct) {
      state = 'skip';
      word = 'Dry · wants water';
      tone = 'warn';
      detail = s.lastTriggerTs ? `Trigger fired at ${this._when(s.lastTriggerTs, now)}` : detail;
    } else if (s.blockAbovePct != null && m > s.blockAbovePct) {
      state = 'skip';
      word = 'Too wet';
      tone = 'warn';
      detail = s.target ? `Blocks scheduled runs of ${s.target}` : 'Blocks scheduled runs';
    }
    return { id: s.id, name: s.name, kind: s.kind, meta, state, word, when: s.updatedTs ? this._ago(s.updatedTs, now) : '', moisture: { value: Math.round(m), trigger: s.startBelowPct, wet: s.blockAbovePct }, detail, tone, spark: s.history, readings };
  }
  _finding(f, now) {
    const p = f.params || {};
    switch (f.code) {
      case 'pump_offline':
        return { state: 'fault', icon: I.offline, title: `${p.source}: the pump is offline`, sub: p.groups ? `${p.groups} wait until it is back` : '', action: p.since ? `since ${this._when(p.since, now)}` : '' };
      case 'zone_fault':
        return { state: 'fault', icon: I.warn, title: `${p.zone}: the valve does not respond`, action: 'Open the zone to clear it' };
      case 'ha_disconnected':
        return { state: 'fault', icon: I.offline, title: 'Home Assistant is not connected', sub: 'Nothing can be switched until it is back' };
      case 'source_low':
        return { state: 'skip', icon: I.warn, title: `${p.source} is low · ${p.pct}%` };
      case 'battery_low':
        return { state: 'skip', icon: I.battery, title: `${p.sensor} · battery ${p.pct}%`, action: 'Replace soon' };
      case 'sensor_offline':
        return { state: 'off', icon: I.offline, title: `${p.sensor} · no data`, sub: 'Triggers ignore it until it reports again' };
      case 'sensor_stale':
        return { state: 'off', icon: I.offline, title: `${p.sensor} · no data for ${p.hours} h`, sub: 'Triggers ignore it until it reports again' };
      case 'weather_saved':
        return { state: 'done', icon: I.rain, title: `Weather and soil saved ≈ ${this._l(p.liters)}`, sub: `${p.runs} runs skipped for rain, wet soil or a run condition` };
      case 'flow_deviation':
        return { state: 'skip', icon: I.warn, title: 'Water flow differs from what the zones should use', sub: p.detail, action: f.ts ? this._dateLong(f.ts) : '' };
      case 'idle_flow':
        return { state: 'skip', icon: I.warn, title: 'Water flowed with every zone closed', sub: p.detail, action: f.ts ? this._dateLong(f.ts) : '' };
      case 'soil_triggers':
        return { state: 'next', icon: I.idea, title: `Soil sensors started ${p.count} runs`, sub: 'Watering when the soil asks, not only by the clock' };
      case 'top_consumer':
        return { state: 'next', icon: I.idea, title: `${p.group} takes ${p.pct}% of the water`, sub: 'The first place to look when the bill is high' };
      default:
        return { state: 'next', icon: I.idea, title: f.code };
    }
  }

  // ---- building blocks: the kit's anatomy as HTML -------------------------------------------

  _head(icon, title, sub, aside, lg) {
    return `<header class="head">${icon || ''}<div class="txt"><h3 class="title${lg ? ' lg' : ''}">${esc(this._config.title && !this._titled ? ((this._titled = true), this._config.title) : title)}</h3>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${aside ? `<div class="aside">${aside}</div>` : ''}</header>`;
  }
  _chip(state, icon, size = 40, calm) {
    const loud = state && !calm && !['next', 'off'].includes(state);
    return `<span class="chip${size !== 40 ? ` c${size}` : ''}${loud ? ' tint' : ''}${state ? ` s-${state}` : ''}">${icon}</span>`;
  }
  _sl(state, word, aside, wrap) {
    return `<div class="sl s-${state}${wrap ? ' wrap' : ''}"><span class="dot${state === 'watering' ? ' pulse' : ''}"></span><span class="w">${esc(word)}</span>${aside ? `<span class="a">${esc(aside)}</span>` : ''}</div>`;
  }
  _pill(state, text, sm) {
    return `<span class="pill${sm ? ' sm' : ''} s-${state}"><span class="dot"></span>${esc(text)}</span>`;
  }
  _tile(state, inner, opts = {}) {
    const tinted = state === 'watering' || state === 'fault';
    const cls = ['tile', opts.grow ? 'grow' : '', state ? `s-${state}` : '', state === 'off' ? 'off' : tinted ? 'tinted' : state === 'queued' || state === 'paused' ? 'edge' : ''];
    return `<div class="${cls.filter(Boolean).join(' ')}">${inner}</div>`;
  }
  _segs(list, labels) {
    return `<div class="segs" aria-hidden="true">${list.map((x) => `<div class="seg s-${x.state}${x.on ? ' on' : ''}"><i></i>${labels ? `<span>${esc(x.label)}</span>` : ''}</div>`).join('')}</div>`;
  }
  _metric(value, unit, aside, big) {
    return `<div class="metric"><b class="${big ? 'big' : ''}">${esc(value)}</b>${unit ? `<span class="u">${esc(unit)}</span>` : ''}${aside ? `<span class="x">${esc(aside)}</span>` : ''}</div>`;
  }
  _meter(pct, mark, state, scale, opts = {}) {
    const bands = opts.bands
      ? `background:linear-gradient(to right,${opts.bands.map((b) => `var(--tone-${TOKENS.states[b.state]}-halo) ${clamp(b.from)}%,var(--tone-${TOKENS.states[b.state]}-halo) ${clamp(b.to)}%`).join(',')});`
      : '';
    return `<div class="meter"><div class="track${opts.thin ? ' thin' : ''}${state ? ` s-${state}` : ''}" style="${bands}">${pct != null ? `<div class="fill" style="width:${clamp(pct)}%"></div>` : ''}${mark != null ? `<span class="mk" style="left:${clamp(mark)}%"></span>` : ''}</div>${scale ? `<div class="scale">${scale.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>`;
  }
  _stats(items, cols, foot) {
    return `<div class="stats${cols ? '' : ' auto'}${foot ? ' foot' : ''}" style="--cols:${cols || 3};--min:84px">${items.map((x) => `<div class="cell${x.warn ? ' warn' : ''}"><span class="l">${esc(x.l)}</span><span class="v">${esc(x.v)}</span>${x.n ? `<span class="n">${esc(x.n)}</span>` : ''}</div>`).join('')}</div>`;
  }
  _bigStats(items) {
    return `<div class="stats auto" style="--min:140px">${items.map((x) => `<div class="cell big"><span class="l">${esc(x.l)}</span><span class="v">${esc(x.v)}</span>${x.n ? `<span class="n">${esc(x.n)}</span>` : ''}</div>`).join('')}</div>`;
  }
  _btn(variant, label, icon, data, extra = '') {
    return `<button type="button" class="btn ${variant} ${extra}" ${data}>${icon || ''}${label ? `<span>${esc(label)}</span>` : ''}</button>`;
  }
  _iconBtn(label, icon, data, variant = '') {
    return `<button type="button" class="btn icon ${variant}" aria-label="${esc(label)}" title="${esc(label)}" ${data}>${icon}</button>`;
  }
  _spark(values, min, max, threshold, h = 44) {
    const H = h - 4;
    const y = (v) => (H - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * H + 2).toFixed(2);
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${((i / Math.max(values.length - 1, 1)) * 100).toFixed(2)} ${y(v)} `;
      pen = true;
    });
    const th = threshold != null ? `<line x1="0" x2="100" y1="${y(threshold)}" y2="${y(threshold)}" stroke="var(--tone-warn-line)" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" opacity=".7"/>` : '';
    return `<svg class="spark" height="${h}" viewBox="0 0 100 ${h}" preserveAspectRatio="none" role="img" aria-label="Soil moisture over the last 24 hours">${th}<path d="${d}" fill="none" stroke="var(--z-tns)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  }

  // ---- render ------------------------------------------------------------------------------

  _render() {
    const hub = this._hub();
    const a = hub ? hub.attributes : null;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const scheme = resolveScheme(this._hass, this._config);
    if (!this._built || scheme !== this._scheme) {
      this._scheme = scheme;
      this.shadowRoot.innerHTML = `<style>${paletteCss(scheme, !!this._config.ha_theme)}\n${STYLE}</style><ha-card></ha-card>`;
      this._card = this.shadowRoot.querySelector('ha-card');
      this._card.addEventListener('click', (e) => this._onClick(e));
      this._card.addEventListener('mouseover', (e) => {
        const b = e.target.closest('[data-bar]');
        if (b && Number(b.dataset.bar) !== this._ui.bar) {
          this._ui.bar = Number(b.dataset.bar);
          this._render();
        }
      });
      this._built = true;
    }
    const card = this._card;
    if (!a) {
      const cands = this._hass ? Object.keys(this._hass.states).filter((id) => /^sensor\..*zroshua/.test(id)) : [];
      card.innerHTML = `<div class="wait">Waiting for the Zroshua hub entity. ${
        cands.length
          ? `Found ${cands.map((c) => `<code>${esc(c)}</code>`).join(', ')} but no hub state yet — waiting for data.`
          : 'Is the Zroshua add-on running with MQTT? (The add-on Settings page shows the MQTT status.)'
      }</div>`;
      return;
    }
    const now = Date.now();
    this._titled = false;
    const view = this._config.view;
    card.classList.toggle('bare', view === 'badges');
    // a redraw must not throw a scrolled row back to its start
    const kept = [...card.querySelectorAll(STRIP)].map((el) => el.scrollLeft);
    card.innerHTML = this[`_v_${view}`](a, now) + this._sheet(a, now);
    card.querySelectorAll(STRIP).forEach((el, i) => {
      if (kept[i]) el.scrollLeft = kept[i];
    });
  }

  _onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    e.stopPropagation();
    const d = el.dataset;
    const ui = this._ui;
    const a = this._hub() ? this._hub().attributes : {};
    const zoneName = (id) => ((a.zones || []).find((z) => z.id === id) || {}).name || id;
    const groupName = (id) => ((a.groups || []).find((g) => g.id === id) || {}).name || id;
    switch (d.act) {
      case 'open-zone':
        ui.anim = ui.sel === null;
        ui.sel = d.id;
        ui.sheetDur = null;
        break;
      case 'close-sheet':
        ui.sel = null;
        break;
      case 'run-zone':
        this._cmd('run_zone', { zoneId: d.id, minutes: Number(d.min) || undefined }, `Watering ${zoneName(d.id)} for ${d.min} min`);
        ui.sel = null;
        break;
      case 'stop-zone':
        this._cmd('stop_zone', { zoneId: d.id }, `Stopping ${zoneName(d.id)}`);
        ui.sel = null;
        break;
      case 'extend-zone':
        this._cmd('extend_zone', { zoneId: d.id, minutes: 5 }, `+5 min for ${zoneName(d.id)}`);
        break;
      case 'pause-zone':
        this._cmd('pause_zone', { zoneId: d.id, hours: Number(d.hours) }, Number(d.hours) ? `${zoneName(d.id)} paused` : `${zoneName(d.id)} resumed`);
        ui.sel = null;
        break;
      case 'clear-fault':
        this._cmd('clear_fault', { zoneId: d.id }, 'Fault cleared');
        break;
      case 'sheet-dur':
        ui.sheetDur = Number(d.min);
        break;
      case 'run-group':
        this._cmd('run_group', { groupId: d.id, minutes: Number(d.min) || undefined }, `Started ${groupName(d.id)}`);
        break;
      case 'stop-group':
        this._cmd('stop_group', { groupId: d.id }, `Stopping ${groupName(d.id)}`);
        break;
      case 'pause-group':
        this._cmd('pause_group', { groupId: d.id, hours: Number(d.hours) }, Number(d.hours) ? `${groupName(d.id)} paused for ${d.hours} h` : `${groupName(d.id)} resumed`);
        break;
      case 'stop-all':
        this._cmd('stop_all', {}, 'Stopping all watering');
        break;
      case 'pause-all':
        this._cmd('pause', { hours: Number(d.hours) }, Number(d.hours) ? `All watering paused for ${d.hours} h` : 'Watering resumed');
        break;
      case 'filter':
        ui.filter = d.key;
        break;
      case 'toggle-sec':
        ui.open[d.id] = d.open !== '1';
        break;
      case 'q-mode':
        ui.qMode = d.key;
        ui.qDur = null;
        break;
      case 'q-pick':
        ui.qPick[ui.qMode] = d.id;
        ui.qDur = null;
        break;
      case 'q-dur':
        ui.qDur = Number(d.min);
        break;
      case 'q-start':
        if (d.kind === 'zone') this._cmd('run_zone', { zoneId: d.id, minutes: Number(d.min) }, `Watering ${zoneName(d.id)} for ${d.min} min`);
        else this._cmd('run_group', { groupId: d.id, minutes: Number(d.min) }, `Started ${groupName(d.id)}`);
        break;
      case 'bar':
        ui.bar = Number(d.bar);
        break;
      default:
        return;
    }
    this._render();
  }

  // ---- views --------------------------------------------------------------------------------

  _v_status(a, now) {
    const active = a.active || [];
    const queue = a.queue || [];
    const groups = a.groups || [];
    const anySchedules = groups.some((g) => g.enabled && g.schedules > 0);
    const paused = a.snoozeUntil && a.snoozeUntil > now;
    const mode = paused ? ['paused', `Paused until ${this._when(a.snoozeUntil, now)}`] : !anySchedules ? ['off', 'Season off'] : ['done', 'Auto · schedules on'];
    const next = (a.upcoming || []).find((u) => u.ts > now && !u.willSkip);
    const days = a.days || [];
    const today = days[days.length - 1] || { l: a.litersToday || 0, m: 0 };
    const w = a.weather;
    const rainT = w && w.days && w.days[1] ? w.days[1].p : null;
    const stats = [
      { l: 'Watering', v: active.length ? `${active.length} zone${active.length === 1 ? '' : 's'}` : '—', n: active.map((r) => r.zoneName).join(', ') || 'idle' },
      { l: 'Queued', v: queue.length ? `${queue.length} zone${queue.length === 1 ? '' : 's'}` : '—', n: queue.map((q) => q.zoneName).join(', ') || 'queue is empty' },
      { l: 'Today', v: this._l(today.l), n: `${this._min(today.m)} of watering` },
      { l: 'Next start', v: next ? this._whenShort(next.ts, now) : '—', n: next ? `${this._dayWord(next.ts, now)} · ${next.groupName || 'One-off watering'}` : 'nothing planned' },
    ];
    if (w && w.temp != null) stats.push({ l: 'Weather', v: `${this._num(w.temp)}°`, n: rainT != null ? `Rain ${rainT}% tomorrow` : w.condition || '' });
    let headline;
    let sub;
    let run = '';
    if (active.length) {
      const g = groups.find((x) => x.id === active[0].groupId);
      headline = `Watering ${g ? g.name : active.map((r) => r.zoneName).join(', ')}`;
      if (g) {
        const gv = this._group(a, g, now);
        sub = [gv.headline, gv.detail, gv.when].filter(Boolean).join(' · ');
        run = this._segs(this._groupZones(a, g).filter((z) => z.enabled).map((z) => {
          const v = this._zone(a, z, now);
          return { state: v.state, label: v.name, on: v.state === 'watering' };
        }), true);
      } else sub = `${active[0].zoneName} · ${this._min((active[0].endsAt - now) / MIN)} left`;
    } else if (queue.length) {
      headline = 'Waiting to water';
      sub = queue.map((q) => `${q.zoneName}: ${q.waitReason}`).join(' · ');
    } else if (!anySchedules) {
      headline = 'Watering season is off';
      sub = 'No group has a schedule on. Manual runs still work.';
    } else {
      headline = 'Nothing is watering';
      sub = next ? `Next: ${next.groupName || 'One-off watering'} at ${this._when(next.ts, now)} · ${(next.zones || []).length} zones · ${this._min(next.minutes)}` : 'Nothing scheduled in the next 7 days.';
    }
    const att = (a.attention || []).filter((f) => f.severity === 'err' || f.severity === 'warn');
    const top = att[0] ? this._finding(att[0], now) : null;
    return `<div class="panel lg">
      <div class="kick"><span class="mark">${I.logo}</span><b style="font-size:14px">${esc(this._config.title || 'Zroshua')}</b>
        <span class="muted" style="font-size:13px">${esc(this._dateLong(now))} · ${esc(this._hhmm(now))}</span>
        <span style="margin-left:auto">${this._pill(mode[0], mode[1])}</span></div>
      <div style="display:flex;flex-direction:column;gap:6px"><h2 class="hl">${esc(headline)}</h2><p class="hsub">${esc(sub)}</p></div>
      ${run}
      ${top ? `<div class="att">${I.warn}<div style="flex:1;min-width:0"><b>${esc(top.title)}</b><span>${esc(att.length > 1 ? `${top.sub || ''} · and ${att.length - 1} more` : top.sub || '')}</span></div></div>` : ''}
      ${this._bigStats(stats)}
      <div class="row wrapr acts">
        ${active.length || queue.length ? this._btn('danger', 'Stop all', I.stop, 'data-act="stop-all"') : ''}
        ${paused ? this._btn('primary', 'Resume watering', I.play, 'data-act="pause-all" data-hours="0"') : this._btn('', 'Pause all for 24 h', I.pause, 'data-act="pause-all" data-hours="24"')}
      </div>
    </div>`;
  }

  _v_badges(a, now) {
    const out = [];
    const active = a.active || [];
    if (active.length) out.push(['watering', 'Watering', `${active[0].zoneName} · ${this._min((active[0].endsAt - now) / MIN)}`]);
    const att = (a.attention || []).filter((f) => f.severity === 'err' || f.severity === 'warn');
    if (att.length) out.push([att[0].severity === 'err' ? 'fault' : 'skip', att.length > 1 ? `Needs attention · ${att.length}` : 'Needs attention', this._finding(att[0], now).title]);
    const next = (a.upcoming || []).find((u) => u.ts > now && !u.willSkip);
    if (next) out.push(['next', 'Next', `${next.groupName || 'One-off watering'} · ${this._when(next.ts, now)}`]);
    const rain = (a.sensors || []).find((s) => s.kind === 'rain');
    if (rain) out.push([rain.wet ? 'skip' : 'done', 'Rain sensor', rain.wet ? 'Wet' : 'Dry']);
    for (const s of a.sources || []) {
      if (s.level && s.level.pct != null) out.push([s.level.lowReservePct != null && s.level.pct < s.level.lowReservePct ? 'skip' : 'done', s.name, `${s.level.pct}% · ${this._l(s.level.liters || 0)}`]);
      else if (s.pressure && s.pressure.bar != null && s.pump && s.pump.state === 'on') out.push(['watering', s.name, `${this._num(s.pressure.bar, 1)} bar`]);
    }
    const days = a.days || [];
    const t = days[days.length - 1];
    if (t) out.push(['next', 'Today', `${this._l(t.l)} · ${this._num(t.k, 1)} kWh`]);
    return `<${STRIP} class="badges" role="navigation" aria-label="Irrigation status">${out.map(([st, l, v]) => `<div class="badge s-${st}"><span class="bd"><span class="dot${st === 'watering' ? ' pulse' : ''}"></span></span><span class="bt"><span>${esc(l)}</span><b>${esc(v)}</b></span></div>`).join('')}</${STRIP}>`;
  }

  _v_quick(a, now) {
    const ui = this._ui;
    const src = (id) => (a.sources || []).find((s) => s.id === id);
    const note = (sid) => {
      const s = src(sid);
      if (!s) return null;
      if (s.pump && s.pump.state === 'unavailable') return ['fault', `${s.name}: the pump is offline — no water will flow`];
      if (s.maxFlowLpm && s.flowLpm != null) return ['done', `${s.name} has room: ${this._num(s.flowLpm)} of ${this._num(s.maxFlowLpm)} l/min in use`];
      return null;
    };
    const zones = [...(a.zones || [])].sort((x, y) => (y.lastTs || 0) - (x.lastTs || 0)).map((z) => ({ id: z.id, name: z.name, min: Math.round(z.baseMin), flow: z.flowLpm, note: note(z.sourceId) }));
    const groups = (a.groups || [])
      .map((g) => {
        const zs = this._groupZones(a, g).filter((z) => z.enabled);
        if (!zs.length) return null;
        const flows = zs.map((z) => z.flowLpm).filter((x) => x != null);
        return { id: g.id, name: g.name, min: Math.round(zs.reduce((s, z) => s + z.baseMin, 0) / zs.length), flow: flows.length ? flows.reduce((s, x) => s + x, 0) / (g.mode === 'sequential' ? flows.length : 1) : null, n: zs.length, seq: g.mode === 'sequential', note: note(zs[0].sourceId) };
      })
      .filter(Boolean);
    const list = ui.qMode === 'zone' ? zones : groups;
    const cur = list.find((x) => x.id === ui.qPick[ui.qMode]) || list[0];
    const min = ui.qDur || (cur ? cur.min : 10);
    const opts = cur ? [...new Set([cur.min, 5, 10, 15, 30, 45, 60])].slice(0, 5) : [5, 10, 15, 30, 60];
    const runs = cur && cur.seq ? cur.n : 1;
    const liters = cur && cur.flow != null ? Math.round(cur.flow * min * runs) : null;
    const summary = cur ? [cur.name, `${min} min`, liters != null ? `≈ ${this._num(liters)} L` : '', `ends ${this._hhmm(now + min * runs * MIN)}`].filter(Boolean).join(' · ') : '';
    const n = cur && cur.note;
    return `<div class="panel">
      ${this._head(this._chip(null, I.play), 'Quick run', 'Manual runs ignore rain, soil and pauses')}
      <div class="tabs" role="tablist">${[['zone', 'Zone'], ['group', 'Group']].map(([k, l]) => `<button type="button" role="tab" class="tab${ui.qMode === k ? ' on' : ''}" aria-selected="${ui.qMode === k}" data-act="q-mode" data-key="${k}">${l}</button>`).join('')}</div>
      ${
        !list.length
          ? `<div class="det">No ${ui.qMode === 'zone' ? 'zones' : 'groups'} yet.</div>`
          : `<div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">${ui.qMode === 'zone' ? 'Zones' : 'Groups'}</span>
          <div class="chips">${list.slice(0, 6).map((x) => `<button type="button" class="ch sq${cur && x.id === cur.id ? ' on' : ''}" aria-pressed="${cur && x.id === cur.id}" data-act="q-pick" data-id="${esc(x.id)}">${esc(x.name)}</button>`).join('')}</div></div>
        <div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">${ui.qMode === 'zone' ? 'Duration' : 'Duration per zone'}</span>
          <div class="chips cols" style="--cols:5">${opts.map((m, i) => `<button type="button" class="ch sq stack${m === min ? ' on' : ''}" aria-pressed="${m === min}" data-act="q-dur" data-min="${m}"><span>${m}m</span>${i === 0 ? '<span class="h">default</span>' : ''}</button>`).join('')}</div></div>
        ${this._tile(n && n[0] === 'fault' ? 'fault' : null, `<span class="h15" style="font-size:14px;font-weight:600">${esc(summary)}</span>${n ? `<span class="det${n[0] === 'fault' ? ' err' : ''}">${esc(n[1])}</span>` : ''}`)}
        ${this._btn('primary xl block', cur ? `Start ${cur.name} · ${min} min` : 'Start', I.play, cur ? `data-act="q-start" data-kind="${ui.qMode}" data-id="${esc(cur.id)}" data-min="${min}"` : '')}`
      }
    </div>`;
  }

  _groupPanel(a, g, now) {
    const v = this._group(a, g, now);
    const btn =
      v.primary === 'stop'
        ? this._btn('danger grow', 'Stop group', I.stop, `data-act="stop-group" data-id="${esc(v.id)}"`)
        : v.primary === 'run'
          ? this._btn('grow', 'Run now', I.play, `data-act="run-group" data-id="${esc(v.id)}"`)
          : this._btn('grow', 'Set up in Zroshua', '', 'disabled');
    const pause = v.paused
      ? this._iconBtn(`Resume ${v.name}`, I.play, `data-act="pause-group" data-id="${esc(v.id)}" data-hours="0"`)
      : this._iconBtn(`Pause ${v.name} for 24 h`, I.pause, `data-act="pause-group" data-id="${esc(v.id)}" data-hours="24"`);
    return `<article class="panel s-${v.state}">
      <header class="head">${this._chip(v.state, zoneIcon(v.kind), 40, !['watering', 'fault', 'queued'].includes(v.state))}<div class="txt"><h3 class="title">${esc(v.name)}</h3><div class="sub">${v.mode === 'sequential' ? I.seq : I.par}<span>${esc(v.meta)}</span></div></div></header>
      ${this._tile(v.state, `${this._sl(v.state, v.word, v.when)}<div class="h15">${esc(v.headline)}</div>${v.detail ? `<div class="det ${v.tone || ''}">${esc(v.detail)}</div>` : ''}<div style="margin-top:auto;padding-top:8px">${this._segs(v.segs)}</div>`, { grow: true })}
      <div class="row">${btn}${pause}</div>
    </article>`;
  }

  _v_groups(a, now) {
    const groups = a.groups || [];
    return `<div class="panel">${this._head('', 'Groups', `${groups.length} groups · ${(a.active || []).length ? `${new Set((a.active || []).map((r) => r.groupId).filter(Boolean)).size} watering` : 'nothing watering'}`, '', true)}
      <${STRIP} class="cards">${groups.map((g) => this._groupPanel(a, g, now)).join('') || '<p class="empty">No groups.</p>'}</${STRIP}></div>`;
  }

  _zoneTile(v) {
    return `<button type="button" class="zone s-${v.state}" data-act="open-zone" data-id="${esc(v.id)}" aria-label="${esc(v.name)} — ${esc(v.label)}">
      ${this._chip(v.state, zoneIcon(v.kind), 36)}
      <span class="zt"><span class="zn">${esc(v.name)}</span>${this._sl(v.state, v.label, '', true)}</span>
      ${v.state === 'watering' && v.progress != null ? `<span class="pr"><i style="width:${clamp(v.progress)}%"></i></span>` : ''}
    </button>`;
  }

  _v_zones(a, now) {
    const ui = this._ui;
    const zones = a.zones || [];
    const all = zones.map((z) => this._zone(a, z, now));
    const count = (st) => all.filter((z) => z.state === st).length;
    const filters = [['all', 'All', all.length]];
    for (const [k, l] of [['watering', 'Watering'], ['queued', 'Queued'], ['fault', 'Fault'], ['skip', 'May skip'], ['paused', 'Paused'], ['off', 'Off']]) {
      const n = count(k);
      if (n || k === 'watering' || k === 'off') filters.push([k, l, n]);
    }
    const wordOf = { watering: 'watering', queued: 'queued', fault: 'fault', paused: 'paused', done: 'done today', skip: 'may skip', next: 'scheduled', off: 'off' };
    const order = ['watering', 'queued', 'fault', 'paused', 'done', 'skip', 'next', 'off'];
    const seen = new Set();
    const sections = (a.groups || []).map((g) => {
      const zs = this._groupZones(a, g);
      zs.forEach((z) => seen.add(z.id));
      return { id: g.id, name: g.name, zones: zs };
    });
    const rest = zones.filter((z) => !seen.has(z.id));
    if (rest.length) sections.push({ id: '_ungrouped', name: 'Ungrouped', zones: rest });
    const openN = Number(this._config.open_sections ?? 99);
    const body = sections
      .map((sec, i) => {
        const vs = sec.zones.map((z) => this._zone(a, z, now));
        const shown = ui.filter === 'all' ? vs : vs.filter((v) => v.state === ui.filter);
        if (!shown.length) return '';
        const tally = order.map((st) => [st, vs.filter((v) => v.state === st).length]).filter(([, n]) => n);
        const sum = [`${vs.length} zones`, ...tally.map(([st, n]) => `${n} ${wordOf[st]}`)].join(' · ');
        const open = ui.filter !== 'all' ? true : ui.open[sec.id] ?? i < openN;
        return `<section class="zsec"><button type="button" class="zhead${open ? '' : ' closed'}" aria-expanded="${open}" data-act="toggle-sec" data-id="${esc(sec.id)}" data-open="${open ? 1 : 0}">${I.chev}<b>${esc(sec.name)}</b><span>${esc(sum)}</span></button>
          ${open ? `<div class="zgrid">${shown.map((v) => this._zoneTile(v)).join('')}</div>` : ''}</section>`;
      })
      .join('');
    return `<div class="panel lg">${this._head('', 'Zones', `${zones.length} zones · tap a zone to water or pause it`, '', true)}
      <${STRIP} class="chips scroll" role="group" aria-label="Filter zones">${filters.map(([k, l, n]) => `<button type="button" class="ch${ui.filter === k ? ' on' : ''}" aria-pressed="${ui.filter === k}" data-act="filter" data-key="${k}"><span>${l}</span><span class="c">${n}</span></button>`).join('')}</${STRIP}>
      ${body || '<p class="empty">No zones match this filter.</p>'}</div>`;
  }

  _v_upcoming(a, now) {
    const w = (a.weather && a.weather.days) || [];
    const ups = (a.upcoming || []).filter((u) => u.ts > now);
    const skips = ups.filter((u) => u.willSkip || u.maybeSkip).length;
    const days = w.slice(0, 7).map((d, i) => `<div class="day${i === 0 ? ' today' : ''}"><span class="n">${i === 0 ? 'Today' : esc(this._wd(now + i * DAY))}</span><span class="t">${d.t != null ? `${Math.round(d.t)}°` : '—'}</span><span class="r${(d.p || 0) >= 50 ? ' wet' : ''}">${d.p != null ? `${d.p}%` : ''}</span></div>`).join('');
    const groups = a.groups || [];
    const rows = ups.slice(0, Number(this._config.limit || 6)).map((u) => {
      const once = u.kind === 'once';
      const g = groups.find((x) => x.id === u.groupId);
      const n = (u.zones || []).length;
      const how = u.kind === 'zone' ? 'zone schedule' : `${n} zones ${g && g.mode === 'sequential' ? 'one by one' : 'at once'}`;
      const state = u.paused ? 'paused' : u.willSkip || u.maybeSkip ? 'skip' : 'next';
      const word = u.paused ? 'Paused' : u.willSkip ? 'Will skip' : u.maybeSkip ? 'May skip' : 'Planned';
      let why = state === 'next' ? this._min(u.minutes) : (u.willSkip ? u.skipReason : u.maybeSkip) || this._min(u.minutes);
      if (why.length > 28) why = `${why.slice(0, 27)}…`;
      return `<div><div class="ut"><span>${esc(this._dayWord(u.ts, now))}</span><b>${esc(this._hhmm(u.ts))}</b></div>
        <div class="ux"><b>${esc(once ? u.groupName || 'One-off watering' : u.groupName)}</b><span>${esc(n <= 3 ? (u.zones || []).join(', ') : how)}</span></div>
        <div class="us">${this._pill(state, word, true)}<span>${esc(why)}</span></div></div>`;
    });
    return `<div class="panel lg">${this._head('', 'Next 7 days', ups.length ? `${ups.length} runs${skips ? ` · ${skips} may skip` : ''}` : '', '', true)}
      ${days ? `<div class="week">${days}</div>` : ''}
      ${rows.length ? `<div class="lined">${rows.join('')}</div>` : '<p class="empty">Nothing scheduled in the next 7 days.</p>'}</div>`;
  }

  _v_timeline(a, now) {
    const from = dayStart(now);
    const to = from + DAY;
    const pct = (ts) => clamp(((ts - from) / DAY) * 100);
    const groups = a.groups || [];
    const lanes = new Map();
    const lane = (key, name, sub) => {
      if (!lanes.has(key)) lanes.set(key, { name, sub, bars: [] });
      return lanes.get(key);
    };
    const subOf = (g) => (g ? `${this._modeWord(g)} · ${g.zoneCount} zones` : 'zone schedules');
    for (const g of groups) lane(g.id, g.name, subOf(g));
    for (const r of a.doneToday || []) {
      const g = groups.find((x) => x.id === r.gid);
      lane(r.gid || '_zones', g ? g.name : 'Zones', subOf(g)).bars.push({ s: r.s, e: r.e, state: 'done', label: r.z, title: `${r.z} ${this._hhmm(r.s)}–${this._hhmm(r.e)} · done` });
    }
    const activeIds = new Set();
    for (const r of a.active || []) {
      activeIds.add(r.zoneName);
      const g = groups.find((x) => x.id === r.groupId);
      lane(r.groupId || '_zones', g ? g.name : 'Zones', subOf(g)).bars.push({ s: r.startTs, e: r.endsAt, state: 'watering', label: r.zoneName, title: `${r.zoneName} · watering` });
    }
    const queued = new Set((a.queue || []).map((q) => q.zoneName));
    for (const s of a.timeline || []) {
      if (s.e < from || s.s > to || activeIds.has(s.z)) continue;
      const g = groups.find((x) => x.name === s.g);
      const key = s.k === 'o' ? '_once' : g ? g.id : s.k === 'z' ? '_zones' : s.g;
      const state = queued.has(s.z) ? 'queued' : s.sk ? 'skip' : 'next';
      lane(key, s.k === 'o' ? s.g || 'One-off watering' : s.g || 'Zones', subOf(g)).bars.push({ s: s.s, e: s.e, state, label: s.z, title: `${s.z} ${this._hhmm(s.s)}–${this._hhmm(s.e)}${s.r ? ` · ${s.r}` : ''}` });
    }
    const used = new Set();
    const rows = [...lanes.values()]
      .map((l) => {
        const bars = l.bars
          .map((b) => {
            used.add(b.state);
            const left = pct(b.s);
            const width = Math.max(0.4, pct(b.e) - left);
            return `<span class="bar s-${b.state}" title="${esc(b.title)}" style="left:${left}%;width:${width}%">${width > 3.5 ? esc(b.label || '') : ''}</span>`;
          })
          .join('');
        return `<div class="lane"><div class="ll"><b>${esc(l.name)}</b><span>${esc(l.sub)}</span></div><div class="trk">${bars || '<span class="muted" style="position:absolute;left:10px;top:7px;font-size:12px">no runs today</span>'}</div></div>`;
      })
      .join('');
    const lw = this._card && this._card.clientWidth && this._card.clientWidth < 520 ? 92 : 150;
    const legend = [['done', 'Done'], ['watering', 'Watering'], ['queued', 'Queued'], ['next', 'Planned'], ['skip', 'May skip']]
      .filter(([k]) => used.has(k))
      .map(([k, l]) => `<span><i class="bar s-${k}"></i>${l}</span>`)
      .join('');
    const days = a.days || [];
    const today = days[days.length - 1];
    return `<div class="panel lg">${this._head('', 'Today', today ? `${this._l(today.l)} so far` : '', '', true)}
      ${rows ? `<div class="tl"><div class="nowl" style="left:${lw + 12}px"><span class="tag" style="left:${pct(now)}%">${esc(this._hhmm(now))}</span><span class="ln" style="left:${pct(now)}%"></span></div>${rows}
        <div class="lane"><span style="flex:none;width:${lw}px"></span><div class="ticks">${['00', '04', '08', '12', '16', '20', '24'].map((h) => `<span>${h}</span>`).join('')}</div></div></div>` : '<p class="empty">Nothing scheduled today.</p>'}
      ${legend ? `<div class="legend">${legend}</div>` : ''}</div>`;
  }

  _sourcePanel(a, s, now) {
    const v = this._source(a, s, now);
    const inner = `${this._sl(v.state, v.word, v.when)}${v.metric ? this._metric(v.metric.value, v.metric.unit, v.metric.aside) : ''}${v.meter ? this._meter(v.meter.pct, v.meter.mark, v.problem ? null : v.state, v.meter.scale) : ''}${
      v.problem ? `<div class="h15">${esc(v.problem.headline)}</div><div class="det err">${esc(v.problem.detail)}</div>` : ''
    }`;
    return `<article class="panel s-${v.state}">
      <header class="head">${this._chip(v.state, v.kind === 'tank' ? I.tank : I.pump, 40, !['watering', 'fault', 'skip'].includes(v.state))}<div class="txt"><h3 class="title">${esc(v.name)}</h3><div class="sub">${esc(v.meta)}</div></div></header>
      ${this._tile(v.state, inner, { grow: true })}
      ${this._stats(v.stats, 3)}
    </article>`;
  }

  _v_sources(a, now) {
    const list = a.sources || [];
    return `<div class="panel">${this._head('', 'Water sources', list.length ? `${list.length} sources` : '', '', true)}
      <${STRIP} class="cards">${list.map((s) => this._sourcePanel(a, s, now)).join('') || '<p class="empty">No water sources.</p>'}</${STRIP}></div>`;
  }

  _sensorPanel(a, s, now, compact) {
    const v = this._sensor(a, s, now);
    const m = v.moisture;
    const tileState = v.state === 'off' ? 'off' : v.state === 'skip' || v.state === 'fault' ? v.state : null;
    let inner = this._sl(v.state, v.word, v.when);
    if (m) {
      const inline = compact ? v.readings.filter((r) => !r.warn).map((r) => r.v).slice(0, 3).join(' · ') : 'soil moisture';
      inner += this._metric(String(m.value), '%', inline);
      inner += this._meter(null, m.value, null, compact ? null : [m.trigger != null ? `dry · waters below ${m.trigger}%` : 'dry', m.wet != null ? `wet · blocks above ${m.wet}%` : 'wet'], {
        thin: compact,
        bands: [
          { from: 0, to: m.trigger || 0, state: 'skip' },
          { from: m.trigger || 0, to: m.wet != null ? m.wet : 100, state: 'done' },
          { from: m.wet != null ? m.wet : 100, to: 100, state: 'watering' },
        ],
      });
      if (!compact && v.spark && v.spark.some((x) => x != null)) inner += `${this._spark(v.spark, 10, 70, m.trigger)}<div class="edge"><span>24 h ago</span><span>now</span></div>`;
    } else if (v.headline) inner += `<div class="h15">${esc(v.headline)}</div>`;
    if (!compact && v.strip) inner += `<div class="strip" role="img" aria-label="Wet periods over the last 24 hours">${v.strip.map((on) => `<i class="${on ? 'on' : ''}"></i>`).join('')}</div><div class="edge"><span>24 h ago</span><span>now</span></div>`;
    if (v.detail) inner += `<div class="det ${v.tone || ''}">${esc(v.detail)}</div>`;
    return `<article class="panel">
      <header class="head">${this._chip(v.state, v.kind === 'rain' ? I.rain : v.kind === 'plant' ? I.plant : I.drop, 40, ['done', 'next', 'off'].includes(v.state))}<div class="txt"><h3 class="title">${esc(v.name)}</h3><div class="sub">${esc(v.meta)}</div></div></header>
      ${this._tile(tileState, inner, { grow: true })}
      ${!compact && v.readings.length ? this._stats(v.readings) : ''}
    </article>`;
  }

  _v_sensors(a, now) {
    const rank = (s) => {
      const v = this._sensor(a, s, now);
      return v.state === 'skip' ? 0 : v.state === 'off' ? 1 : s.kind === 'rain' ? 3 : 2;
    };
    const list = [...(a.sensors || [])].sort((x, y) => rank(x) - rank(y));
    const narrow = this._card && this._card.clientWidth && this._card.clientWidth < 520;
    const need = list.filter((s) => rank(s) < 2).length;
    return `<div class="panel">${this._head('', 'Rain and soil', list.length ? `${list.length} sensors${need ? ` · ${need} need a look` : ''}` : '', '', true)}
      <div class="cards" style="${narrow ? 'display:flex;flex-direction:column;overflow:visible;margin:0;padding:0' : ''}">${list.map((s, i) => this._sensorPanel(a, s, now, narrow && i > 0)).join('') || '<p class="empty">No rain or soil sensors are set up.</p>'}</div></div>`;
  }

  _v_chart(a, now) {
    const ui = this._ui;
    if (this._config.entity) return this._entityChart(now);
    const metric = this._config.metric || 'water';
    const all = a.days || [];
    const days = all.slice(-7);
    const prev = all.slice(-14, -7);
    const pick = metric === 'energy' ? (d) => d.k : metric === 'time' ? (d) => d.m : (d) => d.l;
    const fmt = metric === 'energy' ? (v) => `${this._num(v, 1)} kWh` : metric === 'time' ? (v) => this._min(v) : (v) => this._l(v);
    const title = this._config.title || { water: 'Water', energy: 'Pump energy', time: 'Watering time' }[metric];
    const icon = { water: I.drop, energy: I.bolt, time: I.clock }[metric];
    const color = `var(--z-${metric === 'water' ? 'water' : metric})`;
    const vals = days.map(pick);
    const total = vals.reduce((s, x) => s + x, 0);
    const totalTxt = metric === 'time' ? [this._min(total), ''] : metric === 'energy' ? [this._num(total, 1), 'kWh'] : [this._num(Math.round(total)), 'L'];
    const head = this._head(`<span class="chip"><span style="color:${color};display:flex">${icon}</span></span>`, title, `Last 7 days · ${{ water: 'calculated from flow rates', energy: 'measured during runs', time: 'all zones' }[metric]}`);
    if (!total)
      return `<div class="panel">${head}${this._metric(totalTxt[0], totalTxt[1])}<div class="echart"><b>No watering in this period</b><span>The chart fills in with the first run.</span></div></div>`;
    const done = vals.slice(0, -1);
    const avg = done.length ? done.reduce((s, x) => s + x, 0) / done.length : 0;
    const max = Math.max(...vals);
    const p10 = 10 ** Math.floor(Math.log10(max));
    const nice = [1, 2, 2.5, 5, 10].map((k) => k * p10).find((x) => x >= max) || max;
    const label = (d, i) => (i === days.length - 1 ? 'Today' : this._wd(Date.parse(`${d.d}T12:00:00`)));
    const prevTotal = prev.map(pick).reduce((s, x) => s + x, 0);
    const delta = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
    const sel = ui.bar != null && ui.bar < days.length ? ui.bar : null;
    const peakI = vals.indexOf(max);
    const lowI = done.indexOf(Math.min(...done));
    const read = sel != null ? `${this._dateLong(Date.parse(`${days[sel].d}T12:00:00`))}${sel === days.length - 1 ? ' · so far' : ''} · ${fmt(vals[sel])}` : 'Tap a bar to see the day';
    return `<div class="panel" style="--c:${color}">${head}
      <div style="display:flex;flex-direction:column;gap:4px">${this._metric(totalTxt[0], totalTxt[1], delta != null ? `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta)}% vs the period before` : '')}<div class="ro${sel != null ? ' on' : ''}">${esc(read)}</div></div>
      <div style="display:flex;flex-direction:column;gap:6px"><div class="plot"><div class="g"></div><span class="al">${esc(fmt(nice))}</span>
        ${avg ? `<div class="avg" style="bottom:${(avg / nice) * 100}%"></div><span class="avl" style="bottom:${(avg / nice) * 100}%">avg ${esc(fmt(avg))}</span>` : ''}
        <div class="bars">${vals.map((v, i) => `<button type="button" data-act="bar" data-bar="${i}" aria-label="${esc(label(days[i], i))}: ${esc(fmt(v))}"><i style="height:${(v / nice) * 100}%;opacity:${sel == null ? (i === vals.length - 1 ? 0.5 : 1) : sel === i ? 1 : 0.35}"></i></button>`).join('')}</div></div>
        <div class="xlab">${days.map((d, i) => `<span class="${sel === i ? 'on' : ''}">${esc(label(d, i))}</span>`).join('')}</div></div>
      ${this._stats(
        [
          { l: 'Daily average', v: fmt(avg) },
          { l: `Peak · ${label(days[peakI], peakI)}`, v: fmt(max) },
          metric === 'energy' ? { l: 'Per 1 000 L', v: `${this._num((total / Math.max(1, days.reduce((s, d) => s + d.l, 0))) * 1000, 2)} kWh` } : { l: `Lowest · ${label(days[lowI], lowI)}`, v: fmt(done[lowI] || 0) },
        ],
        3,
        true,
      )}</div>`;
  }

  _entityChart(now) {
    const id = this._config.entity;
    const hours = Number(this._config.hours || 24);
    const st = this._hass.states[id];
    const unit = (st && st.attributes.unit_of_measurement) || '';
    const title = this._config.title || (st && st.attributes.friendly_name) || id;
    if (!this._history || this._history.id !== id || now - this._history.at > 5 * MIN) {
      this._history = { id, at: now, points: this._history && this._history.id === id ? this._history.points : null };
      this._hass
        .callWS({ type: 'history/history_during_period', start_time: new Date(now - hours * HOUR).toISOString(), end_time: new Date(now).toISOString(), entity_ids: [id], minimal_response: true, no_attributes: true })
        .then((res) => {
          this._history.points = ((res && res[id]) || []).map((p) => ({ ts: (p.lu || 0) * 1000, v: Number(p.s) })).filter((p) => Number.isFinite(p.v));
          this._render();
        })
        .catch(() => undefined);
    }
    const head = this._head(`<span class="chip">${I.gauge}</span>`, title, `Last ${hours} hours`);
    const pts = (this._history && this._history.points) || [];
    if (!pts.length) return `<div class="panel">${head}<div class="echart"><b>No data yet</b><span>History appears once Home Assistant has recorded it.</span></div></div>`;
    const buckets = Math.min(48, hours * 4);
    const step = (hours * HOUR) / buckets;
    const series = [];
    let idx = 0;
    let last = null;
    for (let i = 0; i <= buckets; i++) {
      const end = now - (buckets - i) * step;
      while (idx < pts.length && pts[idx].ts <= end) last = pts[idx++].v;
      series.push(last);
    }
    const vals = series.filter((v) => v != null);
    const max = Math.max(...vals) * 1.15 || 1;
    const H = 140;
    const y = (v) => H - (v / max) * H;
    let d = '';
    let pen = false;
    series.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${((i / buckets) * 100).toFixed(2)} ${y(v).toFixed(2)} `;
      pen = true;
    });
    const sel = this._ui.bar != null && series[this._ui.bar] != null ? this._ui.bar : null;
    const tOf = (i) => this._hhmm(now - (buckets - i) * step);
    const read = sel != null ? `${tOf(sel)} · ${this._num(series[sel], 1)} ${unit}` : 'Touch the line to read a value';
    return `<div class="panel" style="--c:var(--z-tns)">${head}
      <div style="display:flex;flex-direction:column;gap:4px">${this._metric(this._num(vals[vals.length - 1], 1), unit, 'now')}<div class="ro${sel != null ? ' on' : ''}">${esc(read)}</div></div>
      <div style="display:flex;flex-direction:column;gap:6px"><div class="plot line" style="border-bottom:1px solid var(--z-bd2)">
        <svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--c)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
        ${sel != null ? `<span class="cross" style="left:${(sel / buckets) * 100}%"></span><span class="mkr" style="left:${(sel / buckets) * 100}%;top:${y(series[sel])}px"></span>` : ''}
        <div class="hits">${series.map((v, i) => `<button type="button" data-act="bar" data-bar="${i}" aria-label="${esc(tOf(i))}: ${v == null ? '—' : `${this._num(v, 1)} ${unit}`}"></button>`).join('')}</div></div>
        <div class="ticks">${Array.from({ length: 7 }, (_, i) => `<span>${esc(this._hhmm(now - hours * HOUR + (i * hours * HOUR) / 6).slice(0, 2))}</span>`).join('')}</div></div>
      ${this._stats([{ l: 'Max', v: `${this._num(Math.max(...vals), 1)} ${unit}` }, { l: 'Min', v: `${this._num(Math.min(...vals), 1)} ${unit}` }, { l: 'Average', v: `${this._num(vals.reduce((s, x) => s + x, 0) / vals.length, 1)} ${unit}` }], 3, true)}</div>`;
  }

  _findingRows(list, now) {
    return `<div class="list" role="list">${list
      .map((f) => {
        const v = this._finding(f, now);
        return `<div class="lr s-${v.state}" role="listitem">${this._chip(v.state, v.icon, 32, v.state === 'next')}<div class="lt"><b>${esc(v.title)}</b>${v.sub ? `<span>${esc(v.sub)}</span>` : ''}${v.action ? `<em>${esc(v.action)}</em>` : ''}</div></div>`;
      })
      .join('')}</div>`;
  }

  _v_insights(a, now) {
    const usage = a.usage || [];
    const total = usage.reduce((s, u) => s + u.liters, 0);
    const top = Math.max(1, ...usage.map((u) => u.liters));
    const use = usage
      .map((u) => `<div class="use"><div class="tp"><b>${esc(u.name)}</b><span style="width:auto">${u.liters ? esc(this._l(u.liters)) : '—'}</span><span>${u.liters && total ? `${Math.round((u.liters / total) * 100)}%` : ''}</span></div><div class="tk"><i style="width:${(u.liters / top) * 100}%;min-width:${u.liters ? 4 : 0}px"></i></div></div>`)
      .join('');
    return `<div class="panel">${this._head('', 'Insights', 'Last 7 days', '', true)}
      ${(a.findings || []).length ? this._findingRows(a.findings, now) : '<p class="empty">Nothing unusual this week.</p>'}
      ${use ? `<div style="display:flex;flex-direction:column;gap:12px;padding-top:12px;border-top:1px solid var(--z-div)"><span class="lbl">Water by group · ${esc(this._l(total))}</span>${use}</div>` : ''}</div>`;
  }

  _v_attention(a, now) {
    const list = a.attention || [];
    return `<div class="panel">${this._head('', 'Needs attention', 'What Zroshua cannot fix itself', list.length ? `<span class="count s-fault">${list.length}</span>` : '', true)}
      ${list.length ? this._findingRows(list, now) : '<p class="empty">All good — nothing needs you.</p>'}</div>`;
  }

  /** The zone sheet: a bottom sheet on a phone, a dialog on a wide screen — same as the panel's. */
  _sheet(a, now) {
    const ui = this._ui;
    const z = (a.zones || []).find((x) => x.id === ui.sel);
    if (!z) return '';
    const v = this._zone(a, z, now);
    const run = (a.active || []).find((r) => r.zoneId === z.id);
    const q = (a.queue || []).find((x) => x.zoneId === z.id);
    const g = (a.groups || []).find((x) => (z.groupIds || []).includes(x.id));
    const src = (a.sources || []).find((s) => s.id === z.sourceId);
    const next = this._nextFor(a, z.id, now);
    const paused = z.pausedUntil && z.pausedUntil > now;
    const base = Math.round(z.baseMin) || 10;
    const presets = [...new Set([base, 5, 10, 15, 30])].filter((m) => m <= (z.maxMin || 999)).slice(0, 5);
    const pick = ui.sheetDur || base;
    const facts = [
      ['Group', g ? g.name : 'none'],
      ['Source', src ? `${src.name}${src.pressure && src.pressure.bar != null ? ` · ${src.pressure.bar} bar` : ''}` : 'none'],
      ['Flow', z.flowLpm != null ? `${this._num(z.flowLpm)} l/min` : 'unknown'],
      ['Next run', next ? `${this._when(next.u.ts, now)} · ${this._min(next.minutes || base)}` : 'none'],
      ['Last run', z.lastTs ? this._ago(z.lastTs, now) : 'never'],
    ];
    if (q) facts.unshift(['Waiting', q.waitReason]);
    const anim = ui.anim ? ' anim' : '';
    ui.anim = false;
    const status = run
      ? `${this._sl('watering', 'Watering', `${this._hhmm(run.startTs)} → ${this._hhmm(run.endsAt)}`)}${this._metric(this._min(Math.max(0, (run.endsAt - now) / MIN)), 'left', `${this._min((now - run.startTs) / MIN)} of ${this._min(run.plannedMin)}`, true)}${this._meter((run.progress || 0) * 100, null, 'watering', null, { thin: true })}`
      : this._sl(v.state, v.label, '');
    const actions = run
      ? `${this._btn('danger lg block', 'Stop watering', I.stop, `data-act="stop-zone" data-id="${esc(z.id)}"`)}${this._btn('lg block', '+5 min', I.plus, `data-act="extend-zone" data-id="${esc(z.id)}"`)}`
      : `<div class="chips cols" style="--cols:${presets.length}">${presets.map((m) => `<button type="button" class="ch sq stack${m === pick ? ' on' : ''}" data-act="sheet-dur" data-min="${m}"><span>${m}m</span>${m === base ? '<span class="h">default</span>' : ''}</button>`).join('')}</div>
         ${this._btn('primary xl block', `Water ${pick} min`, I.play, `data-act="run-zone" data-id="${esc(z.id)}" data-min="${pick}"`)}`;
    return `<div class="ovl" data-act="close-sheet"></div>
      <section class="sheet${anim}" role="dialog" aria-modal="true" aria-label="${esc(z.name)}">
        <span class="grab"></span>
        <header class="head">${this._chip(v.state, zoneIcon(z.type), 44)}<div class="txt"><h3 class="title" style="font-size:20px">${esc(z.name)}</h3><div class="sub">${esc(g ? g.name : 'No group')}${z.enabled ? '' : ' · off'}</div></div>
          ${this._iconBtn('Close', I.x, 'data-act="close-sheet"')}</header>
        ${this._tile(v.state, status)}
        <dl class="kv">${facts.map(([l, x]) => `<div><dt>${esc(l)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${z.fault ? this._btn('lg block', 'Clear the fault', '', `data-act="clear-fault" data-id="${esc(z.id)}"`) : ''}
          ${actions}
          ${this._btn('ghost lg block', paused ? 'Resume this zone' : 'Pause this zone for 24 h', paused ? I.play : I.pause, `data-act="pause-zone" data-id="${esc(z.id)}" data-hours="${paused ? 0 : 24}"`)}
        </div>
      </section>`;
  }
}

/** Visual editor: the view, its options and a title. */
class ZroshuaCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { view: 'status', ...config };
    this._render();
  }
  set hass(h) {
    this._hass = h;
  }
  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const c = this._config;
    const view = ALIASES[c.view] || c.view;
    this.shadowRoot.innerHTML = `
      <style>
        .f { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
        label { font-size: .85rem; color: var(--secondary-text-color); }
        select, input { padding: 8px; border-radius: 8px; border: 1px solid var(--divider-color);
          background: var(--card-background-color); color: var(--primary-text-color); }
      </style>
      <div class="f">
        <label>View</label>
        <select id="view">${VIEWS.map((v) => `<option value="${v}" ${v === view ? 'selected' : ''}>${v}</option>`).join('')}</select>
        ${view === 'chart' ? `<label>Metric</label><select id="metric">${['water', 'energy', 'time'].map((m) => `<option value="${m}" ${m === (c.metric || 'water') ? 'selected' : ''}>${m}</option>`).join('')}</select>
          <label>…or the history of an entity (optional)</label><input id="entity" value="${esc(c.entity || '')}" placeholder="sensor.pump_pressure" />` : ''}
        <label>Theme</label>
        <select id="theme">${['auto', 'dark', 'light'].map((t) => `<option value="${t}" ${t === (c.theme || 'auto') ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <label>Title (optional)</label>
        <input id="title" value="${esc(c.title || '')}" />
      </div>`;
    const val = (id) => {
      const el = this.shadowRoot.getElementById(id);
      return el ? el.value : undefined;
    };
    const emit = () => {
      this._config = { ...this._config, view: val('view'), theme: val('theme') === 'auto' ? undefined : val('theme'), title: val('title') || undefined };
      if (val('view') === 'chart') {
        this._config.metric = val('metric') || 'water';
        this._config.entity = val('entity') || undefined;
      } else {
        delete this._config.metric;
        delete this._config.entity;
      }
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
      this._render();
    };
    for (const id of ['view', 'metric', 'theme']) {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.onchange = emit;
    }
    for (const id of ['title', 'entity']) {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.onchange = emit;
    }
  }
}

customElements.define('zroshua-card', ZroshuaCard);
customElements.define('zroshua-card-editor', ZroshuaCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'zroshua-card',
  name: 'Zroshua',
  description: 'Irrigation status, quick run, groups, zones, timeline, water sources, soil sensors, charts and insights.',
  preview: false,
});
console.info('%c ZROSHUA-CARD ', 'background:#4CC38A;color:#04201A;border-radius:3px', 'loaded');
