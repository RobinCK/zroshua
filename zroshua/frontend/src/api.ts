// All requests use relative paths — mandatory behind HA ingress.
const base = './api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    // Nest wraps errors as {message, error, statusCode}; the envelope is not
    // something to show a user, only the message inside it is
    let message = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.message === 'string') message = parsed.message;
      else if (Array.isArray(parsed?.message)) message = parsed.message.join('; ');
    } catch { /* plain text body */ }
    throw new Error(message || `HTTP ${res.status}`);
  }
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
  /** several sensors aggregated (e.g. soil-moisture probes); overrides `entity` when set */
  entities?: string[];
  agg?: 'avg' | 'min' | 'max';
  op: 'gte' | 'lte';
  value: number;
  /** when the condition is not met: skip the run (default) or water for a shorter time */
  action?: 'skip' | 'scale';
  /** for action=scale: % of the normal duration to run instead of skipping (0–100) */
  scalePct?: number;
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
  pumpAfterRun: 'off' | 'keep_on' | 'restore' | null;
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
  /** what to pause to skip this run: a whole group, one zone's own schedule, or a one-off run */
  kind?: 'group' | 'zone' | 'once';
  targetId?: string;
  /** current pause end of that target (ms epoch), or null */
  snoozeUntil?: number | null;
  /** one-off runs are not snoozed by hours — they are soft-skipped until they expire */
  paused?: boolean;
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
  kind: 'group' | 'zone' | 'once';
  /** 'certain' = already decided (paused / rain dry-out), 'possible' = re-evaluated at start time. */
  skip?: 'certain' | 'possible' | null;
  /** Human-readable reasons for the skip state, at most 3. */
  skipWhy?: string[];
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
  kind: 'group' | 'zone' | 'once';
  /** 'certain' = already decided (paused / rain dry-out), 'possible' = re-evaluated at start time. */
  skip?: 'certain' | 'possible' | null;
  /** Human-readable reasons for the skip state, at most 3. */
  skipWhy?: string[];
}

export interface PlanResponse {
  segments: PlanSegment[];
  envelopes?: PlanEnvelope[];
  conflicts: { aZone: string; bZone: string; at: number }[];
}

export interface OneTimeStepZone {
  zoneId: string;
  minutes: number;
}

export type OneTimeStatus = 'scheduled' | 'running' | 'done' | 'cancelled' | 'skipped' | 'expired';

/** A dated, one-shot watering request: these zones, in these parallel steps, once. */
export interface OneTimeRun {
  id: string;
  name: string | null;
  /** absolute epoch ms — sqlite returns bigint as a string, so always read it through Number() */
  startTs: number;
  /** ordered steps; the zones inside one step run in parallel */
  steps: OneTimeStepZone[][];
  interStepDelayS: number;
  status: OneTimeStatus;
  /** soft skip: the run is left to expire instead of firing */
  paused: boolean;
  /** ignore pauses, rain and wet soil — nothing else */
  force: boolean;
  firedTs: number | null;
  createdTs: number;
  /** why it ended the way it did — a code the UI translates */
  resultCode?: string | null;
  /** the English specifics behind that code (a zone count, a time) */
  resultDetail?: string | null;
}

/**
 * Something the user has to know before scheduling, as a code plus its specifics.
 * The text lives here rather than in the backend: it is wizard body copy, and an
 * English alert in the middle of a translated wizard is a defect.
 */
export interface OneTimeWarning {
  code: string;
  params?: Record<string, string | number>;
}

/** Body of POST/PUT /one-time and POST /one-time/preview. */
export interface OneTimeDraft {
  name?: string | null;
  startTs: number;
  /** 'finish' = the picked time is when the run must be done; the server stores the resolved start */
  anchor?: 'start' | 'finish';
  steps: OneTimeStepZone[][];
  interStepDelayS?: number;
  force?: boolean;
}

export interface OneTimePreviewZone {
  zoneId: string;
  name: string;
  minutes: number;
  startTs: number;
  endTs: number;
}

export interface OneTimePreviewStep {
  index: number;
  startTs: number;
  endTs: number;
  zones: OneTimePreviewZone[];
  /** the flow budget forces at least one zone of this step to wait for another */
  serialised: boolean;
  /** hydraulic verdict for this step: flow budget, missing source, disabled or paused zones */
  warnings: OneTimeWarning[];
}

export interface OneTimePreview {
  startTs: number;
  endTs: number;
  totalMin: number;
  litersMin: number;
  litersMax: number;
  steps: OneTimePreviewStep[];
  warnings: OneTimeWarning[];
  /** already decided (pauses, rain dry-out) — English, same bucket as the timeline */
  skipReasons: string[];
  /** re-checked at start time (rain now, soil moisture) */
  maybeSkip: string[];
  conflicts: { label: string; startTs: number; endTs: number }[];
}

export interface WeatherNow {
  entity: string | null;
  condition: string | null;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  forecast: { tempMaxC: number | null; precipitationProbability: number | null; precipitationMm: number | null; condition: string | null }[];
}
