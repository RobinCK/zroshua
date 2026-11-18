import React, { forwardRef, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { Menu } from '@mantine/core';
import { cx } from './state';
import s from './Controls.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  block?: boolean;
  grow?: boolean;
}

/**
 * The one button. primary = the action of the screen (light on dark), secondary = everyday
 * (Run now, +5 min), danger = stops water, ghost = links in a row. One per state, never a gradient.
 */
export const UiButton = forwardRef<HTMLButtonElement, UiButtonProps>(function UiButton(
  { variant = 'secondary', size = 'md', icon, block, grow, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(s.btn, s[variant], size !== 'md' && s[size], block && s.block, grow && s.grow, className)}
      {...rest}
    >
      {icon}
      {children != null && <span className={s.label}>{children}</span>}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** required: an icon-only button must say what it does */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'secondary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(s.btn, s.icon, s[variant], size === 'lg' && s.lg, className)}
      {...rest}
    >
      {icon}
    </button>
  );
});

export interface ChoiceOption<K extends string | number> {
  key: K;
  label: ReactNode;
  count?: number;
  hint?: ReactNode;
  disabled?: boolean;
}

/**
 * Pill choices: filters (All 32 · Watering 1), periods (Day · Week), durations (5m · 10m).
 * `square` makes 40px touch chips; `fill` spreads them over the row.
 */
export function ChoiceChips<K extends string | number>({
  options,
  value,
  onChange,
  label,
  square,
  fill,
  scroll,
  cols,
}: {
  options: ChoiceOption<K>[];
  value: K | null;
  onChange: (key: K) => void;
  label: string;
  square?: boolean;
  fill?: boolean;
  scroll?: boolean;
  /** an even grid of this many columns (durations) instead of a wrapping row */
  cols?: number;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(s.chips, scroll && s.scroll, cols != null && s.cols)}
      style={cols != null ? ({ '--cols': cols } as React.CSSProperties) : undefined}
    >
      {options.map((o) => (
        <button
          key={String(o.key)}
          type="button"
          aria-pressed={o.key === value}
          disabled={o.disabled}
          onClick={() => onChange(o.key)}
          className={cx(s.chip, square && s.square, fill && s.fill, o.hint != null && s.stack)}
        >
          <span>{o.label}</span>
          {o.count != null && <span className={s.count}>{o.count}</span>}
          {o.hint != null && <span className={s.hint}>{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export interface TabItem<K extends string> {
  key: K;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}

/** Equal-width segmented tabs: Controls · Sensors · Graphs, Zone · Group. 44px on a phone. */
export function SegmentTabs<K extends string>({
  items,
  value,
  onChange,
  label,
  inset,
  touch,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  inset?: boolean;
  touch?: boolean;
}) {
  return (
    <div role="tablist" aria-label={label} className={cx(s.tabs, inset && s.inset, touch && s.touch)}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={it.key === value}
          onClick={() => onChange(it.key)}
          className={s.tab}
        >
          {it.icon}
          <span>{it.label}</span>
          {it.badge}
        </button>
      ))}
    </div>
  );
}

export interface MenuAction<K extends string> {
  key: K;
  label: ReactNode;
  icon?: ReactNode;
  /** stops or drops something: drawn in the fault colour */
  danger?: boolean;
}

/**
 * A few actions behind one button: pause for 6 · 12 · 24 h, skip or cancel a run. The trigger is
 * any kit button; items are 40px tall so they are easy to hit with a thumb.
 */
export function ActionMenu<K extends string>({
  trigger,
  title,
  note,
  items,
  onPick,
}: {
  trigger: ReactElement;
  title?: ReactNode;
  note?: ReactNode;
  items: MenuAction<K>[];
  onPick: (key: K) => void;
}) {
  return (
    <Menu position="bottom-end" withinPortal classNames={{ item: s.menuItem, label: s.menuLabel }}>
      <Menu.Target>{trigger}</Menu.Target>
      <Menu.Dropdown>
        {title != null && <Menu.Label>{title}</Menu.Label>}
        {items.map((it) => (
          <Menu.Item key={it.key} leftSection={it.icon} data-danger={it.danger || undefined} onClick={() => onPick(it.key)}>
            {it.label}
          </Menu.Item>
        ))}
        {note != null && <p className={s.menuNote}>{note}</p>}
      </Menu.Dropdown>
    </Menu>
  );
}
