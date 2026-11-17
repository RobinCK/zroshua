import type { CSSProperties, ReactNode } from 'react';
import type { GardenState } from '../tokens/base';
import { cx, stateStyle } from './state';
import s from './Measure.module.css';

/** A number with its unit, always together: «2.8 bar», «1 839 L», «8:12 min left». */
export function Metric({
  value,
  unit,
  aside,
  big,
}: {
  value: ReactNode;
  unit?: ReactNode;
  aside?: ReactNode;
  big?: boolean;
}) {
  return (
    <div className={s.metric}>
      <span className={cx(s.metricValue, big && s.big)}>{value}</span>
      {unit != null && unit !== '' && <span className={s.metricUnit}>{unit}</span>}
      {aside != null && aside !== '' && <span className={s.metricAside}>{aside}</span>}
    </div>
  );
}

export interface MeterBand {
  /** start of the band in % of the scale */
  from: number;
  to: number;
  state: GardenState;
}

/**
 * A horizontal gauge: a fill or bands, an optional marker (target, reserve, current value) and
 * a scale underneath. Pressure, barrel level and soil moisture all use it.
 */
export function Meter({
  pct,
  state,
  mark,
  bands,
  scale,
  thin,
  label,
}: {
  /** fill up to this % (omit with bands to show the value as the marker) */
  pct?: number | null;
  state?: GardenState;
  mark?: number | null;
  bands?: MeterBand[];
  scale?: ReactNode[];
  thin?: boolean;
  label?: string;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const background = bands?.length
    ? `linear-gradient(to right, ${bands
        .map((b) => `var(--ui-state-${b.state}-halo) ${clamp(b.from)}%, var(--ui-state-${b.state}-halo) ${clamp(b.to)}%`)
        .join(', ')})`
    : undefined;
  return (
    <div className={s.meter}>
      <div
        className={cx(s.track, thin && s.thin)}
        style={stateStyle(state, background ? { background } : undefined)}
        role={label ? 'meter' : undefined}
        aria-label={label}
        aria-valuenow={pct ?? mark ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {pct != null && <div className={s.fill} style={{ width: `${clamp(pct)}%` }} />}
        {mark != null && <span aria-hidden="true" className={s.mark} style={{ left: `${clamp(mark)}%` }} />}
      </div>
      {scale && (
        <div className={s.scale}>
          {scale.map((x, i) => (
            <span key={i}>{x}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The 3px progress strip at the bottom edge of a watering tile. */
export function EdgeProgress({ pct, state = 'watering' }: { pct: number; state?: GardenState }) {
  return (
    <span aria-hidden="true" className={s.progress} style={stateStyle(state)}>
      <span className={s.progressFill} style={{ display: 'block', width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

export interface StatItem {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  /** a value that needs you (a low battery) */
  warn?: boolean;
}

/** Label over value cells: the footer of entity cards (flow, current, battery…). */
export function StatRow({ items, cols, footer }: { items: StatItem[]; cols?: number; footer?: boolean }) {
  const auto = !cols;
  return (
    <div
      className={cx(s.stats, auto && s.statsAuto, footer && s.footer)}
      style={{ '--cols': cols ?? 3, '--min': '84px' } as CSSProperties}
    >
      {items.map((it, i) => (
        <div key={i} className={s.cell}>
          <span className={s.cellLabel}>{it.label}</span>
          <span className={s.cellValue} data-tone={it.warn ? 'warn' : undefined}>
            {it.value}
          </span>
          {it.note != null && it.note !== '' && (
            <span className={s.cellNote} data-tone={it.warn ? 'warn' : undefined}>
              {it.note}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Stat tiles (status card): label, a value at 20px, a muted line. */
export function StatTiles({ items, min = 140 }: { items: StatItem[]; min?: number }) {
  return (
    <div className={cx(s.stats, s.statsAuto)} style={{ '--min': `${min}px` } as CSSProperties}>
      {items.map((it, i) => (
        <div key={i} className={cx(s.cell, s.statTile)}>
          <span className={s.cellLabel}>{it.label}</span>
          <span className={s.cellValue}>{it.value}</span>
          {it.note != null && it.note !== '' && <span className={s.cellNote}>{it.note}</span>}
        </div>
      ))}
    </div>
  );
}
