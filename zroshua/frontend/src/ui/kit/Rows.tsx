import type { ReactNode } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import type { GardenState } from '../tokens/base';
import { STATE_TONE } from '../tokens/base';
import { stateStyle } from './state';
import s from './Rows.module.css';

export interface ListRowProps {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  state?: GardenState;
  onClick?: () => void;
  chevron?: boolean;
}

/**
 * One finding, one problem, one thing to do: icon chip · title · why · what to do.
 * Insights, «Needs attention» and the add-on's journal highlights use it.
 */
export function ListRow({ icon, title, sub, action, state, onClick, chevron }: ListRowProps) {
  const tone = state ? STATE_TONE[state] : undefined;
  const body = (
    <>
      {icon}
      <span className={s.rowText}>
        <span className={s.rowTitle}>{title}</span>
        {sub != null && <span className={s.rowSub}>{sub}</span>}
        {action != null && <span className={s.rowAction}>{action}</span>}
      </span>
      {chevron && <IconChevronRight size={18} className={s.chev} aria-hidden="true" />}
    </>
  );
  return onClick ? (
    <button type="button" className={s.row} data-tone={tone} style={stateStyle(state)} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={s.row} data-tone={tone} style={stateStyle(state)}>
      {body}
    </div>
  );
}

export function RowList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className={s.list} role="list" aria-label={label}>
      {children}
    </div>
  );
}

/** Rows separated by hairlines (upcoming runs, sensor history): denser than ListRow. */
export function LinedList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className={s.lined} role="list" aria-label={label}>
      {children}
    </div>
  );
}
export function LinedRow({ children }: { children: ReactNode }) {
  return (
    <div className={s.linedRow} role="listitem">
      {children}
    </div>
  );
}

/** «Nothing here» in plain words — never a NaN, never an empty box. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className={s.empty}>{children}</p>;
}

/** Label → value pairs with hairlines (the zone sheet facts). */
export function KeyValues({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className={s.kv}>
      {items.map((it, i) => (
        <div key={i} className={s.kvRow}>
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
