import type { CSSProperties, ReactNode } from 'react';
import s from './Charts.module.css';

export interface BarDatum {
  label: string;
  value: number;
  /** spoken and shown in the readout: «Wed 15 Jul · 2 010 L» */
  aria: string;
  /** a bar still filling (today so far): drawn at half strength */
  partial?: boolean;
}

/**
 * Bars that answer a tap. One series, one colour (the title names it, so no legend). A tap,
 * hover or focus selects a bar; the readout above the chart then shows its exact value —
 * on a phone there is no hover, so the readout is the tooltip.
 */
export function BarChart({
  data,
  color,
  axisMax,
  axisLabel,
  average,
  averageLabel,
  selected,
  onSelect,
  height = 140,
}: {
  data: BarDatum[];
  color: string;
  axisMax: number;
  axisLabel?: string;
  average?: number | null;
  averageLabel?: string;
  selected: number | null;
  onSelect: (i: number) => void;
  height?: number;
}) {
  const pct = (v: number) => Math.max(0, Math.min(100, (v / Math.max(axisMax, 1e-9)) * 100));
  return (
    <div className={s.chart} style={{ '--c': color, '--h': `${height}px` } as CSSProperties}>
      <div className={s.plot}>
        <div className={s.grid} style={{ top: 0 }} />
        {axisLabel && (
          <span className={s.axisLabel} style={{ top: 0 }}>
            {axisLabel}
          </span>
        )}
        {average != null && average > 0 && (
          <>
            <div className={s.avg} style={{ bottom: `${pct(average)}%` }} />
            {averageLabel && (
              <span className={s.avgLabel} style={{ bottom: `${pct(average)}%` }}>
                {averageLabel}
              </span>
            )}
          </>
        )}
        <div className={s.bars}>
          {data.map((d, i) => (
            <button
              key={i}
              type="button"
              className={s.barHit}
              aria-label={d.aria}
              aria-pressed={selected === i}
              onClick={() => onSelect(i)}
              onMouseEnter={() => onSelect(i)}
              onFocus={() => onSelect(i)}
            >
              <span
                className={s.bar}
                style={{
                  height: `${pct(d.value)}%`,
                  opacity: selected === null ? (d.partial ? 0.5 : 1) : selected === i ? 1 : 0.35,
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className={s.xlabels} aria-hidden="true">
        {data.map((d, i) => (
          <span key={i} className={s.xlabel} data-on={selected === i}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface LinePoint {
  value: number | null;
  aria: string;
}

/**
 * A line over time with an optional target band and a touch crosshair. Gaps (null) break the
 * line. Same readout pattern as BarChart.
 */
export function LineChart({
  points,
  color,
  max,
  min = 0,
  band,
  bandLabel,
  ticks,
  selected,
  onSelect,
  height = 140,
}: {
  points: LinePoint[];
  color: string;
  max: number;
  min?: number;
  band?: [number, number] | null;
  bandLabel?: string;
  ticks?: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  height?: number;
}) {
  const H = height;
  const y = (v: number) => H - ((Math.min(max, Math.max(min, v)) - min) / Math.max(max - min, 1e-9)) * H;
  const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * 100 : 50);
  let d = '';
  let pen = false;
  points.forEach((p, i) => {
    if (p.value == null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(2)} ${y(p.value).toFixed(2)} `;
    pen = true;
  });
  const sel = selected != null && points[selected]?.value != null ? selected : null;
  return (
    <div className={s.chart} style={{ '--c': color, '--h': `${H}px` } as CSSProperties}>
      <div className={s.plot} style={{ borderBottom: '1px solid var(--ui-border-strong)' }}>
        <svg className={s.svg} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {band && (
            <rect x="0" y={y(band[1])} width="100" height={Math.max(0, y(band[0]) - y(band[1]))} fill="var(--ui-tone-ok-tint)" />
          )}
          <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {band && bandLabel && (
          <span className={s.bandLabel} style={{ top: y(band[1]) }}>
            {bandLabel}
          </span>
        )}
        {sel != null && (
          <>
            <span className={s.cross} style={{ left: `${x(sel)}%` }} />
            <span className={s.marker} style={{ left: `${x(sel)}%`, top: y(points[sel].value!) }} />
          </>
        )}
        <div className={s.hits}>
          {points.map((p, i) => (
            <button
              key={i}
              type="button"
              className={s.hit}
              aria-label={p.aria}
              onClick={() => onSelect(i)}
              onMouseEnter={() => onSelect(i)}
              onFocus={() => onSelect(i)}
            />
          ))}
        </div>
      </div>
      {ticks && (
        <div className={s.ticks} aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The line above a chart that shows the tapped value, or a hint until something is tapped. */
export function Readout({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <div className={s.readout} data-on={active} aria-live="polite">
      {children}
    </div>
  );
}

/**
 * A small line without axes: soil moisture over 24 h or 7 days, with an optional dashed
 * threshold (the watering trigger).
 */
export function Sparkline({
  values,
  min,
  max,
  threshold,
  height = 44,
  color = 'var(--ui-text-neutral-strong)',
  area = true,
  label,
}: {
  values: (number | null)[];
  min: number;
  max: number;
  threshold?: number | null;
  height?: number;
  color?: string;
  area?: boolean;
  label: string;
}) {
  const H = height - 4;
  const y = (v: number) => (H - ((Math.min(max, Math.max(min, v)) - min) / Math.max(max - min, 1e-9)) * H + 2).toFixed(2);
  const pts = values.map((v, i) => (v == null ? null : [((i / Math.max(values.length - 1, 1)) * 100).toFixed(2), y(v)] as const));
  let line = '';
  let pen = false;
  for (const p of pts) {
    if (!p) {
      pen = false;
      continue;
    }
    line += `${pen ? 'L' : 'M'}${p[0]} ${p[1]} `;
    pen = true;
  }
  const first = pts.find(Boolean);
  const last = [...pts].reverse().find(Boolean);
  const fill = area && first && last ? `${line}L${last[0]} ${height} L${first[0]} ${height} Z` : '';
  return (
    <svg className={s.spark} height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {threshold != null && (
        <line x1="0" x2="100" y1={y(threshold)} y2={y(threshold)} stroke="var(--ui-tone-warn-line)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity=".7" />
      )}
      {fill && <path d={fill} fill="var(--ui-band)" />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The dashed «nothing here yet» box with a reason instead of NaN. */
export function EmptyChart({ title, text, height = 140 }: { title: ReactNode; text?: ReactNode; height?: number }) {
  return (
    <div className={s.empty} style={{ '--h': `${height}px` } as CSSProperties}>
      <span className={s.emptyTitle}>{title}</span>
      {text && <span className={s.emptyText}>{text}</span>}
    </div>
  );
}
