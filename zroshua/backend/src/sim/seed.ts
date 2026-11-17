import type { DataSource } from 'typeorm';
import { Group, JournalEntry, Run, WaterSource, Zone, type Schedule } from '../db/entities';
import type { ConfigService } from '../config/config.service';
import { PLAN_GROUPS, PLAN_SENSORS, PLAN_ZONES, valveEntity } from './garden-plan';
import type { Scenario } from './garden';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function schedule(id: string, start: string, zones: string[] | null, enabled: boolean, rainProbMax?: number): Schedule {
  return {
    id,
    mode: 'week',
    weekdays: ALL_DAYS,
    starts: [{ start, anchor: 'start' }],
    perDay: {},
    season: null,
    zoneSelection: zones,
    conditions: rainProbMax != null ? [{ id: `${id}_rain`, kind: 'forecast_rain_prob', op: 'lte', value: rainProbMax, action: 'skip' }] : [],
    enabled,
  };
}

/** Zones, groups, sources and settings of the virtual garden, written into an empty database. */
export async function seedConfig(ds: DataSource, config: ConfigService, scenario: Scenario) {
  const zones = ds.getRepository(Zone);
  if ((await zones.count()) > 0) return false;

  await ds.getRepository(WaterSource).save([
    {
      id: 'well',
      name: 'Sirio Well Backyard',
      type: 'well',
      pumpEntity: 'switch.sirio_well_backyard',
      pumpStartDelayS: 2,
      pumpStopDelayS: 2,
      pumpAfterRun: 'off',
      maxFlowLpm: 60,
      energyEntity: 'sensor.sirio_well_backyard_energy',
      energyTail: null,
      dependsOn: null,
      okSensor: null,
      flowSensor: 'sensor.sirio_well_backyard_flow',
      idleFlowAlertLpm: 3,
      exclusiveWithSourceIds: [],
      capacityL: null,
      refillLpm: null,
      levelEntity: null,
      lowReservePct: null,
      blockBelowPct: null,
      flowDeviationPct: null,
      pressureEntity: 'sensor.sirio_well_backyard_pressure',
      pressureTargetBar: 3,
    },
    {
      id: 'barrel',
      name: 'Backyard Barrel',
      type: 'tank',
      pumpEntity: 'switch.sirio_barrel_backyard',
      pumpStartDelayS: 2,
      pumpStopDelayS: 2,
      pumpAfterRun: 'off',
      maxFlowLpm: 40,
      energyEntity: 'sensor.sirio_barrel_backyard_energy',
      energyTail: null,
      dependsOn: null,
      okSensor: null,
      flowSensor: 'sensor.sirio_barrel_backyard_flow',
      idleFlowAlertLpm: null,
      exclusiveWithSourceIds: [],
      capacityL: 3000,
      refillLpm: 4,
      levelEntity: 'sensor.backyard_barrel_level',
      lowReservePct: 20,
      blockBelowPct: 10,
      flowDeviationPct: null,
      pressureEntity: 'sensor.sirio_barrel_backyard_pressure',
      pressureTargetBar: 2.5,
    },
  ]);

  const soilOf = (zoneId: string) => PLAN_SENSORS.find((s) => s.zone === zoneId);
  await zones.save(
    PLAN_ZONES.map((z, i) => ({
      id: z.id,
      name: z.name,
      type: z.type,
      entities: [valveEntity(z.id)],
      sourceId: z.source,
      flowLpm: z.flowLpm,
      baseDurationMin: z.minutes,
      minDurationMin: 0,
      maxRuntimeMin: z.minutes * 2 + 10,
      ignore: {},
      cycleSoak: null,
      svgElementId: null,
      svgElementIds: [],
      soilSensor: soilOf(z.id) ? `sensor.${soilOf(z.id)!.slug}_moisture` : null,
      schedules: [],
      enabled: z.enabled,
      orderIndex: i,
      snoozeUntil: null,
    })),
  );

  const schedulesOn = scenario !== 'season_off';
  await ds.getRepository(Group).save(
    PLAN_GROUPS.map((g, i) => ({
      id: g.id,
      name: g.name,
      zoneIds: g.zones,
      mode: g.mode,
      parallelLimit: 2,
      interZoneDelayS: 5,
      multiplierPct: 100,
      priority: 0,
      schedules: g.starts.map((st, k) =>
        Array.isArray(st)
          ? schedule(`${g.id}_${k}`, st[0], st[1], schedulesOn)
          : schedule(`${g.id}_${k}`, st, null, schedulesOn, g.rainProbMax),
      ),
      enabled: g.enabled,
      snoozeUntil: null,
      orderIndex: i,
    })),
  );

  await config.patchSettings({
    weatherEntity: 'weather.home',
    energyTariffPerKwh: 4.32,
    energyCurrency: '₴',
    maxTotalFlowLpm: 90,
    rainSensor: {
      enabled: true,
      entities: ['binary_sensor.zig_rain_sensor_moisture'],
      quorum: 1,
      dryOutHours: 6,
      onWetDuringRun: 'stop_all',
      linkedZones: null,
    },
    weatherTriggers: { enabled: true, rainProbPct: 80, rainAmountMm: 5, freezeC: 2 },
    soilTriggers: PLAN_SENSORS.map((s) => ({
      id: `soil_${s.slug}`,
      sensor: `sensor.${s.slug}_moisture`,
      targetKind: s.target.kind,
      targetId: s.target.id,
      startBelowPct: s.startBelow,
      runMin: s.target.minutes,
      cooldownHours: 6,
      blockAbovePct: s.blockAbove,
      staleAfterHours: 6,
      enabled: true,
    })),
  });
  return true;
}

