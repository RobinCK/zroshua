import type { CSSProperties, ReactNode } from 'react';
import type { GardenState } from '../tokens/base';
import { cx, stateStyle } from './state';
import s from './Status.module.css';

const CALM: GardenState[] = ['next', 'off'];

/** A rounded square with an icon. Tinted by the state, except the calm ones (next, off). */
export function IconChip({
  children,
  state,
  size = 40,
  calm,
}: {
  children: ReactNode;
  state?: GardenState | null;
  size?: 28 | 32 | 36 | 40 | 44;
  /** force the neutral look even for a loud state */
  calm?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={s.chip}
      data-state={!!state}
      data-calm={calm || (!!state && CALM.includes(state))}
      style={stateStyle(state, { '--size': `${size}px` } as CSSProperties)}
    >
      {children}
    </span>
  );
}

/** The 6px state dot. Watering pulses: the only moving thing on the screen means water flows. */
export function StatusDot({ state }: { state: GardenState }) {
  return <span className={s.dot} data-pulse={state === 'watering'} style={stateStyle(state)} />;
}

/**
 * The status line every entity uses: dot · what (in the state colour) · when (muted).
 * «Watering · until 07:00», «Next run · in 18 min», «Off».
 */
export function StatusLine({
  state,
  word,
  aside,
  compact,
}: {
  state: GardenState;
  word: ReactNode;
  aside?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx(s.line, compact && s.compact)} style={stateStyle(state)}>
      <StatusDot state={state} />
      <span className={s.word}>{word}</span>
      {aside != null && aside !== '' && <span className={s.lineAside}>{aside}</span>}
    </div>
  );
}

/** A pill with a dot: the same state words as StatusLine, for headers and lists. */
export function StatusPill({ state, children, small }: { state: GardenState; children: ReactNode; small?: boolean }) {
  return (
    <span className={cx(s.pill, small && s.small)} style={stateStyle(state)}>
      <span className={s.dot} />
      {children}
    </span>
  );
}

/** A small solid counter (nav badges, attention count). */
export function CountBadge({ value, state }: { value: number; state?: GardenState }) {
  return (
    <span className={s.count} style={stateStyle(state)}>
      {value}
    </span>
  );
}

export interface Segment {
  state: GardenState;
  label?: string;
  /** the segment the eye should land on (the zone that waters now) */
  active?: boolean;
}

/**
 * One segment per zone, in run order: what is done, what waters, what waits. Used by the
 * group card and the status card, so a sequence reads the same everywhere.
 */
export function SegmentBar({ segments, labels, ariaLabel }: { segments: Segment[]; labels?: boolean; ariaLabel?: string }) {
  return (
    <div className={s.segments} role={ariaLabel ? 'img' : undefined} aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : true}>
      {segments.map((seg, i) => (
        <div key={i} className={s.segment} style={stateStyle(seg.state)}>
          <span className={s.segBar} data-off={seg.state === 'off'} data-calm={seg.state === 'next'} />
          {labels && seg.label && (
            <span className={s.segLabel} data-active={!!seg.active}>
              {seg.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
