import type { CSSProperties, ElementType, ReactNode } from 'react';
import type { GardenState } from '../tokens/base';
import { cx, stateStyle } from './state';
import s from './Surface.module.css';

/** States that earn a coloured edge on a panel or a tile: you must notice them from across the room. */
const EDGE: GardenState[] = ['watering', 'fault'];

export interface PanelProps {
  children: ReactNode;
  /** Colours the border for the two states that must be seen: watering and fault. */
  state?: GardenState | null;
  /** 20px padding for page-level panels (status, timeline); 16px for entity cards. */
  pad?: 'md' | 'lg';
  /** Stretch to the grid cell, so a row of cards lines up. */
  fill?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/** The card shell: surface 1, a 1px border, radius 16. One per Lovelace card or page section. */
export function Panel({ children, state, pad = 'md', fill, as: Tag = 'article', className, style, ...aria }: PanelProps) {
  return (
    <Tag
      className={cx(s.panel, pad === 'lg' && s.padLg, fill && s.fill, className)}
      data-edge={!!state && EDGE.includes(state)}
      style={stateStyle(state, style)}
      {...aria}
    >
      {children}
    </Tag>
  );
}

export interface PanelHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  aside?: ReactNode;
  large?: boolean;
  /** heading level of the title */
  level?: 2 | 3;
  id?: string;
}

/** Header of a panel: optional icon chip, a title, a muted subtitle and something on the right. */
export function PanelHeader({ title, sub, icon, aside, large, level = 3, id }: PanelHeaderProps) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <header className={s.header}>
      {icon}
      <div className={s.headerText}>
        <H id={id} className={cx(s.title, large && s.titleLg)}>
          {title}
        </H>
        {sub != null && sub !== false && <div className={s.sub}>{sub}</div>}
      </div>
      {aside != null && aside !== false && <div className={s.aside}>{aside}</div>}
    </header>
  );
}

export interface TileProps {
  children: ReactNode;
  state?: GardenState | null;
  /** Tint the whole tile with the state (watering, queued, fault); otherwise only the edge. */
  tint?: boolean;
  grow?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** An item inside a panel: surface 2, radius 12. «Off» is a dashed outline that still reads. */
export function Tile({ children, state, tint, grow, className, style }: TileProps) {
  const tinted = tint ?? (state === 'watering' || state === 'fault');
  return (
    <div
      className={cx(s.tile, grow && s.grow, className)}
      data-tint={!!state && tinted && state !== 'off'}
      data-edge={!!state && (state === 'queued' || state === 'paused')}
      data-off={state === 'off'}
      style={stateStyle(state, style)}
    >
      {children}
    </div>
  );
}

export interface SectionProps {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}

/** A page section: a 20px heading over a group of separate cards (groups, water sources). */
export function Section({ title, meta, action, children, id }: SectionProps) {
  return (
    <section className={s.section} aria-labelledby={id}>
      <div className={s.sectionHead}>
        <h2 id={id} className={s.sectionTitle}>
          {title}
        </h2>
        {meta != null && <span className={s.sectionMeta}>{meta}</span>}
        {action != null && <span className={s.sectionAction}>{action}</span>}
      </div>
      {children}
    </section>
  );
}

/** Responsive card grid: as many columns of at least `min` px as fit. */
export function CardGrid({ children, min = 300, gap = 16 }: { children: ReactNode; min?: number; gap?: number }) {
  return (
    <div className={s.grid} style={{ '--min': `${min}px`, '--gap': `${gap}px` } as CSSProperties}>
      {children}
    </div>
  );
}

/** Like CardGrid, but on a phone the row becomes a swipe strip instead of a 1500px column. */
export function CardStrip({ children, min = 300, gap = 16 }: { children: ReactNode; min?: number; gap?: number }) {
  return (
    <div className={s.strip} style={{ '--min': `${min}px`, '--gap': `${gap}px` } as CSSProperties}>
      {children}
    </div>
  );
}
