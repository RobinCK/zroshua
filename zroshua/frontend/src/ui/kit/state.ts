import type { CSSProperties } from 'react';
import type { GardenState } from '../tokens/base';
import { stateVar } from '../tokens';

/**
 * The colour variables of one state as `--s-*` custom properties. Every kit component that
 * shows a state sets these on its root and its CSS only ever reads `var(--s-fg)` & co, so a
 * component never knows which hex — or even which tone — a state is painted with.
 */
export function stateStyle(state: GardenState | null | undefined, extra?: CSSProperties): CSSProperties {
  if (!state) return { ...extra };
  return {
    '--s-bg': stateVar(state, 'bg'),
    '--s-fg': stateVar(state, 'fg'),
    '--s-line': stateVar(state, 'line'),
    '--s-solid': stateVar(state, 'solid'),
    '--s-ink': stateVar(state, 'ink'),
    '--s-halo': stateVar(state, 'halo'),
    '--s-tint': stateVar(state, 'tint'),
    '--s-edge': stateVar(state, 'edge'),
    ...extra,
  } as CSSProperties;
}

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
