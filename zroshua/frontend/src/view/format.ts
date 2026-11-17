import { locale, t } from '../i18n';

const MIN = 60_000;
const DAY = 86_400_000;

export function dayStart(ts = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 06:00 */
export const hhmm = (ts: number) => new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

/** Today / Tomorrow / Sat */
export function dayWord(ts: number, now = Date.now()): string {
  const diff = Math.round((dayStart(ts) - dayStart(now)) / DAY);
  if (diff === 0) return t('Today');
  if (diff === 1) return t('Tomorrow');
  if (diff === -1) return t('Yesterday');
  return new Date(ts).toLocaleDateString(locale, { weekday: 'short' });
}

/** «06:00» today, «Tomorrow 05:30», «Sat 03:30» */
export function when(ts: number, now = Date.now()): string {
  const diff = Math.round((dayStart(ts) - dayStart(now)) / DAY);
  return diff === 0 ? hhmm(ts) : `${dayWord(ts, now)} ${hhmm(ts)}`;
}

/** For tiles: the time alone within the next day, the weekday added after that. */
export function whenShort(ts: number, now = Date.now()): string {
  return ts - now < 20 * 3_600_000 ? hhmm(ts) : `${new Date(ts).toLocaleDateString(locale, { weekday: 'short' })} ${hhmm(ts)}`;
}

/** 7 min · 1 h 05 min */
export function minutes(n: number): string {
  const m = Math.round(n);
  if (m < 60) return t('{n} min', { n: m });
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? t('{h} h {m} min', { h, m: String(r).padStart(2, '0') }) : t('{h} h', { h });
}

/** in 18 min · in 2 h 05 min · in 3 days */
export function inTime(ts: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((ts - now) / MIN));
  if (m < 1) return t('now');
  if (m < 60) return t('in {n} min', { n: m });
  if (m < 24 * 60) return t('in {h} h {m} min', { h: Math.floor(m / 60), m: String(m % 60).padStart(2, '0') });
  return t('in {count} days', { count: Math.round(m / 1440) });
}

/** 12 min ago · 3 h ago */
export function ago(ts: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - ts) / MIN));
  if (m < 1) return t('just now');
  if (m < 60) return t('{n} min ago', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('{n}h ago', { n: h });
  return t('{count} days ago', { count: Math.floor(h / 24) });
}

/** 1 839 — thin grouping that does not wrap */
export const num = (n: number, digits = 0) =>
  n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** 1 839 L · 12.4 m³ */
export function liters(n: number): string {
  if (n >= 10_000) return t('{n} m³', { n: num(n / 1000, 1) });
  return t('{n} L', { n: num(Math.round(n)) });
}

export function weekday(ts: number): string {
  return new Date(ts).toLocaleDateString(locale, { weekday: 'short' });
}

export function dateLong(ts: number): string {
  return new Date(ts).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}
