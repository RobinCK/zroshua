import { Inject, Injectable } from '@nestjs/common';
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { DATA_SOURCE } from '../db/database.module';
import { JournalEntry, Run, WaterSource } from '../db/entities';
import { ConfigService } from '../config/config.service';
import { EngineService } from '../engine/engine.service';
import { HaService } from '../ha/ha.service';
import { WeatherService } from '../weather/weather.service';

const HOUR = 3_600_000;

export interface SourceLive {
  id: string;
  name: string;
  type: string;
  groups: string[];
  maxFlowLpm: number | null;
  pump: { entity: string; state: 'on' | 'off' | 'unavailable' | 'unknown'; since: number | null } | null;
  flowLpm: number | null;
  pressure: { bar: number | null; target: number | null } | null;
  level: { pct: number | null; liters: number | null; capacityL: number; lowReservePct: number | null; blockBelowPct: number | null; refillLpm: number | null } | null;
  litersToday: number;
  kwhToday: number;
  runningZones: number;
}

export interface SensorLive {
  id: string;
  name: string;
  kind: 'plant' | 'soil' | 'rain';
  /** what it waters or protects: a zone or group name */
  target: string | null;
  available: boolean;
  updatedTs: number | null;
  moisture: number | null;
  startBelowPct: number | null;
  blockAbovePct: number | null;
  staleAfterHours: number | null;
  wet: boolean | null;
  readings: { temperature?: number | null; illuminance?: number | null; conductivity?: number | null; battery?: number | null };
  /** hourly moisture over 24 h (soil) or hourly wet flags (rain); oldest first */
  history: (number | null)[];
  lastTriggerTs: number | null;
}

export interface Finding {
  code: string;
  severity: 'err' | 'warn' | 'off' | 'ok' | 'idea';
  params: Record<string, string | number>;
  ts?: number;
}

const READING_CLASSES = ['temperature', 'illuminance', 'conductivity', 'battery'] as const;

/**
 * What the dashboards need beyond the engine snapshot: live water sources, soil and rain
 * sensors with whatever their device measures, the problems Zroshua cannot fix itself and
 * what the last week says. Serves the add-on panel and the hub entity of the Lovelace card.
 */
