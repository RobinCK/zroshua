import { Schedule } from '../db/entities';

/** Anything that carries schedules: a Group or a Zone (zone-level schedules). */
export interface Schedulable {
  id: string;
  enabled: boolean;
  schedules: Schedule[];
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_MS = 24 * 3600_000;

function intervalAnchor(schedule: Schedule): { day: number; dow: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(schedule.anchorDate ?? '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { day: date.getTime() / DAY_MS, dow: date.getUTCDay() };
}

/** Weekdays an endless interval can reach; used by the weekly conflict preview. */
export function intervalWeekdays(schedule: Schedule): number[] {
  const anchor = intervalAnchor(schedule);
  const every = Math.floor(schedule.intervalDays ?? 0);
  if (!anchor || every < 1) return [];
  const out: number[] = [];
  for (let dow = anchor.dow; !out.includes(dow); dow = (dow + every) % 7) out.push(dow);
  return out;
}

export interface Occurrence {
  groupId: string;
  scheduleId: string;
  ts: number; // epoch ms of the start
  key: string; // dedupe key
}

export function inSeason(season: Schedule['season'], d: Date): boolean {
  if (!season?.from || !season?.to) return true;
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return season.from <= season.to
    ? md >= season.from && md <= season.to
    : md >= season.from || md <= season.to; // wraps over new year
}

function startsForDay(schedule: Schedule, d: Date) {
  if (!inSeason(schedule.season ?? null, d)) return [];
  if (schedule.mode === 'per_day') {
    return schedule.perDay?.[DAY_KEYS[d.getDay()]] ?? [];
  }
  if (schedule.mode === 'interval') {
    const anchor = intervalAnchor(schedule);
    const every = Math.floor(schedule.intervalDays ?? 0);
    if (!anchor || every < 1) return [];
    // UTC calendar ordinals avoid 23/25-hour DST days changing the rhythm.
    const currentDay = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;
    const elapsed = currentDay - anchor.day;
    return elapsed >= 0 && elapsed % every === 0 ? schedule.starts ?? [] : [];
  }
  // empty array = no days (schedule off); undefined (legacy) = every day
  if (schedule.weekdays && !schedule.weekdays.includes(d.getDay())) return [];
  return schedule.starts ?? [];
}

/**
 * All schedule occurrences for a group or zone within [fromTs, toTs).
 * A start entry with anchor='finish' means "finish BY this time": the start is
 * shifted earlier by `finishShiftMin(scheduleId)` — the worst-case run length —
 * so the run is guaranteed done at the configured time. The dedupe key stays
 * anchored to the configured time, so day-to-day changes of the worst-case
 * length never re-fire an occurrence.
 */
export function occurrences(
  group: Schedulable,
  fromTs: number,
  toTs: number,
  finishShiftMin?: (scheduleId: string) => number,
): Occurrence[] {
  const out: Occurrence[] = [];
  if (!group.enabled) return out;
  // finish-anchored starts can reach back into the window from the next day
  const lookAhead = finishShiftMin ? 24 * 3600_000 : 0;
  for (const schedule of group.schedules ?? []) {
    if (!schedule.enabled) continue;
    const cursor = new Date(fromTs);
    cursor.setHours(0, 0, 0, 0);
    for (let day = new Date(cursor); day.getTime() < toTs + lookAhead; day.setDate(day.getDate() + 1)) {
      for (const s of startsForDay(schedule, day)) {
        const [h, m] = s.start.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
        const anchorTs = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
        const shift = s.anchor === 'finish' && finishShiftMin ? Math.max(0, finishShiftMin(schedule.id)) * 60_000 : 0;
        const ts = anchorTs - shift;
        if (ts >= fromTs && ts < toTs) {
          out.push({
            groupId: group.id,
            scheduleId: schedule.id,
            ts,
            key: `${group.id}:${schedule.id}:${new Date(anchorTs).toISOString()}`,
          });
        }
      }
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}
