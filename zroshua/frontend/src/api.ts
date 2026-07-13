// All requests use relative paths — mandatory behind HA ingress.
const base = './api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  get: <T>(p: string) => req<T>(p),
  post: <T>(p: string, body?: unknown) => req<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(p: string, body?: unknown) => req<T>(p, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T>(p: string) => req<T>(p, { method: 'DELETE' }),
};

export interface HaEntity {
  entity_id: string;
  state: string;
  name: string;
  unit: string | null;
}

export interface Zone {
  id: string;
  name: string;
  type: string;
  entities: string[];
  sourceId: string | null;
  flowLpm: { min: number; max: number } | number | null;
  baseDurationMin: number;
  minDurationMin: number;
  maxRuntimeMin: number;
  ignore: { rain_sensor?: boolean; rain_delay?: boolean; weather?: boolean };
  cycleSoak: { max_cycle_min: number; min_soak_min: number } | null;
  svgElementId: string | null;
  svgElementIds: string[];
  soilSensor: string | null;
  schedules: Schedule[];
  enabled: boolean;
  orderIndex: number;
  snoozeUntil: number | null;
}

export interface ScheduleStart {
  start: string;
  /** 'finish' = the configured time is when the run must be DONE */
  anchor?: 'start' | 'finish';
}

export interface ScheduleCondition {
  id: string;
  kind: 'forecast_max' | 'forecast_rain_prob' | 'sensor';
  entity?: string;
  op: 'gte' | 'lte';
  value: number;
}

export interface Schedule {
  id: string;
  mode: 'week' | 'per_day';
  weekdays: number[];
  starts: ScheduleStart[];
  perDay: Record<string, ScheduleStart[]>;
  season?: { from: string; to: string } | null;
  zoneDurations?: Record<string, number>;
  /** subset of the group's zones this schedule waters; null/undefined = all */
  zoneSelection?: string[] | null;
  conditions?: ScheduleCondition[];
  enabled: boolean;
}

export interface Group {
  id: string;
  name: string;
  zoneIds: string[];
  mode: 'sequential' | 'parallel' | 'parallel_limit';
  parallelLimit: number;
  interZoneDelayS: number;
  multiplierPct: number;
  priority: number;
  schedules: Schedule[];
  enabled: boolean;
  snoozeUntil: number | null;
  orderIndex: number;
}

export interface GroupRule {
  id: number;
  type: 'mutex' | 'order' | 'parallel_ok';
  groups: string[];
  before: string | null;
  after: string | null;
}

export interface WaterSource {
  id: string;
  name: string;
  type: string;
  pumpEntity: string | null;
  pumpStartDelayS: number;
  pumpStopDelayS: number;
  maxFlowLpm: number | null;
  energyEntity: string | null;
  energyTail: { minutes: number; afterGroups: Record<string, boolean> } | null;
  dependsOn: string | null;
  okSensor: string | null;
  flowSensor: string | null;
  idleFlowAlertLpm: number | null;
  exclusiveWithSourceIds: string[];
  capacityL: number | null;
  refillLpm: number | null;
  levelEntity: string | null;
  lowReservePct: number | null;
  blockBelowPct: number | null;
  flowDeviationPct: number | null;
}

export interface EngineState {
  now: number;
  paused: boolean;
  snoozeUntil: number | null;
  haConnected: boolean;
  active: {
    zoneId: string;
    zoneName: string;
    groupId: string | null;
    startTs: number;
    endsAt: number;
    plannedMin: number;
    manual: boolean;
    triggeredBy: string;
    progress: number;
  }[];
  queue: { zoneId: string; zoneName: string; groupId: string | null; durationMin: number; waitReason: string }[];
  faults: string[];
  pumpStates: { sourceId: string; name: string; on: boolean }[];
  sourceLevels?: { sourceId: string; name: string; capacityL: number; levelL: number | null; levelPct: number | null }[];
}

export interface Settings {
  maxTotalFlowLpm: number | null;
  energyTariffPerKwh: number | null;
  energyCurrency: string | null;
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
  weatherTriggers: { enabled: boolean; rainProbPct: number; rainAmountMm: number; freezeC: number | null };
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
    groupLevel: boolean;
    digest: { enabled: boolean; time: string };
    quiet: { enabled: boolean; from: string; to: string };
  };
  externalOnPolicy: 'adopt' | 'turn_off';
  preStartCheck: { enabled: boolean; minutes: number };
}

export interface SoilTrigger {
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
  ignoreRainSensor?: boolean;
}

export interface TempTrigger {
  id: string;
  sensor: string;
  aboveC: number;
  windowFrom: string;
  windowTo: string;
  targetKind: 'zone' | 'group';
  targetId: string;
  runMin: number;
  cooldownHours: number;
  enabled: boolean;
  ignoreRainSensor?: boolean;
}

export type NotificationProvider =
  | { type: 'telegram'; chatIds: string[]; events: string[] }
  | { type: 'ha_notify'; service: string; events: string[] };

export interface JournalEntry {
  id: number;
  ts: number;
  kind: string;
  zoneId: string | null;
  groupId: string | null;
  code: string | null;
  detail: string | null;
}

export interface Upcoming {
  groupId: string;
  groupName: string;
  ts: number;
  /** Wall-clock run length honoring the group's execution mode (parallel = longest zone). */
  durationMin?: number;
  maxDurationMin?: number;
  willSkip?: boolean;
  skipReasons?: string[];
  maybeSkip?: string[];
  zones: { zoneId: string; name: string; minutes: number; maxMinutes: number }[];
}

export interface PlanSegment {
  groupId: string | null;
  groupName: string;
  zoneId: string;
  zoneName: string;
  occ?: string;
  start: number;
  end: number;
  worstEnd: number;
  conflict: boolean;
  kind: 'group' | 'zone';
}

/** Finish window of one scheduled run: temperature scaling can end it anywhere in [minEnd..worstEnd]. */
export interface PlanEnvelope {
  occ: string;
  groupId: string | null;
  groupName: string;
  start: number;
  minEnd: number;
  end: number;
  worstEnd: number;
  kind: 'group' | 'zone';
}

export interface PlanResponse {
  segments: PlanSegment[];
  envelopes?: PlanEnvelope[];
  conflicts: { aZone: string; bZone: string; at: number }[];
}

export interface WeatherNow {
  entity: string | null;
  condition: string | null;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  forecast: { tempMaxC: number | null; precipitationProbability: number | null; precipitationMm: number | null; condition: string | null }[];
}
