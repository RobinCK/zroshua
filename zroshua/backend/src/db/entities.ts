import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

export type FlowRange = { min: number; max: number } | number | null;
export type ZoneIgnore = { rain_sensor?: boolean; rain_delay?: boolean; weather?: boolean };
export type CycleSoak = { max_cycle_min: number; min_soak_min: number } | null;

@Entity('zones')
export class Zone {
  @PrimaryColumn() id: string;
  @Column() name: string;
  @Column({ default: 'sprinkler' }) type: string;
  @Column('simple-json') entities: string[];
  @Column({ type: 'varchar', nullable: true }) sourceId: string | null;
  @Column('simple-json', { nullable: true }) flowLpm: FlowRange;
  @Column('float', { default: 10 }) baseDurationMin: number;
  @Column('float', { default: 0 }) minDurationMin: number;
  @Column('float', { default: 60 }) maxRuntimeMin: number;
  @Column('simple-json', { default: '{}' }) ignore: ZoneIgnore;
  @Column('simple-json', { nullable: true }) cycleSoak: CycleSoak;
  @Column({ type: 'varchar', nullable: true }) svgElementId: string | null;
  @Column({ type: 'varchar', nullable: true }) soilSensor: string | null;
  // zone-level schedules: water this zone more often than its group
  @Column('simple-json', { default: '[]' }) schedules: Schedule[];
  @Column({ default: true }) enabled: boolean;
  @Column({ default: 0 }) orderIndex: number;
}

export type GroupMode = 'sequential' | 'parallel' | 'parallel_limit';
export type ScheduleDayStarts = { start: string; anchor?: 'start' | 'finish' }[];
/** Run condition evaluated at start time; all conditions must pass (AND). */
export type ScheduleCondition = {
  id: string;
  kind: 'forecast_max' | 'forecast_rain_prob' | 'sensor';
  entity?: string; // for kind=sensor
  op: 'gte' | 'lte';
  value: number;
};
export type Schedule = {
  id: string;
  mode: 'week' | 'per_day';
  // mode=week: starts apply to all enabled weekdays; mode=per_day: per weekday
  weekdays: number[]; // 0=Sun..6=Sat, used in week mode
  starts: ScheduleDayStarts; // week mode
  perDay: Record<string, ScheduleDayStarts>; // per_day mode, keys mon..sun
  season?: { from: string; to: string } | null; // MM-DD
  zoneDurations?: Record<string, number>; // per-schedule zone duration overrides (min)
  conditions?: ScheduleCondition[]; // all must pass at start time (unavailable data = pass)
  enabled: boolean;
};

@Entity('groups')
export class Group {
  @PrimaryColumn() id: string;
  @Column() name: string;
  @Column('simple-json') zoneIds: string[];
  @Column({ default: 'sequential' }) mode: GroupMode;
  @Column({ default: 2 }) parallelLimit: number;
  @Column('float', { default: 0 }) interZoneDelayS: number;
  @Column('float', { default: 100 }) multiplierPct: number;
  @Column({ default: 0 }) priority: number;
  @Column('simple-json', { default: '[]' }) schedules: Schedule[];
  @Column({ default: true }) enabled: boolean;
  @Column({ type: 'bigint', nullable: true }) snoozeUntil: number | null;
  @Column({ default: 0 }) orderIndex: number;
}

export type RuleType = 'mutex' | 'order' | 'parallel_ok';

@Entity('group_rules')
export class GroupRule {
  @PrimaryGeneratedColumn() id: number;
  @Column() type: RuleType;
  @Column('simple-json', { default: '[]' }) groups: string[]; // mutex / parallel_ok
  @Column({ type: 'varchar', nullable: true }) before: string | null; // order
  @Column({ type: 'varchar', nullable: true }) after: string | null;
}

export type EnergyTail = { minutes: number; afterGroups: Record<string, boolean> } | null;

@Entity('water_sources')
export class WaterSource {
  @PrimaryColumn() id: string;
  @Column() name: string;
  @Column({ default: 'well' }) type: string;
  @Column({ type: 'varchar', nullable: true }) pumpEntity: string | null;
  @Column('float', { default: 0 }) pumpStartDelayS: number;
  @Column('float', { default: 0 }) pumpStopDelayS: number;
  @Column('float', { nullable: true }) maxFlowLpm: number | null;
  @Column({ type: 'varchar', nullable: true }) energyEntity: string | null;
  @Column('simple-json', { nullable: true }) energyTail: EnergyTail;
  @Column({ type: 'varchar', nullable: true }) dependsOn: string | null;
  @Column({ type: 'varchar', nullable: true }) okSensor: string | null;
  @Column({ type: 'varchar', nullable: true }) flowSensor: string | null;
  @Column('float', { nullable: true }) idleFlowAlertLpm: number | null;
}

export type StopReason =
  | 'completed'
  | 'manual_stop'
  | 'rain'
  | 'fault'
  | 'max_runtime'
  | 'shutdown'
  | 'reconciled';

@Entity('runs')
export class Run {
  @PrimaryGeneratedColumn() id: number;
  @Index() @Column({ type: 'varchar', nullable: true }) zoneId: string | null;
  @Column({ type: 'varchar', nullable: true }) groupId: string | null;
  @Column({ type: 'varchar', nullable: true }) sourceId: string | null;
  @Index() @Column({ type: 'bigint' }) startTs: number;
  @Column({ type: 'bigint', nullable: true }) endTs: number | null;
  @Column('float', { default: 0 }) plannedMin: number;
  @Column('float', { default: 0 }) actualMin: number;
  @Column('float', { nullable: true }) litersMin: number | null;
  @Column('float', { nullable: true }) litersMax: number | null;
  @Column('float', { nullable: true }) energyKwh: number | null;
  @Column({ default: 'completed' }) stopReason: StopReason;
  @Column({ default: false }) manual: boolean;
  @Column({ default: 'run' }) category: 'run' | 'tail';
  @Column({ type: 'varchar', nullable: true }) triggeredBy: string | null; // schedule | manual | soil
}

@Entity('journal')
export class JournalEntry {
  @PrimaryGeneratedColumn() id: number;
  @Index() @Column({ type: 'bigint' }) ts: number;
  @Column() kind: string; // run_start | run_end | skip | stop | fault | info | adjust
  @Column({ type: 'varchar', nullable: true }) zoneId: string | null;
  @Column({ type: 'varchar', nullable: true }) groupId: string | null;
  @Column({ type: 'varchar', nullable: true }) code: string | null;
  @Column({ type: 'text', nullable: true }) detail: string | null;
}

@Entity('kv')
export class KV {
  @PrimaryColumn() key: string;
  @Column({ type: 'text' }) value: string;
}
