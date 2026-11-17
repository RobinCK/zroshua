import {
  BASE_DARK,
  BASE_LIGHT,
  BASE_TONES,
  CONTROL_HEIGHTS,
  FONTS,
  LINE_HEIGHT,
  MOTION_MS,
  RADII,
  SPACE,
  SPACE_SCALE,
  STATE_TONE,
  TYPE,
  type SchemeBase,
} from './base';
import { withAlpha } from './color';

export type ColorScheme = 'dark' | 'light';

export interface ThemeTokens {
  dark: SchemeBase;
  light: SchemeBase;
  radii: typeof RADII;
  space: typeof SPACE;
  spaceScale: typeof SPACE_SCALE;
  type: typeof TYPE;
  controls: typeof CONTROL_HEIGHTS;
  fonts: { sans: string; mono: string };
  motionMs: number;
  lineHeight: number;
}

const SANS_FALLBACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO_FALLBACK = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

export const TOKENS: ThemeTokens = {
  dark: BASE_DARK,
  light: BASE_LIGHT,
  radii: RADII,
  space: SPACE,
  spaceScale: SPACE_SCALE,
  type: TYPE,
  controls: CONTROL_HEIGHTS,
  fonts: { sans: `'${FONTS.sans}', ${SANS_FALLBACK}`, mono: `'${FONTS.mono}', ${MONO_FALLBACK}` },
  motionMs: MOTION_MS,
  lineHeight: LINE_HEIGHT,
};

/** bgPage → bg-page, surface1 → surface-1, bodyLg → body-lg. */
export function kebab(key: string): string {
  return key
    .replace(/([a-z]{2,})([0-9])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function decls(vars: Record<string, string | number>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}

const TONE_PARTS = ['bg', 'fg', 'line', 'solid', 'ink', 'halo'] as const;

function schemeVars(t: SchemeBase): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, value] of Object.entries(t.neutrals)) v[`--ui-${kebab(k)}`] = value;
  v['--ui-action-bg'] = t.action.bg;
  v['--ui-action-fg'] = t.action.fg;
  for (const tone of BASE_TONES) {
    const c = t.tones[tone];
    v[`--ui-tone-${tone}-bg`] = c.bg;
    v[`--ui-tone-${tone}-fg`] = c.fg;
    v[`--ui-tone-${tone}-line`] = c.line;
    v[`--ui-tone-${tone}-solid`] = c.solid;
    v[`--ui-tone-${tone}-ink`] = c.ink;
    v[`--ui-tone-${tone}-halo`] = withAlpha(c.line, 0.25);
    v[`--ui-tone-${tone}-tint`] = withAlpha(c.line, 0.08);
    v[`--ui-tone-${tone}-edge`] = withAlpha(c.line, 0.4);
  }
  // a state is a pointer to a tone: components paint `--ui-state-watering-fg`, never a tone name
  for (const [state, tone] of Object.entries(STATE_TONE)) {
    for (const part of [...TONE_PARTS, 'tint', 'edge']) v[`--ui-state-${state}-${part}`] = `var(--ui-tone-${tone}-${part})`;
  }
  v['--ui-series-water'] = t.series.water;
  v['--ui-series-energy'] = t.series.energy;
  v['--ui-series-time'] = t.series.time;
  v['--ui-mark-tile'] = t.mark.tile;
  v['--ui-mark-ink'] = t.mark.ink;
  // Mantine reads these; pointing them at the tokens keeps its own components on-palette
  v['--mantine-color-body'] = t.neutrals.bgPage;
  v['--mantine-color-text'] = t.neutrals.text1;
  v['--mantine-color-dimmed'] = t.neutrals.text3;
  v['--mantine-color-placeholder'] = t.neutrals.text3;
  v['--mantine-color-anchor'] = t.neutrals.text1;
  v['--mantine-color-default'] = t.neutrals.surface2;
  v['--mantine-color-default-hover'] = t.neutrals.surface3;
  v['--mantine-color-default-color'] = t.neutrals.text1;
  v['--mantine-color-default-border'] = t.neutrals.borderStrong;
  v['--mantine-color-error'] = t.tones.err.fg;
  return v;
}

function sharedVars(t: ThemeTokens): Record<string, string> {
  const v: Record<string, string> = {
    '--ui-font-sans': t.fonts.sans,
    '--ui-font-mono': t.fonts.mono,
    '--ui-line-height': String(t.lineHeight),
    '--ui-motion': `${t.motionMs}ms`,
    '--ui-gutter': 'clamp(12px, 3vw, 24px)',
    '--ui-content-max': '1480px',
  };
  for (const [k, r] of Object.entries(t.radii)) v[`--ui-radius-${k}`] = `${r}px`;
  for (const s of t.spaceScale) v[`--ui-space-${s}`] = `${s}px`;
  for (const [k, s] of Object.entries(t.space)) v[`--ui-gap-${k}`] = `${s}px`;
  for (const h of t.controls) v[`--ui-h-${h}`] = `${h}px`;
  for (const [k, step] of Object.entries(t.type)) {
    const name = kebab(k);
    v[`--ui-fs-${name}`] = step.size;
    v[`--ui-fw-${name}`] = String(step.weight);
    v[`--ui-ls-${name}`] = step.tracking;
    if ('lineHeight' in step) v[`--ui-lh-${name}`] = String(step.lineHeight);
  }
  return v;
}

/**
 * CSS for both schemes. The doubled :root is deliberate: MantineProvider writes its own
 * colour variables at runtime into a style tag appended after ours, at the same
 * specificity, so a single :root would lose the tie. `[data-ui-scheme]` lets a subtree
 * show the other scheme (the kit gallery shows both side by side).
 */
export function tokensToCss(t: ThemeTokens = TOKENS): string {
  const dark = decls(schemeVars(t.dark));
  const light = decls(schemeVars(t.light));
  return [
    `:root {\n${decls(sharedVars(t))}\n}`,
    `:root:root[data-mantine-color-scheme='dark'] {\n${dark}\n  color-scheme: dark;\n}`,
    `:root:root[data-mantine-color-scheme='light'] {\n${light}\n  color-scheme: light;\n}`,
    `[data-ui-scheme='dark'][data-ui-scheme] {\n${dark}\n  color-scheme: dark;\n}`,
    `[data-ui-scheme='light'][data-ui-scheme] {\n${light}\n  color-scheme: light;\n}`,
  ].join('\n');
}
