export {
  BASE_DARK,
  BASE_LIGHT,
  BASE_TONES,
  CONTROL_HEIGHTS,
  FONTS,
  RADII,
  SPACE,
  SPACE_SCALE,
  STATES,
  STATE_TONE,
  TYPE,
  type BaseTone,
  type GardenState,
  type NeutralTokens,
  type RadiusName,
  type SchemeBase,
  type SeriesTokens,
  type SpaceName,
  type ToneTokens,
  type TypeName,
} from './base';
export { TOKENS, kebab, tokensToCss, type ColorScheme, type ThemeTokens } from './build';
export { contrast, flatten, luminance, mix, parseColor, ramp, withAlpha } from './color';

import type { BaseTone, GardenState } from './base';

export type TonePart = 'bg' | 'fg' | 'line' | 'solid' | 'ink' | 'halo' | 'tint' | 'edge';

/** `var(--ui-tone-water-fg)` — the CSS reference for a tone colour. */
export function toneVar(tone: BaseTone, part: TonePart): string {
  return `var(--ui-tone-${tone}-${part})`;
}

/** `var(--ui-state-watering-fg)` — the CSS reference for a state colour (follows STATE_TONE). */
export function stateVar(state: GardenState, part: TonePart): string {
  return `var(--ui-state-${state}-${part})`;
}
