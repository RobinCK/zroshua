import type { GardenState } from '../tokens/base';
import type { BarDatum, LinePoint, Segment, StatItem } from '../kit';

/**
 * View models of the garden composites. Pages (and the gallery fixtures) build these from the
 * API; the composites only draw them. All strings arrive translated and formatted.
 */

export interface ZoneView {
  id: string;
  name: string;
  /** zone type: lawn, beds, drip, shrubs, sprinkler, tree */
  kind: string;
  state: GardenState;
  /** the status line, always with units: «8 min left», «06:00 · 7 min», «Off · not scheduled» */
  label: string;
  /** 0–100 while watering */
  progress?: number | null;
}

export interface ZoneSectionView {
  id: string;
  name: string;
  zones: ZoneView[];
}

export interface GroupView {
  id: string;
  name: string;
  kind: string;
  mode: 'sequential' | 'parallel' | 'parallel_limit';
  /** «Sequential · 4 of 5 zones · 1 schedule» */
  meta: string;
  state: GardenState;
  /** the first word of the status tile: «Watering», «Next run», «May skip» */
  word: string;
  /** «until 07:00», «in 18 min» */
  when?: string;
  headline: string;
  detail?: string;
  detailTone?: 'warn' | 'err' | null;
  segments: Segment[];
  /** what the main button does */
  primary: 'stop' | 'run' | 'none';
  paused: boolean;
}

export interface SourceView {
  id: string;
  name: string;
  /** pump, tank, mains */
  kind: string;
  meta: string;
  state: GardenState;
  word: string;
  when?: string;
  metric?: { value: string; unit?: string; aside?: string };
  meter?: { pct: number | null; mark?: number | null; scale: string[] };
  /** replaces metric + meter when the device does not answer */
  problem?: { headline: string; detail: string };
  stats: StatItem[];
}

export interface StatusView {
  kicker: string;
  mode: { state: GardenState; label: string };
  headline: string;
  sub: string;
  /** zones of the running group in run order, labelled */
  run?: Segment[];
  attention?: { title: string; sub: string; count?: number };
  stats: StatItem[];
  canStop: boolean;
  /** all automatic watering paused (shows Resume) */
  paused: boolean;
  /** off season: one primary action to turn schedules back on */
  seasonOff?: boolean;
}

/** What a row of the next 7 days offers: skip only this run, pause its group or zone, resume; a one-off is skipped or dropped. */
export type UpcomingAction = 'skip' | 'pause6' | 'pause12' | 'pause24' | 'resume' | 'cancel';

export interface UpcomingView {
  key: string;
  day: string;
  time: string;
  title: string;
  detail: string;
  state: GardenState;
  word: string;
  why: string;
  paused: boolean;
  actions: UpcomingAction[];
}

/** «Pause all» durations, in hours. */
export type PauseHours = 6 | 12 | 24 | 72 | 168 | 336;

export interface WeatherDayView {
  day: string;
  temp: string;
  rain: string;
  /** rain likely: the percentage gets the water colour */
  wet: boolean;
}

export interface TimelineBarView {
  start: number;
  end: number;
  state: GardenState;
  label?: string;
  title: string;
}

export interface TimelineLaneView {
  key: string;
  name: string;
  sub: string;
  bars: TimelineBarView[];
}

export interface SensorView {
  id: string;
  name: string;
  /** plant (multi-reading), soil (moisture probe), rain (binary) */
  kind: 'plant' | 'soil' | 'rain';
  meta: string;
  state: GardenState;
  word: string;
  when?: string;
  /** soil moisture in %, with the trigger (waters below) and the block (blocks above) */
  moisture?: { value: number; trigger?: number | null; wet?: number | null } | null;
  /** text instead of a number: a rain sensor, a sensor without data */
  headline?: string;
  detail?: string;
  detailTone?: 'warn' | 'err' | null;
  /** moisture over the last 24 h */
  spark?: (number | null)[];
  /** wet periods over the last 24 h (rain) */
  strip?: boolean[];
  readings: StatItem[];
}

export interface ChartView {
  key: string;
  icon: 'water' | 'energy' | 'time' | 'flow';
  title: string;
  period: string;
  color: string;
  kind: 'bars' | 'line' | 'empty';
  total: string;
  unit?: string;
  delta?: string;
  hint: string;
  bars?: BarDatum[];
  axisMax?: number;
  axisLabel?: string;
  average?: number | null;
  averageLabel?: string;
  /** readout of a bar/point: the same format the stats use */
  readout?: (i: number) => string;
  points?: LinePoint[];
  lineMax?: number;
  band?: [number, number] | null;
  bandLabel?: string;
  ticks?: string[];
  empty?: { title: string; text?: string };
  stats: StatItem[];
}

export interface UsageRowView {
  key: string;
  name: string;
  value: string;
  share: string;
  pct: number;
  note?: string;
}

export interface FindingView {
  key: string;
  state: GardenState;
  icon: 'warn' | 'rain' | 'idea' | 'battery' | 'offline' | 'ok';
  title: string;
  sub?: string;
  action?: string;
}

export interface BadgeView {
  key: string;
  state: GardenState;
  label: string;
  value: string;
}

export interface QuickTarget {
  id: string;
  name: string;
  /** default minutes */
  minutes: number;
  /** litres per minute (for the estimate), null when unknown */
  flowLpm: number | null;
  /** zones a group run covers (to estimate litres and time) */
  zoneCount?: number;
  sequential?: boolean;
  /** what will happen: «Well pump has room», «Barrel pump is offline — the run will wait» */
  note?: { state: GardenState; text: string } | null;
}

export type RuleKind = 'mutex' | 'order' | 'parallel_ok';

/** One rule you can delete: the group it binds to the row's group, or a whole rule of three or more. */
export interface RuleChipView {
  ruleId: string;
  label: string;
}

/** A line of the rules list: one group and what it is bound to. */
export interface RuleRowView {
  key: string;
  lead: string;
  items: RuleChipView[];
}

export interface RuleSectionView {
  kind: RuleKind;
  title: string;
  count: number;
  rows: RuleRowView[];
}