/**
 * Two weeks of runs and journal entries, so the statistics, the charts, the usage card and the
 * insights have a real week to describe: daily schedules, a rain skip yesterday evening, a
 * flow deviation and an idle-flow alert.
 */
export async function seedHistory(ds: DataSource) {
  const runs = ds.getRepository(Run);
  if ((await runs.count()) > 0) return;
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const rows: Partial<Run>[] = [];
  const zone = (id: string) => PLAN_ZONES.find((z) => z.id === id)!;
  for (let d = 13; d >= 0; d--) {
    const day = today.getTime() - d * DAY;
    for (const g of PLAN_GROUPS) {
      for (const st of g.starts) {
        const [hhmm, only] = Array.isArray(st) ? st : [st, null];
        const [h, m] = hhmm.split(':').map(Number);
        let t = day + h * HOUR + m * 60_000;
        // the evening lawn run skipped for rain yesterday and three days ago
        if (g.id === 'backyard_lawn' && (d === 1 || d === 3)) continue;
        const zs = g.zones.filter((id) => zone(id).enabled && (!only || only.includes(id)));
        for (const id of zs) {
          const z = zone(id);
          // the temperature scaling of each day: cooler days water less, hot ones more
          const minutes = Math.max(1, Math.round(z.minutes * (0.78 + ((d * 37) % 11) / 25)));
          const end = t + minutes * 60_000;
          if (end > now) continue;
          const kw = z.source === 'well' ? 0.75 : 0.45;
          const share = g.mode === 'parallel' ? zs.length : 1;
          // the front lawn drinks 18% more than its flow rate says: the leak the insights find
          const extra = id === 'lawn_front' && d < 6 ? 1.18 : 1;
          rows.push({
            zoneId: id,
            groupId: g.id,
            sourceId: z.source,
            startTs: t,
            endTs: end,
            plannedMin: minutes,
            actualMin: minutes,
            litersMin: z.flowLpm * minutes * extra * 0.95,
            litersMax: z.flowLpm * minutes * extra * 1.05,
            energyKwh: +((kw * minutes) / 60 / share).toFixed(3),
            stopReason: 'completed',
            manual: false,
            category: 'run',
            triggeredBy: 'schedule',
          });
          if (g.mode === 'sequential') t = end + 5000;
        }
      }
    }
  }
  await runs.save(rows);

  const journal = ds.getRepository(JournalEntry);
  const at = (daysAgo: number, hh: number, mm: number) => today.getTime() - daysAgo * DAY + hh * HOUR + mm * 60_000;
  await journal.save([
    { ts: at(3, 21, 0), kind: 'skip', groupId: 'backyard_lawn', zoneId: null, code: 'weather', detail: 'rain probability 90% ≥ 80%' },
    { ts: at(1, 18, 20), kind: 'info', groupId: null, zoneId: null, code: 'rain_detected', detail: 'sensor binary_sensor.zig_rain_sensor_moisture is wet' },
    { ts: at(1, 21, 0), kind: 'skip', groupId: 'backyard_lawn', zoneId: null, code: 'rain_sensor', detail: 'rain sensor is wet (or in dry-out window)' },
    { ts: at(2, 4, 40), kind: 'fault', groupId: null, zoneId: null, code: 'flow_deviation', detail: 'Sirio Well Backyard: measured 28.4 l/min vs expected 24.0 l/min' },
    { ts: at(1, 2, 14), kind: 'fault', groupId: null, zoneId: null, code: 'idle_flow', detail: 'source Sirio Well Backyard: 3 l/min with no zones running (leak or stuck valve?)' },
    { ts: at(0, 5, 12), kind: 'info', groupId: null, zoneId: null, code: 'soil_trigger', detail: 'sensor sensor.cherry_moisture at 24% < 25%' },
  ]);
}
