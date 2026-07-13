import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../db/database.module';
import { Group, GroupRule, KV, WaterSource, Zone } from '../db/entities';

export type SoilTrigger = {
  id: string;
  sensor: string;
  targetKind: 'zone' | 'group';
  targetId: string;
  startBelowPct: number | null;
  runMin: number;
  cooldownHours: number;
  blockAbovePct: number | null;
  staleAfterHours: number;
  enabled: boolean;
  /** fire and keep running even when the rain sensor is wet (e.g. greenhouse soil). */
  ignoreRainSensor?: boolean;
};

/** Heat-burst trigger: when a live temperature crosses a threshold inside a
 *  daily window, water a zone/group for a few minutes (at most once per cooldown). */
export type TempTrigger = {
  id: string;
  sensor: string;
  aboveC: number;
  windowFrom: string; // HH:MM
  windowTo: string; // HH:MM
  targetKind: 'zone' | 'group';
  targetId: string;
  runMin: number;
  cooldownHours: number;
  enabled: boolean;
  ignoreRainSensor?: boolean;
};

export type NotificationProvider =
  | { type: 'telegram'; chatIds: string[]; events: string[] }
  | { type: 'ha_notify'; service: string; events: string[] };

export interface Settings {
  maxTotalFlowLpm: number | null;
  energyTariffPerKwh: number | null;
  energyCurrency: string | null;
  /** wait = queue until rules allow (default); skip = drop a scheduled run that cannot start on time */
  conflictPolicy: 'wait' | 'skip';
  weatherEntity: string | null;
  rainSensor: {
    enabled: boolean;
    entities: string[];
    quorum: number;
    dryOutHours: number;
    onWetDuringRun: 'stop_all' | 'stop_linked';
    linkedZones: string[] | null;
  };
  weatherTriggers: {
    enabled: boolean;
    rainProbPct: number;
    rainAmountMm: number;
    freezeC: number | null;
  };
  tempScale: {
    enabled: boolean;
    groups: string[];
    steps: { belowC?: number; aboveC?: number; pct?: number; action?: 'skip' }[];
    useForecast: boolean;
    yesterdaySensor: string | null;
    combine: 'forecast_only' | 'sensor_only' | 'max' | 'avg';
  };
  soilTriggers: SoilTrigger[];
  tempTriggers: TempTrigger[];
  notifications: {
    providers: NotificationProvider[];
    /** one message per group run instead of one per zone */
    groupLevel: boolean;
    /** daily summary (liters/energy/cost/skips) at a fixed time */
    digest: { enabled: boolean; time: string };
    /** suppress non-fault notifications inside this window (digest still covers them) */
    quiet: { enabled: boolean; from: string; to: string };
  };
  externalOnPolicy: 'adopt' | 'turn_off';
  /** Alert when zone/pump entities are unavailable N minutes before a scheduled start. */
  preStartCheck: { enabled: boolean; minutes: number };
}

export const defaultSettings: Settings = {
  maxTotalFlowLpm: null,
  energyTariffPerKwh: null,
  energyCurrency: null,
  conflictPolicy: 'wait',
  weatherEntity: null,
  rainSensor: {
    enabled: false,
    entities: [],
    quorum: 1,
    dryOutHours: 12,
    onWetDuringRun: 'stop_all',
    linkedZones: null,
  },
  weatherTriggers: { enabled: false, rainProbPct: 80, rainAmountMm: 2, freezeC: null },
  tempScale: {
    enabled: false,
    groups: [],
    steps: [
      { belowC: 20, action: 'skip' },
      { belowC: 25, pct: -30 },
      { aboveC: 30, pct: 30 },
    ],
    useForecast: true,
    yesterdaySensor: null,
    combine: 'max',
  },
  soilTriggers: [],
  tempTriggers: [],
  notifications: {
    providers: [],
    groupLevel: true,
    digest: { enabled: false, time: '21:00' },
    quiet: { enabled: false, from: '22:00', to: '07:00' },
  },
  externalOnPolicy: 'adopt',
  preStartCheck: { enabled: true, minutes: 30 },
};

@Injectable()
export class ConfigService {
  zones: Repository<Zone>;
  groups: Repository<Group>;
  rules: Repository<GroupRule>;
  sources: Repository<WaterSource>;
  kv: Repository<KV>;

  constructor(@Inject(DATA_SOURCE) public readonly ds: DataSource) {
    this.zones = ds.getRepository(Zone);
    this.groups = ds.getRepository(Group);
    this.rules = ds.getRepository(GroupRule);
    this.sources = ds.getRepository(WaterSource);
    this.kv = ds.getRepository(KV);
  }

  async getKV<T>(key: string, fallback: T): Promise<T> {
    const row = await this.kv.findOneBy({ key });
    if (!row) return fallback;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return fallback;
    }
  }

  async setKV(key: string, value: unknown): Promise<void> {
    await this.kv.save({ key, value: JSON.stringify(value) });
  }

  async getSettings(): Promise<Settings> {
    const stored = await this.getKV<Partial<Settings>>('settings', {});
    const merged = { ...defaultSettings, ...stored } as Settings;
    // deep-merge nested blocks that gained keys after older configs were stored
    merged.notifications = {
      ...defaultSettings.notifications,
      ...(stored.notifications ?? {}),
      digest: { ...defaultSettings.notifications.digest, ...(stored.notifications as any)?.digest },
      quiet: { ...defaultSettings.notifications.quiet, ...(stored.notifications as any)?.quiet },
    };
    merged.tempTriggers = stored.tempTriggers ?? [];
    return merged;
  }

  async patchSettings(patch: Partial<Settings>): Promise<Settings> {
    const merged = { ...(await this.getSettings()), ...patch };
    await this.setKV('settings', merged);
    return merged;
  }

  async exportAll() {
    return {
      version: 1,
      zones: await this.zones.find(),
      groups: await this.groups.find(),
      rules: await this.rules.find(),
      sources: await this.sources.find(),
      settings: await this.getSettings(),
      siteMapSvg: await this.getKV<string | null>('siteMapSvg', null),
    };
  }

  async importAll(data: any) {
    if (!data || data.version !== 1) throw new Error('Unsupported export version');
    await this.ds.transaction(async (m) => {
      await m.clear(Zone);
      await m.clear(Group);
      await m.clear(GroupRule);
      await m.clear(WaterSource);
      await m.save(Zone, data.zones ?? []);
      await m.save(Group, data.groups ?? []);
      await m.save(GroupRule, data.rules ?? []);
      await m.save(WaterSource, data.sources ?? []);
    });
    if (data.settings) await this.setKV('settings', data.settings);
    if (data.siteMapSvg !== undefined) await this.setKV('siteMapSvg', data.siteMapSvg);
  }
}
