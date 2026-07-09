import { Schedule } from '../db/entities';

/** Anything that carries schedules: a Group or a Zone (zone-level schedules). */
export interface Schedulable {
  id: string;
  enabled: boolean;
  schedules: Schedule[];
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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
  // empty array = no days (schedule off); undefined (legacy) = every day
  if (schedule.weekdays && !schedule.weekdays.includes(d.getDay())) return [];
  return schedule.starts ?? [];
}

/** All schedule occurrences for a group or zone within [fromTs, toTs). */
export function occurrences(group: Schedulable, fromTs: number, toTs: number): Occurrence[] {
  const out: Occurrence[] = [];
  if (!group.enabled) return out;
  for (const schedule of group.schedules ?? []) {
    if (!schedule.enabled) continue;
    const cursor = new Date(fromTs);
    cursor.setHours(0, 0, 0, 0);
    for (let day = new Date(cursor); day.getTime() < toTs; day.setDate(day.getDate() + 1)) {
      for (const s of startsForDay(schedule, day)) {
        const [h, m] = s.start.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
        const ts = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
        if (ts >= fromTs && ts < toTs) {
          out.push({
            groupId: group.id,
            scheduleId: schedule.id,
            ts,
            key: `${group.id}:${schedule.id}:${new Date(ts).toISOString()}`,
          });
        }
      }
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}
