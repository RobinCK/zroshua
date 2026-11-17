import type { EngineState, Group, PlanResponse, Upcoming, WeatherNow, Zone } from '../api';
import type {
  BadgeView,
  ChartView,
  FindingView,
  GroupView,
  QuickTarget,
  SensorView,
  SourceView,
  StatusView,
  TimelineLaneView,
  UpcomingView,
  UsageRowView,
  WeatherDayView,
  ZoneSectionView,
  ZoneView,
} from '../ui/garden';
import type { GardenState } from '../ui/tokens';
import type { Segment, StatItem } from '../ui/kit';
import { t } from '../i18n';
import { ago, dateLong, dayStart, dayWord, hhmm, inTime, liters, minutes, num, weekday, when, whenShort } from './format';
import type { DayStat, Finding, Insights, RunRow, SensorLive, SourceLive } from './live';

const MIN = 60_000;
const HOUR = 3_600_000;

/** Everything the dashboards are built from; any part may still be loading (null). */
export interface GardenData {
  now: number;
  state: EngineState | null;
  zones: Zone[];
  groups: Group[];
  upcoming: Upcoming[];
  lastRuns: { zones: Record<string, number>; groups: Record<string, number> } | null;
  runsToday: RunRow[];
  plan: PlanResponse | null;
  sources: SourceLive[];
  sensors: SensorLive[];
  attention: Finding[];
  insights: Insights | null;
  days: DayStat[];
  weather: WeatherNow | null;
}

const ACTIVE = (d: GardenData) => d.state?.active ?? [];
const QUEUE = (d: GardenData) => d.state?.queue ?? [];

function nextFor(d: GardenData, zoneId: string) {
  for (const u of d.upcoming) {
    if (u.ts <= d.now) continue;
    const z = u.zones.find((x) => x.zoneId === zoneId);
    if (z) return { u, z };
  }
  return null;
}

/** A waiting reason in plain words, short enough for a tile. */
function waitShort(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('sequential')) return t('Next in line');
  if (r.includes('flow')) return t('Waits for flow budget');
  if (r.includes('mutex') || r.includes('never overlap')) return t('Waits for another group');
  if (r.includes('soak') || r.includes('delay')) return t('Soaking');
  if (r.includes('pump') || r.includes('source')) return t('Waiting for water');
  return t('Queued');
}

// ---- zones ---------------------------------------------------------------------------

export function zoneView(d: GardenData, z: Zone): ZoneView {
  const base = { id: z.id, name: z.name, kind: z.type };
  if (d.state?.faults.includes(z.id)) return { ...base, state: 'fault', label: t('Not responding · tap') };
  const run = ACTIVE(d).find((a) => a.zoneId === z.id);
  if (run) {
    const left = Math.max(0, (run.endsAt - d.now) / MIN);
    return { ...base, state: 'watering', label: t('{dur} left', { dur: minutes(left) }), progress: Math.round(run.progress * 100) };
  }
  const q = QUEUE(d).find((x) => x.zoneId === z.id);
  if (q) return { ...base, state: 'queued', label: `${waitShort(q.waitReason)} · ${minutes(q.durationMin)}` };
  if (z.snoozeUntil && Number(z.snoozeUntil) > d.now) return { ...base, state: 'paused', label: t('Paused until {time}', { time: whenShort(Number(z.snoozeUntil), d.now) }) };
  if (!z.enabled) return { ...base, state: 'off', label: t('Off · not scheduled') };
  const next = nextFor(d, z.id);
  const last = d.lastRuns?.zones[z.id];
  if (next && (next.u.willSkip || (next.u.maybeSkip?.length ?? 0) > 0)) {
    return { ...base, state: 'skip', label: `${next.u.willSkip ? t('Will skip') : t('May skip')} · ${whenShort(next.u.ts, d.now)}` };
  }
  if (last && last >= dayStart(d.now) && (!next || dayStart(next.u.ts) > dayStart(d.now))) {
    return { ...base, state: 'done', label: t('Done {time}', { time: hhmm(last) }) };
  }
  if (next) return { ...base, state: 'next', label: `${whenShort(next.u.ts, d.now)} · ${minutes(next.z.minutes)}` };
  return { ...base, state: 'next', label: t('Manual only') };
}

/** Zones by group (in the configured order), then the ones in no group. */
export function zoneSections(d: GardenData): ZoneSectionView[] {
  const byId = new Map(d.zones.map((z) => [z.id, z]));
  const seen = new Set<string>();
  const out: ZoneSectionView[] = [];
  for (const g of d.groups) {
    const zs = g.zoneIds.map((id) => byId.get(id)).filter((z): z is Zone => !!z);
    zs.forEach((z) => seen.add(z.id));
    if (zs.length) out.push({ id: g.id, name: g.name, zones: zs.map((z) => zoneView(d, z)) });
  }
  const rest = d.zones.filter((z) => !seen.has(z.id));
  if (rest.length) out.push({ id: '_ungrouped', name: t('Ungrouped'), zones: rest.map((z) => zoneView(d, z)) });
  return out;
}

// ---- groups --------------------------------------------------------------------------

function modeWord(g: Group): string {
  return g.mode === 'sequential' ? t('Sequential') : g.mode === 'parallel_limit' ? t('{n} at a time', { n: g.parallelLimit }) : t('Parallel');
}

