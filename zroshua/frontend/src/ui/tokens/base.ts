/**
 * The single source of the design tokens. Everything else is derived from this file:
 * the CSS variables (tokensToCss), the Mantine theme (createUiTheme) and the token block of
 * the Lovelace card (`npm run tokens:card` copies these values into card/zroshua-card.js).
 *
 * Keep it plain data without imports: scripts/tokens-to-card.mjs loads it outside Vite.
 *
 * Two layers. Tones are colours (water, ok, warn …). States are what the garden is doing
 * (watering, queued, done …) and STATE_TONE says which tone paints each of them — a redesign
 * changes the tone values, a change of meaning changes the map, and no component names a hex.
 */

export interface NeutralTokens {
  bgPage: string;
  bgChrome: string;
  surface1: string;
  surface2: string;
  surface3: string;
  surface4: string;
  surfaceElevated: string;
  shadowElevated: string;
  border: string;
  borderStrong: string;
  divider: string;
  ring: string;
  track: string;
  dot: string;
  controlOff: string;
  text1: string;
  text2: string;
  text3: string;
  textNeutralStrong: string;
  textDisabled: string;
  band: string;
  scrim: string;
}

export interface ToneTokens {
  /** Tinted fill behind a chip, a pill or a tinted tile. */
  bg: string;
  /** Text and icons that carry the tone. */
  fg: string;
  /** Lines, dots, progress fills and chart marks. */
  line: string;
  /** Solid fill for counters and bars, with the ink that reads on it. */
  solid: string;
  ink: string;
}

export const BASE_TONES = ['water', 'event', 'hold', 'ok', 'warn', 'err', 'off'] as const;
export type BaseTone = (typeof BASE_TONES)[number];

/** Everything a zone, a group, a source or a sensor can be doing — the shared state vocabulary. */
export const STATES = ['watering', 'queued', 'next', 'done', 'skip', 'paused', 'fault', 'off'] as const;
export type GardenState = (typeof STATES)[number];

/**
 * Which tone paints which state. Blue means only «water is flowing now»; a skip and a pause
 * share amber because both mean «an automatic run will not happen», a fault is the only red.
 */
export const STATE_TONE: Record<GardenState, BaseTone> = {
  watering: 'water',
  queued: 'event',
  next: 'hold',
  done: 'ok',
  skip: 'warn',
  paused: 'warn',
  fault: 'err',
  off: 'off',
};

/** Chart colours of the measures (not states): litres, pump energy, watering time. */
export interface SeriesTokens {
  water: string;
  energy: string;
  time: string;
}

/** The logo tile: a drop on a tile. */
export interface MarkTokens {
  tile: string;
  ink: string;
}

export interface SchemeBase {
  neutrals: NeutralTokens;
  action: { bg: string; fg: string };
  tones: Record<BaseTone, ToneTokens>;
  series: SeriesTokens;
  mark: MarkTokens;
}

export const BASE_DARK: SchemeBase = {
  neutrals: {
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
  },
  action: { bg: '#ECEEF1', fg: '#0E1013' },
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
};

export const BASE_LIGHT: SchemeBase = {
  neutrals: {
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
  },
  action: { bg: '#14171A', fg: '#FFFFFF' },
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
};

/** Radii in px ('pill' is never scaled). */
export const RADII = {
  xs: 3,
  sm: 6,
  chip: 8,
  md: 10,
  lg: 12,
  xl: 14,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;
export type RadiusName = keyof typeof RADII;

/** The spacing scale in px. */
export const SPACE_SCALE = [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48] as const;

/** Named gaps for layout props (`gap="md"`), a subset of the scale. */
export const SPACE = {
  '2xs': 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;
export type SpaceName = keyof typeof SPACE;

export interface TypeStep {
  size: string;
  weight: number;
  tracking: string;
  lineHeight?: number;
}

export const TYPE = {
  micro: { size: '11.5px', weight: 500, tracking: '0' },
  caption: { size: '12.5px', weight: 400, tracking: '0' },
  body: { size: '14px', weight: 400, tracking: '0' },
  bodyLg: { size: '15px', weight: 500, tracking: '0' },
  title: { size: '16px', weight: 600, tracking: '-0.1px' },
  titleLg: { size: '17px', weight: 600, tracking: '-0.1px' },
  section: { size: '20px', weight: 600, tracking: '-0.2px', lineHeight: 1.25 },
  value: { size: '20px', weight: 500, tracking: '-0.3px', lineHeight: 1.2 },
  metric: { size: '30px', weight: 500, tracking: '-0.6px', lineHeight: 1.1 },
  headline: { size: 'clamp(22px, 2.6vw, 26px)', weight: 600, tracking: '-0.4px', lineHeight: 1.2 },
  countdown: { size: '40px', weight: 500, tracking: '-1.2px', lineHeight: 1 },
} as const satisfies Record<string, TypeStep>;
export type TypeName = keyof typeof TYPE;

/** Control heights in px: chips 26/32, buttons 40, phone targets 44, primary on a phone 48–52. */
export const CONTROL_HEIGHTS = [22, 26, 32, 36, 40, 44, 48, 52] as const;

export const MOTION_MS = 150;
export const LINE_HEIGHT = 1.45;

export const FONTS = { sans: 'IBM Plex Sans', mono: 'IBM Plex Mono' } as const;