@Injectable()
export class OverviewService {
  private runs: Repository<Run>;
  private journal: Repository<JournalEntry>;
  /** sensor history is asked of Home Assistant at most every five minutes */
  private historyCache: { at: number; data: Record<string, { s: string; lu: number }[]> } | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource,
    private readonly ha: HaService,
    private readonly config: ConfigService,
    private readonly engine: EngineService,
    private readonly weatherSvc: WeatherService,
  ) {
    this.runs = ds.getRepository(Run);
    this.journal = ds.getRepository(JournalEntry);
  }

  private dayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private since(entity: string): number | null {
    const st = this.ha.getState(entity);
    return st?.last_changed ? Date.parse(st.last_changed) : null;
  }

  async sources(): Promise<SourceLive[]> {
    const sources = await this.config.sources.find();
    const zones = await this.config.zones.find();
    const groups = await this.config.groups.find({ order: { orderIndex: 'ASC' } });
    const snap = this.engine.snapshot();
    const today = await this.runs.find({ where: { startTs: MoreThanOrEqual(this.dayStart()) } });
    return sources.map((s: WaterSource) => {
      const zoneIds = new Set(zones.filter((z) => z.sourceId === s.id).map((z) => z.id));
      const pumpState = s.pumpEntity ? this.ha.getState(s.pumpEntity)?.state : undefined;
      const lvl = s.capacityL ? this.engine.sourceLevelL(s.id) : null;
      const mine = today.filter((r) => r.sourceId === s.id);
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        groups: groups.filter((g) => g.zoneIds.some((id) => zoneIds.has(id))).map((g) => g.name),
        maxFlowLpm: s.maxFlowLpm,
        pump: s.pumpEntity
          ? {
              entity: s.pumpEntity,
              state: pumpState === 'on' || pumpState === 'off' || pumpState === 'unavailable' ? pumpState : 'unknown',
              since: this.since(s.pumpEntity),
            }
          : null,
        flowLpm: s.flowSensor ? this.ha.numeric(s.flowSensor) : null,
        pressure: s.pressureEntity ? { bar: this.ha.numeric(s.pressureEntity), target: s.pressureTargetBar ?? null } : null,
        level: s.capacityL
          ? {
              pct: lvl !== null ? Math.round((lvl / s.capacityL) * 100) : null,
              liters: lvl !== null ? Math.round(lvl) : null,
              capacityL: s.capacityL,
              lowReservePct: s.lowReservePct,
              blockBelowPct: s.blockBelowPct,
              refillLpm: s.refillLpm,
            }
          : null,
        litersToday: Math.round(mine.reduce((a, r) => a + ((r.litersMin ?? 0) + (r.litersMax ?? 0)) / 2, 0)),
        kwhToday: +mine.reduce((a, r) => a + (r.energyKwh ?? 0), 0).toFixed(2),
        runningZones: snap.active.filter((a) => zoneIds.has(a.zoneId)).length,
      };
    });
  }

  /** Soil probes of the soil triggers and zones, plus the rain sensors, with their device's other readings. */
  async sensors(withHistory = true): Promise<SensorLive[]> {
    const settings = await this.config.getSettings();
    const zones = await this.config.zones.find();
    const groups = await this.config.groups.find();
    const nameOf = (kind: 'zone' | 'group', id: string) =>
      (kind === 'zone' ? zones.find((z) => z.id === id)?.name : groups.find((g) => g.id === id)?.name) ?? null;
    const reg = await this.ha.registry();
    const out: SensorLive[] = [];
    const seen = new Set<string>();
    const lastTrig = await this.journal.find({ where: { code: 'soil_trigger' }, order: { ts: 'DESC' }, take: 50 });

    const siblings = (entity: string) => {
      const dev = reg.entities.get(entity)?.device_id;
      if (!dev) return { name: null as string | null, ids: [] as string[] };
      const ids = [...reg.entities.entries()].filter(([, e]) => e.device_id === dev).map(([id]) => id);
      return { name: reg.devices.get(dev) ?? null, ids };
    };
    const readingsOf = (ids: string[]) => {
      const r: SensorLive['readings'] = {};
      for (const id of ids) {
        const st = this.ha.getState(id);
        const dc = st?.attributes?.device_class;
        if (READING_CLASSES.includes(dc)) r[dc as (typeof READING_CLASSES)[number]] = this.ha.numeric(id);
      }
      return r;
    };

    const soil = [
      ...settings.soilTriggers.map((t) => ({ entity: t.sensor, t })),
      ...zones.filter((z) => z.soilSensor).map((z) => ({ entity: z.soilSensor!, t: null, zone: z.name })),
    ];
    for (const item of soil) {
      if (!item.entity || seen.has(item.entity)) continue;
      seen.add(item.entity);
      const st = this.ha.getState(item.entity);
      const sib = siblings(item.entity);
      const readings = readingsOf(sib.ids.filter((id) => id !== item.entity));
      const t = item.t;
      const trig = lastTrig.find((j) => (j.detail ?? '').includes(item.entity));
      out.push({
        id: item.entity,
        name: sib.name ?? st?.attributes?.friendly_name ?? item.entity,
        kind: readings.illuminance !== undefined || readings.conductivity !== undefined ? 'plant' : 'soil',
        target: t ? nameOf(t.targetKind, t.targetId) : ((item as any).zone ?? null),
        available: this.ha.available(item.entity),
        updatedTs: st?.last_updated ? Date.parse(st.last_updated) : null,
        moisture: this.ha.numeric(item.entity),
        startBelowPct: t?.startBelowPct ?? null,
        blockAbovePct: t?.blockAbovePct ?? null,
        staleAfterHours: t?.staleAfterHours ?? null,
        wet: null,
        readings,
        history: [],
        lastTriggerTs: trig ? Number(trig.ts) : null,
      });
    }
    if (settings.rainSensor.enabled) {
      for (const entity of settings.rainSensor.entities) {
        if (seen.has(entity)) continue;
        seen.add(entity);
        const st = this.ha.getState(entity);
        const sib = siblings(entity);
        out.push({
          id: entity,
          name: sib.name ?? st?.attributes?.friendly_name ?? entity,
          kind: 'rain',
          target: null,
          available: this.ha.available(entity),
          updatedTs: st?.last_changed ? Date.parse(st.last_changed) : null,
          moisture: null,
          startBelowPct: null,
          blockAbovePct: null,
          staleAfterHours: null,
          wet: this.ha.isOn(entity),
          readings: readingsOf(sib.ids.filter((id) => id !== entity)),
          history: [],
          lastTriggerTs: null,
        });
      }
    }

    if (withHistory && out.length) {
      const ids = out.map((s) => s.id);
      const cached = this.historyCache && Date.now() - this.historyCache.at < 5 * 60_000 && ids.every((id) => id in this.historyCache!.data);
      const hist = cached ? this.historyCache!.data : await this.ha.history(ids, 24);
      if (!cached && Object.keys(hist).length) this.historyCache = { at: Date.now(), data: hist };
      const now = Date.now();
      for (const s of out) {
        const pts = (hist[s.id] ?? []).map((p) => ({ v: p.s, t: p.lu * 1000 }));
        // hourly buckets: the last value seen in each hour, carried forward
        const series: (number | null)[] = [];
        let last: number | null = null;
        let idx = 0;
        for (let h = 23; h >= 0; h--) {
          const end = now - h * HOUR;
          while (idx < pts.length && pts[idx].t <= end) {
            const v = s.kind === 'rain' ? (pts[idx].v === 'on' ? 1 : 0) : Number(pts[idx].v);
            last = Number.isFinite(v) ? v : last;
            idx++;
          }
          series.push(last);
        }
        // the live value closes the curve, whatever the cache holds
        if (s.kind !== 'rain' && s.moisture != null) series[series.length - 1] = s.moisture;
        if (s.kind === 'rain' && s.wet != null) series[series.length - 1] = s.wet ? 1 : 0;
        s.history = series;
      }
    }
    return out;
  }

  /** Problems Zroshua cannot fix itself, worst first. */
  async attention(): Promise<Finding[]> {
    const out: Finding[] = [];
    const snap = this.engine.snapshot();
    if (!snap.haConnected) out.push({ code: 'ha_disconnected', severity: 'err', params: {} });
    const zones = await this.config.zones.find();
    for (const id of snap.faults) out.push({ code: 'zone_fault', severity: 'err', params: { zone: zones.find((z) => z.id === id)?.name ?? id } });
    for (const s of await this.sources()) {
      if (s.pump?.state === 'unavailable') {
        const groups = s.groups.join(', ');
        out.push({ code: 'pump_offline', severity: 'err', params: { source: s.name, groups, since: s.pump.since ?? 0 } });
      }
      if (s.level?.pct != null && s.level.lowReservePct != null && s.level.pct < s.level.lowReservePct) {
        out.push({ code: 'source_low', severity: 'warn', params: { source: s.name, pct: s.level.pct } });
      }
    }
    const now = Date.now();
    for (const s of await this.sensors(false)) {
      if (!s.available) out.push({ code: 'sensor_offline', severity: 'off', params: { sensor: s.name, since: s.updatedTs ?? 0 } });
      else if (s.staleAfterHours && s.updatedTs && now - s.updatedTs > s.staleAfterHours * HOUR)
        out.push({ code: 'sensor_stale', severity: 'off', params: { sensor: s.name, hours: Math.round((now - s.updatedTs) / HOUR) } });
      const b = s.readings.battery;
      if (b != null && b < 20) out.push({ code: 'battery_low', severity: 'warn', params: { sensor: s.name, pct: Math.round(b) } });
    }
    const rank = { err: 0, warn: 1, off: 2, ok: 3, idea: 4 } as const;
    return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }

  /** Now and the next seven days, compact (the card's weather strip). */
  async weather() {
    const w = await this.weatherSvc.currentWeather();
    return {
      temp: w.temperature,
      condition: w.condition,
      days: (w.forecast ?? []).slice(0, 7).map((d) => ({ t: d.tempMaxC, p: d.precipitationProbability, mm: d.precipitationMm })),
    };
  }

  /** Litres, minutes and pump energy per calendar day for the last `days` days, oldest first. */
  async daily(days = 14) {
    const start = this.dayStart() - (days - 1) * 24 * HOUR;
    const runs = await this.runs.find({ where: { startTs: MoreThanOrEqual(start) } });
    const out: { d: string; l: number; m: number; k: number }[] = [];
    for (let i = 0; i < days; i++) {
      const from = start + i * 24 * HOUR;
      const to = from + 24 * HOUR;
      const mine = runs.filter((r) => Number(r.startTs) >= from && Number(r.startTs) < to);
      const day = new Date(from);
      out.push({
        d: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
        l: Math.round(mine.filter((r) => r.category !== 'tail').reduce((a, r) => a + ((r.litersMin ?? 0) + (r.litersMax ?? 0)) / 2, 0)),
        m: Math.round(mine.filter((r) => r.category !== 'tail').reduce((a, r) => a + (r.actualMin ?? 0), 0)),
        k: +mine.reduce((a, r) => a + (r.energyKwh ?? 0), 0).toFixed(2),
      });
    }
    return out;
  }

  /** What the last `days` say: water by group, weather savings, flow alerts. */
  async insights(days = 7) {
    const from = Date.now() - days * 24 * HOUR;
    const runs = await this.runs.find({ where: { startTs: MoreThanOrEqual(from) } });
    const groups = await this.config.groups.find({ order: { orderIndex: 'ASC' } });
    const journal = await this.journal.find({ where: { ts: MoreThanOrEqual(from) }, order: { ts: 'DESC' } });
    const liters = (r: Run) => ((r.litersMin ?? 0) + (r.litersMax ?? 0)) / 2;
    const total = runs.filter((r) => r.category !== 'tail').reduce((a, r) => a + liters(r), 0);

    const usage = groups
      .map((g) => {
        const mine = runs.filter((r) => r.groupId === g.id && r.category !== 'tail');
        return { groupId: g.id, name: g.name, liters: Math.round(mine.reduce((a, r) => a + liters(r), 0)), runs: new Set(mine.map((r) => Math.round(Number(r.startTs) / 60_000))).size };
      })
      .sort((a, b) => b.liters - a.liters);

    const findings: Finding[] = [];
    // runs the weather or the soil saved, with the water a run of that group usually takes
    const saveCodes = new Set(['weather', 'rain_sensor', 'soil_wet', 'condition']);
    const skips = journal.filter((j) => j.kind === 'skip' && saveCodes.has(j.code ?? ''));
    if (skips.length) {
      let saved = 0;
      for (const s of skips) {
        const u = usage.find((x) => x.groupId === s.groupId);
        if (u && u.runs) saved += u.liters / u.runs;
      }
      findings.push({ code: 'weather_saved', severity: 'ok', params: { runs: skips.length, liters: Math.round(saved / 10) * 10 } });
    }
    for (const j of journal.filter((x) => x.code === 'flow_deviation').slice(0, 2)) {
      findings.push({ code: 'flow_deviation', severity: 'warn', params: { detail: j.detail ?? '' }, ts: Number(j.ts) });
    }
    for (const j of journal.filter((x) => x.code === 'idle_flow').slice(0, 1)) {
      findings.push({ code: 'idle_flow', severity: 'warn', params: { detail: j.detail ?? '' }, ts: Number(j.ts) });
    }
    const soil = journal.filter((j) => j.code === 'soil_trigger');
    if (soil.length) findings.push({ code: 'soil_triggers', severity: 'idea', params: { count: soil.length } });
    if (usage[0] && total > 0 && usage[0].liters / total > 0.5) {
      findings.push({ code: 'top_consumer', severity: 'idea', params: { group: usage[0].name, pct: Math.round((usage[0].liters / total) * 100) } });
    }
    return { days, totalLiters: Math.round(total), usage, findings };
  }
}