function groupKind(d: GardenData, g: Group): string {
  const counts = new Map<string, number>();
  for (const id of g.zoneIds) {
    const z = d.zones.find((x) => x.id === id);
    if (z) counts.set(z.type, (counts.get(z.type) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'sprinkler';
}

export function groupView(d: GardenData, g: Group): GroupView {
  const zones = g.zoneIds.map((id) => d.zones.find((z) => z.id === id)).filter((z): z is Zone => !!z);
  const on = zones.filter((z) => z.enabled);
  const schedules = (g.schedules ?? []).filter((s) => s.enabled).length;
  const meta = [
    modeWord(g),
    on.length === zones.length ? t('{n} zones', { n: zones.length }) : t('{on} of {n} zones', { on: on.length, n: zones.length }),
    schedules ? t('{count} schedules', { count: schedules }) : t('no schedules'),
  ].join(' · ');
  const zv = zones.map((z) => zoneView(d, z));
  const segments: Segment[] = zv.map((z) => ({ state: z.state, label: z.name, active: z.state === 'watering' }));
  const base = { id: g.id, name: g.name, kind: groupKind(d, g), mode: g.mode, meta, segments, paused: false };
  const active = ACTIVE(d).filter((a) => a.groupId === g.id);
  const queued = QUEUE(d).filter((q) => q.groupId === g.id);
  const paused = !!g.snoozeUntil && Number(g.snoozeUntil) > d.now;

  if (active.length || queued.length) {
    const ends = Math.max(...active.map((a) => a.endsAt), d.now) + (g.mode === 'sequential' ? queued.reduce((a, q) => a + q.durationMin * MIN, 0) : 0);
    const first = active[0];
    const idx = first ? on.findIndex((z) => z.id === first.zoneId) + 1 : 0;
    const nextQ = queued[0];
    return {
      ...base,
      paused,
      state: active.length ? 'watering' : 'queued',
      word: active.length ? t('Watering') : t('Queued'),
      when: t('until {time}', { time: hhmm(ends) }),
      headline: first
        ? active.length > 1
          ? t('{n} zones · {dur} left', { n: active.length, dur: minutes(Math.max(...active.map((a) => (a.endsAt - d.now) / MIN))) })
          : t('{zone} · {dur} left', { zone: first.zoneName, dur: minutes((first.endsAt - d.now) / MIN) })
        : t('Waiting: {reason}', { reason: queued[0]?.waitReason ?? '' }),
      detail:
        g.mode === 'sequential' && first
          ? nextQ
            ? t('Zone {i} of {n} · then {zone}, {dur}', { i: Math.max(1, idx), n: on.length, zone: nextQ.zoneName, dur: minutes(nextQ.durationMin) })
            : t('Zone {i} of {n} · the last one', { i: Math.max(1, idx), n: on.length })
          : queued.length
            ? t('{n} more waiting', { n: queued.length })
            : undefined,
      detailTone: null,
      primary: 'stop',
    };
  }
  if (paused) {
    return {
      ...base,
      paused: true,
      state: 'paused',
      word: t('Paused'),
      when: t('until {time}', { time: when(Number(g.snoozeUntil), d.now) }),
      headline: t('Automatic runs are paused'),
      detail: t('Manual runs still work'),
      primary: on.length ? 'run' : 'none',
    };
  }
  if (!g.enabled || !on.length) {
    return {
      ...base,
      state: 'off',
      word: t('Off'),
      headline: on.length ? t('Group is off') : t('Nothing to run'),
      detail: on.length ? t('Turn it on in the group settings') : t('All {n} zones are switched off', { n: zones.length }),
      primary: on.length ? 'run' : 'none',
    };
  }
  const next = d.upcoming.find((u) => u.groupId === g.id && (u.kind ?? 'group') === 'group' && u.ts > d.now);
  if (!schedules || !next) {
    const last = d.lastRuns?.groups[g.id];
    return {
      ...base,
      state: schedules ? 'next' : 'off',
      word: schedules ? t('Next run') : t('Schedules off'),
      when: last ? t('last {when}', { when: ago(last, d.now) }) : undefined,
      headline: schedules ? t('Nothing in the next 7 days') : t('No schedules'),
      detail: t('Manual runs still work'),
      primary: 'run',
    };
  }
  const dur = next.durationMin ?? next.zones.reduce((a, z) => a + z.minutes, 0);
  const span = `${dayWord(next.ts, d.now)} ${hhmm(next.ts)} → ${hhmm(next.ts + dur * MIN)}`;
  const how =
    g.mode === 'sequential'
      ? t('{n} zones one by one · {dur}', { n: next.zones.length, dur: minutes(dur) })
      : t('{n} zones at once · {dur}', { n: next.zones.length, dur: minutes(dur) });
  if (next.willSkip || (next.maybeSkip?.length ?? 0) > 0) {
    return {
      ...base,
      state: 'skip',
      word: next.willSkip ? t('Will skip') : t('May skip'),
      when: when(next.ts, d.now),
      headline: span,
      detail: (next.willSkip ? next.skipReasons?.[0] : next.maybeSkip?.[0]) ?? how,
      detailTone: 'warn',
      primary: 'run',
    };
  }
  const last = d.lastRuns?.groups[g.id];
  if (last && last >= dayStart(d.now) && dayStart(next.ts) > dayStart(d.now)) {
    return { ...base, state: 'done', word: t('Done today'), when: hhmm(last), headline: t('Next: {when}', { when: when(next.ts, d.now) }), detail: how, primary: 'run' };
  }
  return { ...base, state: 'next', word: t('Next run'), when: inTime(next.ts, d.now), headline: span, detail: how, primary: 'run' };
}

// ---- sources -------------------------------------------------------------------------

export function sourceView(d: GardenData, s: SourceLive): SourceView {
  const kind = s.level ? 'tank' : s.pump ? 'pump' : 'mains';
  const feeds = s.groups.length ? t('feeds {list}', { list: s.groups.join(', ') }) : t('no groups use it');
  const meta = `${s.level ? t('Barrel · {n} L', { n: num(s.level.capacityL) }) : s.pump ? t('Pump') : t('Mains')} · ${feeds}`;
  const stats: StatItem[] = [];
  if (s.flowLpm != null) stats.push({ label: t('Flow'), value: t('{n} l/min', { n: num(s.flowLpm) }) });
  stats.push({ label: t('Water today'), value: liters(s.litersToday) });
  stats.push({ label: t('Energy today'), value: t('{n} kWh', { n: num(s.kwhToday, 1) }) });
  if (s.level?.refillLpm) stats.splice(0, stats.length === 3 ? 1 : 0, { label: t('Refill'), value: t('+{n} l/min', { n: num(s.level.refillLpm) }) });

  const offline = s.pump?.state === 'unavailable';
  let state: GardenState = 'next';
  let word = t('Idle');
  let whenTxt: string | undefined;
  if (offline) {
    state = 'fault';
    word = t('Pump offline');
    whenTxt = s.pump?.since ? t('since {time}', { time: when(s.pump.since, d.now) }) : undefined;
  } else if (s.pump?.state === 'on') {
    state = 'watering';
    word = t('Running');
    whenTxt = s.pump.since ? t('since {time}', { time: hhmm(s.pump.since) }) : undefined;
  } else if (s.level?.pct != null && s.level.blockBelowPct != null && s.level.pct < s.level.blockBelowPct) {
    state = 'fault';
    word = t('Too low to water');
  } else if (s.level?.pct != null && s.level.lowReservePct != null && s.level.pct < s.level.lowReservePct) {
    state = 'skip';
    word = t('Low reserve');
  } else if (s.level) {
    state = 'done';
    word = t('Enough water');
  }

  const view: SourceView = { id: s.id, name: s.name, kind, meta, state, word, when: whenTxt, stats };
  if (s.level && s.level.pct != null) {
    view.metric = { value: num(s.level.liters ?? 0), unit: 'L', aside: t('{pct}% of {cap} L', { pct: s.level.pct, cap: num(s.level.capacityL) }) };
    view.meter = {
      pct: s.level.pct,
      mark: s.level.lowReservePct,
      scale: ['0', s.level.lowReservePct != null ? t('reserve {n}%', { n: s.level.lowReservePct }) : '', t('{n} L', { n: num(s.level.capacityL) })],
    };
  } else if (s.pressure?.bar != null && !offline) {
    const target = s.pressure.target;
    const max = Math.max(4, Math.ceil((target ?? 3) * 1.33));
    view.metric = { value: num(s.pressure.bar, 1), unit: 'bar', aside: target != null ? t('target {n} bar', { n: num(target, 1) }) : undefined };
    view.meter = { pct: (s.pressure.bar / max) * 100, mark: target != null ? (target / max) * 100 : null, scale: ['0', '', t('{n} bar', { n: max })] };
  } else if (s.flowLpm != null && s.maxFlowLpm && !offline) {
    view.metric = { value: num(s.flowLpm), unit: t('l/min'), aside: t('budget {n} l/min', { n: num(s.maxFlowLpm) }) };
    view.meter = { pct: (s.flowLpm / s.maxFlowLpm) * 100, scale: ['0', '', t('{n} l/min', { n: num(s.maxFlowLpm) })] };
  }
  if (offline) {
    const minsOff = s.pump?.since ? (d.now - s.pump.since) / MIN : null;
    view.problem = {
      headline: minsOff != null ? t('No answer for {dur}', { dur: minutes(minsOff) }) : t('The pump does not answer'),
      detail: s.groups.length ? t('{list} wait until it is back', { list: s.groups.join(', ') }) : t('Check the pump in Home Assistant'),
    };
  }
  return view;
}

// ---- sensors -------------------------------------------------------------------------

function readingItems(s: SensorLive): StatItem[] {
  const r = s.readings;
  const out: StatItem[] = [];
  if (r.temperature != null) out.push({ label: t('Soil temp'), value: `${num(r.temperature, 1)} °C` });
  if (r.illuminance != null) out.push({ label: t('Light'), value: r.illuminance >= 1000 ? `${num(r.illuminance / 1000, 1)}k lx` : `${num(r.illuminance)} lx` });
  if (r.conductivity != null) {
    const low = r.conductivity < 350;
    out.push({ label: t('Fertility'), value: `${num(r.conductivity)} µS/cm`, note: low ? t('low') : t('good'), warn: low });
  }
  if (r.battery != null) {
    const low = r.battery < 20;
    out.push({ label: t('Battery'), value: `${num(r.battery)}%`, note: low ? t('replace soon') : undefined, warn: low });
  }
  return out;
}

export function sensorView(d: GardenData, s: SensorLive): SensorView {
  const readings = readingItems(s);
  if (s.kind === 'rain') {
    const tonight = d.weather?.forecast?.[1]?.precipitationProbability ?? null;
    const strip = s.history.map((v) => v === 1);
    return s.wet
      ? {
          id: s.id,
          name: s.name,
          kind: 'rain',
          meta: t('Rain sensor · all zones'),
          state: 'skip',
          word: t('Wet'),
          when: s.updatedTs ? t('since {time}', { time: when(s.updatedTs, d.now) }) : undefined,
          headline: t('Rain detected — schedules wait'),
          detail: t('Watering resumes after the dry-out window'),
          detailTone: 'warn',
          strip,
          readings,
        }
      : {
          id: s.id,
          name: s.name,
          kind: 'rain',
          meta: t('Rain sensor · all zones'),
          state: 'done',
          word: t('Dry'),
          when: s.updatedTs ? t('wet until {time}', { time: when(s.updatedTs, d.now) }) : undefined,
          headline: tonight != null ? t('No rain now · {n}% tomorrow', { n: tonight }) : t('No rain now'),
          detail: undefined,
          strip,
          readings,
        };
  }
  const meta = `${s.kind === 'plant' ? t('Plant sensor') : t('Soil sensor')}${s.target ? ` · ${s.target}` : ''}`;
  const stale = s.available && s.staleAfterHours && s.updatedTs && d.now - s.updatedTs > s.staleAfterHours * HOUR;
  if (!s.available || stale || s.moisture == null) {
    const hours = s.updatedTs ? Math.max(1, Math.round((d.now - s.updatedTs) / HOUR)) : null;
    return {
      id: s.id,
      name: s.name,
      kind: s.kind,
      meta,
      state: 'off',
      word: t('No data'),
      when: s.updatedTs ? t('last {time}', { time: when(s.updatedTs, d.now) }) : undefined,
      headline: hours ? t('No readings for {n} h', { n: hours }) : t('No readings yet'),
      detail: s.target ? t('Triggers ignore stale data — {target} waters by schedule', { target: s.target }) : t('Triggers ignore stale data'),
      readings,
    };
  }
  const m = s.moisture;
  let state: GardenState = 'done';
  let word = t('Moist enough');
  let detail = s.startBelowPct != null && s.target ? t('Below {n}% it waters {target}', { n: s.startBelowPct, target: s.target }) : undefined;
  let tone: 'warn' | null = null;
  if (s.startBelowPct != null && m < s.startBelowPct) {
    state = 'skip';
    word = t('Dry · wants water');
    tone = 'warn';
    detail = s.lastTriggerTs ? t('Trigger fired at {time}', { time: when(s.lastTriggerTs, d.now) }) : detail;
  } else if (s.blockAbovePct != null && m > s.blockAbovePct) {
    state = 'skip';
    word = t('Too wet');
    tone = 'warn';
    detail = s.target ? t('Blocks scheduled runs of {target}', { target: s.target }) : t('Blocks scheduled runs');
  }
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    meta,
    state,
    word,
    when: s.updatedTs ? ago(s.updatedTs, d.now) : undefined,
    moisture: { value: Math.round(m), trigger: s.startBelowPct, wet: s.blockAbovePct },
    detail,
    detailTone: tone,
    spark: s.history,
    readings,
  };
}

/** Sensors that need you come first: dry, too wet, offline; then the calm ones. */
export function sensorViews(d: GardenData): SensorView[] {
  const rank = (v: SensorView) => (v.state === 'skip' ? 0 : v.state === 'off' ? 1 : v.kind === 'rain' ? 3 : 2);
  return d.sensors.map((s) => sensorView(d, s)).sort((a, b) => rank(a) - rank(b));
}

// ---- findings ------------------------------------------------------------------------

export function findingView(f: Finding, i: number, now: number): FindingView {
  const p = f.params;
  const key = `${f.code}_${i}`;
  switch (f.code) {
    case 'pump_offline':
      return {
        key,
        state: 'fault',
        icon: 'offline',
        title: t('{source}: the pump is offline', { source: String(p.source) }),
        sub: p.groups ? t('{list} wait until it is back', { list: String(p.groups) }) : undefined,
        action: p.since ? t('since {time}', { time: when(Number(p.since), now) }) : undefined,
      };
    case 'zone_fault':
      return { key, state: 'fault', icon: 'warn', title: t('{zone}: the valve does not respond', { zone: String(p.zone) }), action: t('Open the zone to clear it') };
    case 'ha_disconnected':
      return { key, state: 'fault', icon: 'offline', title: t('Home Assistant is not connected'), sub: t('Nothing can be switched until it is back') };
    case 'source_low':
      return { key, state: 'skip', icon: 'warn', title: t('{source} is low · {pct}%', { source: String(p.source), pct: Number(p.pct) }) };
    case 'battery_low':
      return { key, state: 'skip', icon: 'battery', title: t('{sensor} · battery {pct}%', { sensor: String(p.sensor), pct: Number(p.pct) }), action: t('Replace soon') };
    case 'sensor_offline':
      return { key, state: 'off', icon: 'offline', title: t('{sensor} · no data', { sensor: String(p.sensor) }), sub: t('Triggers ignore it until it reports again') };
    case 'sensor_stale':
      return { key, state: 'off', icon: 'offline', title: t('{sensor} · no data for {n} h', { sensor: String(p.sensor), n: Number(p.hours) }), sub: t('Triggers ignore it until it reports again') };
    case 'mqtt_down':
      return { key, state: 'skip', icon: 'offline', title: t('MQTT is not connected'), sub: t('The Lovelace cards cannot update') };
    case 'weather_saved':
      return {
        key,
        state: 'done',
        icon: 'rain',
        title: t('Weather and soil saved ≈ {n}', { n: liters(Number(p.liters)) }),
        sub: t('{count} runs skipped for rain, wet soil or a run condition', { count: Number(p.runs) }),
      };
    case 'flow_deviation':
      return { key, state: 'skip', icon: 'warn', title: t('Water flow differs from what the zones should use'), sub: String(p.detail), action: f.ts ? dateLong(f.ts) : undefined };
    case 'idle_flow':
      return { key, state: 'skip', icon: 'warn', title: t('Water flowed with every zone closed'), sub: String(p.detail), action: f.ts ? dateLong(f.ts) : undefined };
    case 'soil_triggers':
      return { key, state: 'next', icon: 'idea', title: t('Soil sensors started {count} runs', { count: Number(p.count) }), sub: t('Watering when the soil asks, not only by the clock') };
    case 'top_consumer':
      return { key, state: 'next', icon: 'idea', title: t('{group} takes {pct}% of the water', { group: String(p.group), pct: Number(p.pct) }), sub: t('The first place to look when the bill is high') };
    default:
      return { key, state: 'next', icon: 'idea', title: f.code };
  }
}

// ---- status hero ---------------------------------------------------------------------

export function statusView(d: GardenData): StatusView {
  const active = ACTIVE(d);
  const queue = QUEUE(d);
  const anySchedules = d.groups.some((g) => g.enabled && (g.schedules ?? []).some((s) => s.enabled)) || d.zones.some((z) => (z.schedules ?? []).some((s) => s.enabled));
  const paused = !!d.state?.snoozeUntil && d.state.snoozeUntil > d.now;
  const mode = paused
    ? { state: 'paused' as const, label: t('Paused until {time}', { time: when(d.state!.snoozeUntil!, d.now) }) }
    : !anySchedules
      ? { state: 'off' as const, label: t('Season off') }
      : { state: 'done' as const, label: t('Auto · schedules on') };
  const next = d.upcoming.find((u) => u.ts > d.now && !u.willSkip);
  const todayL = d.days.length ? d.days[d.days.length - 1].l : 0;
  const todayM = d.days.length ? d.days[d.days.length - 1].m : 0;
  const w = d.weather;
  const rainTomorrow = w?.forecast?.[1]?.precipitationProbability ?? null;
  const stats: StatItem[] = [
    { label: t('Watering'), value: active.length ? t('{count} zones', { count: active.length }) : '—', note: active.map((a) => a.zoneName).join(', ') || t('idle') },
    { label: t('Queued'), value: queue.length ? t('{count} zones', { count: queue.length }) : '—', note: queue.map((q) => q.zoneName).join(', ') || t('queue is empty') },
    { label: t('Today'), value: liters(todayL), note: t('{dur} of watering', { dur: minutes(todayM) }) },
    {
      label: t('Next start'),
      value: next ? when(next.ts, d.now) : '—',
      note: next ? `${next.groupName || t('One-off watering')} · ${t('{n} zones', { n: next.zones.length })}` : t('nothing planned'),
    },
  ];
  if (w?.temperature != null) {
    stats.push({
      label: t('Weather'),
      value: `${num(w.temperature)}°`,
      note: rainTomorrow != null ? t('Rain {n}% tomorrow', { n: rainTomorrow }) : w.condition ? t(w.condition) : undefined,
    });
  }

  let headline: string;
  let sub: string;
  let run: Segment[] | undefined;
  if (active.length) {
    const groupId = active[0].groupId;
    const g = d.groups.find((x) => x.id === groupId);
    headline = g ? t('Watering {name}', { name: g.name }) : t('Watering {name}', { name: active.map((a) => a.zoneName).join(', ') });
    const first = active[0];
    if (g) {
      const gv = groupView(d, g);
      sub = [gv.headline, gv.detail, gv.when].filter(Boolean).join(' · ');
      run = g.zoneIds
        .map((id) => d.zones.find((z) => z.id === id))
        .filter((z): z is Zone => !!z && z.enabled)
        .map((z) => {
          const v = zoneView(d, z);
          return { state: v.state, label: v.name, active: v.state === 'watering' };
        });
    } else {
      sub = t('{zone} · {dur} left', { zone: first.zoneName, dur: minutes((first.endsAt - d.now) / MIN) });
    }
  } else if (queue.length) {
    headline = t('Waiting to water');
    sub = queue.map((q) => `${q.zoneName}: ${q.waitReason}`).join(' · ');
  } else if (!anySchedules) {
    headline = t('Watering season is off');
    sub = t('No group has a schedule on. Manual runs still work.');
  } else {
    headline = t('Nothing is watering');
    sub = next
      ? t('Next: {name} at {time} · {n} zones · {dur}', {
          name: next.groupName || t('One-off watering'),
          time: when(next.ts, d.now),
          n: next.zones.length,
          dur: minutes(next.durationMin ?? next.zones.reduce((a, z) => a + z.minutes, 0)),
        })
      : t('Nothing scheduled in the next 7 days.');
  }
  const att = d.attention.filter((f) => f.severity === 'err' || f.severity === 'warn');
  const top = att[0] ? findingView(att[0], 0, d.now) : null;
  return {
    kicker: `${dateLong(d.now)} · ${hhmm(d.now)}`,
    mode,
    headline,
    sub,
    run,
    attention: top
      ? { title: top.title, sub: att.length > 1 ? t('{sub} · and {n} more', { sub: top.sub ?? '', n: att.length - 1 }) : top.sub ?? '', count: att.length }
      : undefined,
    stats,
    canStop: active.length > 0 || queue.length > 0,
    paused,
    seasonOff: !anySchedules && !paused,
  };
}

// ---- next 7 days ---------------------------------------------------------------------

export function weatherDays(d: GardenData): WeatherDayView[] {
  const f = d.weather?.forecast ?? [];
  return f.slice(0, 7).map((x, i) => ({
    day: i === 0 ? t('Today') : weekday(d.now + i * 86_400_000),
    temp: x.tempMaxC != null ? `${Math.round(x.tempMaxC)}°` : '—',
    rain: x.precipitationProbability != null ? `${x.precipitationProbability}%` : '',
    wet: (x.precipitationProbability ?? 0) >= 50,
  }));
}

export function upcomingViews(d: GardenData, limit = 6): UpcomingView[] {
  return d.upcoming
    .filter((u) => u.ts > d.now)
    .slice(0, limit)
    .map((u, i) => {
      const once = u.kind === 'once';
      const paused = once ? !!u.paused : u.snoozeUntil != null && u.snoozeUntil > d.now;
      const dur = u.durationMin ?? u.zones.reduce((a, z) => a + z.minutes, 0);
      const g = d.groups.find((x) => x.id === u.groupId);
      const how =
        u.kind === 'zone'
          ? t('zone schedule')
          : g?.mode === 'sequential'
            ? t('{n} zones one by one', { n: u.zones.length })
            : t('{n} zones at once', { n: u.zones.length });
      const state: GardenState = paused ? 'paused' : u.willSkip || (u.maybeSkip?.length ?? 0) > 0 ? 'skip' : 'next';
      const word = paused ? t('Paused') : u.willSkip ? t('Will skip') : (u.maybeSkip?.length ?? 0) > 0 ? t('May skip') : t('Planned');
      const why = paused || state === 'skip' ? ((u.willSkip ? u.skipReasons?.[0] : u.maybeSkip?.[0]) ?? minutes(dur)) : minutes(dur);
      return {
        key: `${u.groupId}_${u.ts}_${i}`,
        day: dayWord(u.ts, d.now),
        time: hhmm(u.ts),
        title: once ? u.groupName || t('One-off watering') : u.groupName,
        detail: u.zones.length <= 3 ? u.zones.map((z) => z.name).join(', ') : how,
        state,
        word,
        why: why.length > 28 ? `${why.slice(0, 27)}…` : why,
      };
    });
}

// ---- today ---------------------------------------------------------------------------

export function timelineLanes(d: GardenData): TimelineLaneView[] {
  const from = dayStart(d.now);
  const to = from + 86_400_000;
  const lanes = new Map<string, TimelineLaneView>();
  const lane = (key: string, name: string, sub: string) => {
    if (!lanes.has(key)) lanes.set(key, { key, name, sub, bars: [] });
    return lanes.get(key)!;
  };
  const sub = (g?: Group) => (g ? `${modeWord(g)} · ${t('{n} zones', { n: g.zoneIds.length })}` : t('zone schedules'));
  for (const g of d.groups) lane(g.id, g.name, sub(g));
  for (const r of d.runsToday) {
    if (r.category === 'tail' || !r.endTs) continue;
    const g = d.groups.find((x) => x.id === r.groupId);
    const z = d.zones.find((x) => x.id === r.zoneId);
    lane(r.groupId ?? '_zones', g?.name ?? t('Zones'), sub(g)).bars.push({
      start: Number(r.startTs),
      end: Number(r.endTs),
      state: 'done',
      label: z?.name,
      title: `${z?.name ?? ''} ${hhmm(Number(r.startTs))}–${hhmm(Number(r.endTs))} · ${t('Done')}`,
    });
  }
  for (const a of ACTIVE(d)) {
    const g = d.groups.find((x) => x.id === a.groupId);
    lane(a.groupId ?? '_zones', g?.name ?? t('Zones'), sub(g)).bars.push({
      start: a.startTs,
      end: a.endsAt,
      state: 'watering',
      label: a.zoneName,
      title: `${a.zoneName} ${hhmm(a.startTs)}–${hhmm(a.endsAt)} · ${t('Watering')}`,
    });
  }
  const activeIds = new Set(ACTIVE(d).map((a) => a.zoneId));
  const queuedIds = new Set(QUEUE(d).map((q) => q.zoneId));
  for (const s of d.plan?.segments ?? []) {
    if (s.end < from || s.start > to || activeIds.has(s.zoneId)) continue;
    const g = d.groups.find((x) => x.id === s.groupId);
    const state: GardenState = queuedIds.has(s.zoneId) ? 'queued' : s.skip ? 'skip' : 'next';
    lane(s.groupId ?? (s.kind === 'once' ? '_once' : '_zones'), s.groupName || t('One-off watering'), sub(g)).bars.push({
      start: s.start,
      end: s.end,
      state,
      label: s.zoneName,
      title: `${s.zoneName} ${hhmm(s.start)}–${hhmm(s.end)}${s.skip ? ` · ${(s.skipWhy ?? []).join('; ')}` : ''}`,
    });
  }
  return [...lanes.values()];
}

// ---- charts --------------------------------------------------------------------------

function pctChange(cur: number, prev: number): string | undefined {
  if (!prev) return undefined;
  const p = Math.round(((cur - prev) / prev) * 100);
  return t('{sign}{n}% vs the period before', { sign: p > 0 ? '+' : p < 0 ? '−' : '±', n: Math.abs(p) });
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function chartViews(d: GardenData, colors: { water: string; energy: string; time: string }, n = 7): ChartView[] {
  const days = d.days.slice(-n);
  const prev = d.days.slice(-2 * n, -n);
  const label = (s: DayStat, i: number) =>
    i === days.length - 1 ? (n <= 7 ? t('Today') : String(new Date(Date.parse(`${s.d}T12:00:00`)).getDate())) : n <= 7 ? weekday(Date.parse(`${s.d}T12:00:00`)) : String(new Date(Date.parse(`${s.d}T12:00:00`)).getDate());
  const longDay = (s: DayStat) => dateLong(Date.parse(`${s.d}T12:00:00`));
  const period = n === 7 ? t('Last 7 days') : t('Last {n} days', { n });
  const make = (
    key: 'water' | 'energy' | 'time',
    title: string,
    pick: (s: DayStat) => number,
    fmt: (v: number) => string,
    totalFmt: (v: number) => { total: string; unit?: string },
    color: string,
    note: string,
  ): ChartView => {
    const vals = days.map(pick);
    const total = vals.reduce((a, b) => a + b, 0);
    const done = vals.slice(0, -1);
    const avg = done.length ? done.reduce((a, b) => a + b, 0) / done.length : 0;
    const peakI = vals.indexOf(Math.max(...vals));
    const tot = totalFmt(total);
    if (!total) {
      return {
        key,
        icon: key,
        title,
        period,
        color,
        kind: 'empty',
        total: tot.total,
        unit: tot.unit,
        hint: '',
        empty: { title: t('No watering in this period'), text: t('The chart fills in with the first run.') },
        stats: [
          { label: t('Daily average'), value: '—' },
          { label: t('Peak'), value: '—' },
          { label: t('Lowest'), value: '—' },
        ],
      };
    }
    const lowI = done.length ? done.indexOf(Math.min(...done)) : 0;
    return {
      key,
      icon: key,
      title,
      period: `${period} · ${note}`,
      color,
      kind: 'bars',
      total: tot.total,
      unit: tot.unit,
      delta: pctChange(total, prev.map(pick).reduce((a, b) => a + b, 0)),
      hint: t('Tap a bar to see the day'),
      bars: days.map((s, i) => ({ label: label(s, i), value: pick(s), aria: `${longDay(s)}: ${fmt(pick(s))}`, partial: i === days.length - 1 })),
      axisMax: niceMax(Math.max(...vals)),
      axisLabel: fmt(niceMax(Math.max(...vals))),
      average: avg,
      averageLabel: t('avg {v}', { v: fmt(avg) }),
      readout: (i) => `${longDay(days[i])}${i === days.length - 1 ? ` · ${t('so far')}` : ''} · ${fmt(vals[i])}`,
      stats: [
        { label: t('Daily average'), value: fmt(avg) },
        { label: t('Peak · {day}', { day: label(days[peakI], peakI) }), value: fmt(vals[peakI]) },
        key === 'energy' && total > 0
          ? { label: t('Per 1 000 L'), value: t('{n} kWh', { n: num((total / Math.max(1, days.reduce((a, s) => a + s.l, 0))) * 1000, 2) }) }
          : { label: t('Lowest · {day}', { day: label(days[lowI], lowI) }), value: fmt(done[lowI] ?? 0) },
      ],
    };
  };
  return [
    make('water', t('Water'), (s) => s.l, (v) => liters(v), (v) => ({ total: num(Math.round(v)), unit: 'L' }), colors.water, t('calculated from flow rates')),
    make('energy', t('Pump energy'), (s) => s.k, (v) => t('{n} kWh', { n: num(v, 1) }), (v) => ({ total: num(v, 1), unit: 'kWh' }), colors.energy, t('measured during runs')),
    make('time', t('Watering time'), (s) => s.m, (v) => minutes(v), (v) => ({ total: minutes(v) }), colors.time, t('all zones')),
  ];
}

/** A line chart of a sensor's history (pressure, flow) with an optional target band. */
export function lineChartView(opts: {
  key: string;
  title: string;
  period: string;
  unit: string;
  color: string;
  points: { ts: number; v: number }[];
  hours: number;
  now: number;
  target?: number | null;
}): ChartView {
  const { points, hours, now } = opts;
  const buckets = hours * 4;
  const step = (hours * HOUR) / buckets;
  const series: (number | null)[] = [];
  let idx = 0;
  let last: number | null = null;
  const sorted = [...points].sort((a, b) => a.ts - b.ts);
  for (let i = 0; i <= buckets; i++) {
    const end = now - (buckets - i) * step;
    while (idx < sorted.length && sorted[idx].ts <= end) last = sorted[idx++].v;
    series.push(last);
  }
  const vals = series.filter((v): v is number => v != null);
  if (!vals.length) {
    return { key: opts.key, icon: 'flow', title: opts.title, period: opts.period, color: opts.color, kind: 'empty', total: '—', unit: opts.unit, hint: '', empty: { title: t('No data yet') }, stats: [] };
  }
  const max = Math.max(opts.target ? opts.target * 1.33 : 0, ...vals) * 1.1;
  const timeOf = (i: number) => hhmm(now - (buckets - i) * step);
  const working = vals.filter((v) => v > (opts.target ?? 0) * 0.6);
  const ticks = Array.from({ length: 7 }, (_, i) => hhmm(now - hours * HOUR + (i * hours * HOUR) / 6).slice(0, 2));
  return {
    key: opts.key,
    icon: 'flow',
    title: opts.title,
    period: opts.period,
    color: opts.color,
    kind: 'line',
    total: num(vals[vals.length - 1], 1),
    unit: opts.unit,
    delta: t('now'),
    hint: t('Touch the line to read a value'),
    points: series.map((v, i) => ({ value: v, aria: `${timeOf(i)}: ${v == null ? '—' : `${num(v, 1)} ${opts.unit}`}` })),
    lineMax: max,
    band: opts.target ? [opts.target * 0.85, opts.target * 1.07] : null,
    bandLabel: opts.target ? t('target {n} {unit}', { n: num(opts.target, 1), unit: opts.unit }) : undefined,
    ticks,
    readout: (i) => `${timeOf(i)} · ${series[i] == null ? '—' : `${num(series[i]!, 1)} ${opts.unit}`}`,
    stats: [
      { label: t('Average when running'), value: working.length ? `${num(working.reduce((a, b) => a + b, 0) / working.length, 1)} ${opts.unit}` : '—' },
      { label: t('Max'), value: `${num(Math.max(...vals), 1)} ${opts.unit}` },
      { label: t('Min'), value: `${num(Math.min(...vals), 1)} ${opts.unit}` },
    ],
  };
}

export function usageRows(d: GardenData): UsageRowView[] {
  const usage = d.insights?.usage ?? [];
  const total = d.insights?.totalLiters ?? 0;
  const top = Math.max(1, ...usage.map((u) => u.liters));
  return usage.map((u) => ({
    key: u.groupId,
    name: u.name,
    value: u.liters ? liters(u.liters) : '—',
    share: u.liters && total ? `${Math.round((u.liters / total) * 100)}%` : '',
    pct: (u.liters / top) * 100,
    note: u.liters ? t('{count} runs', { count: u.runs }) : t('not watered this week'),
  }));
}

// ---- badges and quick run ------------------------------------------------------------

export function badgeViews(d: GardenData): BadgeView[] {
  const out: BadgeView[] = [];
  const active = ACTIVE(d);
  if (active.length) {
    const a = active[0];
    out.push({ key: 'watering', state: 'watering', label: t('Watering'), value: `${a.zoneName} · ${minutes((a.endsAt - d.now) / MIN)}` });
  }
  const att = d.attention.filter((f) => f.severity === 'err' || f.severity === 'warn');
  if (att.length) {
    const f = findingView(att[0], 0, d.now);
    out.push({ key: 'attention', state: att[0].severity === 'err' ? 'fault' : 'skip', label: att.length > 1 ? t('Needs attention · {n}', { n: att.length }) : t('Needs attention'), value: f.title });
  }
  const next = d.upcoming.find((u) => u.ts > d.now && !u.willSkip);
  if (next) out.push({ key: 'next', state: 'next', label: t('Next'), value: `${next.groupName || t('One-off watering')} · ${when(next.ts, d.now)}` });
  const rain = d.sensors.find((s) => s.kind === 'rain');
  if (rain) out.push({ key: 'rain', state: rain.wet ? 'skip' : 'done', label: t('Rain sensor'), value: rain.wet ? t('Wet') : t('Dry') });
  for (const s of d.sources) {
    if (s.level?.pct != null) out.push({ key: `lvl_${s.id}`, state: s.level.lowReservePct != null && s.level.pct < s.level.lowReservePct ? 'skip' : 'done', label: s.name, value: `${s.level.pct}% · ${liters(s.level.liters ?? 0)}` });
    else if (s.pressure?.bar != null && s.pump?.state === 'on') out.push({ key: `p_${s.id}`, state: 'watering', label: s.name, value: `${num(s.pressure.bar, 1)} bar` });
  }
  const today = d.days[d.days.length - 1];
  if (today) out.push({ key: 'today', state: 'next', label: t('Today'), value: `${liters(today.l)} · ${t('{n} kWh', { n: num(today.k, 1) })}` });
  return out;
}

export function quickTargets(d: GardenData): { zones: QuickTarget[]; groups: QuickTarget[] } {
  const srcState = (id: string | null) => d.sources.find((s) => s.id === id);
  const note = (sourceId: string | null): QuickTarget['note'] => {
    const s = srcState(sourceId);
    if (!s) return null;
    if (s.pump?.state === 'unavailable') return { state: 'fault', text: t('{name}: the pump is offline — no water will flow', { name: s.name }) };
    if (s.level?.pct != null && s.level.blockBelowPct != null && s.level.pct < s.level.blockBelowPct) return { state: 'skip', text: t('{name} is almost empty', { name: s.name }) };
    if (s.maxFlowLpm && s.flowLpm != null) return { state: 'done', text: t('{name} has room: {n} of {max} l/min in use', { name: s.name, n: num(s.flowLpm), max: num(s.maxFlowLpm) }) };
    return null;
  };
  const flow = (z: Zone) => (z.flowLpm == null ? null : typeof z.flowLpm === 'number' ? z.flowLpm : (z.flowLpm.min + z.flowLpm.max) / 2);
  // recently watered first: the zones you reach for are the ones you used
  const recent = [...d.zones].sort((a, b) => (d.lastRuns?.zones[b.id] ?? 0) - (d.lastRuns?.zones[a.id] ?? 0) || a.orderIndex - b.orderIndex);
  const zones = recent.map((z) => ({ id: z.id, name: z.name, minutes: Math.round(z.baseDurationMin), flowLpm: flow(z), note: note(z.sourceId) }));
  const groups = d.groups
    .filter((g) => g.zoneIds.some((id) => d.zones.find((z) => z.id === id)?.enabled))
    .map((g) => {
      const zs = g.zoneIds.map((id) => d.zones.find((z) => z.id === id)).filter((z): z is Zone => !!z && z.enabled);
      const f = zs.map(flow).filter((x): x is number => x != null);
      const perZone = Math.round(zs.reduce((a, z) => a + z.baseDurationMin, 0) / Math.max(1, zs.length));
      return {
        id: g.id,
        name: g.name,
        minutes: perZone,
        flowLpm: f.length ? (g.mode === 'sequential' ? f.reduce((a, b) => a + b, 0) / f.length : f.reduce((a, b) => a + b, 0)) : null,
        zoneCount: zs.length,
        sequential: g.mode === 'sequential',
        note: note(zs[0]?.sourceId ?? null),
      };
    });
  return { zones, groups };
}
