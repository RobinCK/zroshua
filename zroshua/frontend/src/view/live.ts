/** Responses of the live endpoints that feed the dashboards (backend src/overview). */

export interface SourceLive {
  id: string;
  name: string;
  type: string;
  groups: string[];
  maxFlowLpm: number | null;
  pump: { entity: string; state: 'on' | 'off' | 'unavailable' | 'unknown'; since: number | null } | null;
  flowLpm: number | null;
  pressure: { bar: number | null; target: number | null } | null;
  level: {
    pct: number | null;
    liters: number | null;
    capacityL: number;
    lowReservePct: number | null;
    blockBelowPct: number | null;
    refillLpm: number | null;
  } | null;
  litersToday: number;
  kwhToday: number;
  runningZones: number;
}

export interface SensorLive {
  id: string;
  name: string;
  kind: 'plant' | 'soil' | 'rain';
  target: string | null;
  available: boolean;
  updatedTs: number | null;
  moisture: number | null;
  startBelowPct: number | null;
  blockAbovePct: number | null;
  staleAfterHours: number | null;
  wet: boolean | null;
  readings: { temperature?: number | null; illuminance?: number | null; conductivity?: number | null; battery?: number | null };
  history: (number | null)[];
  lastTriggerTs: number | null;
}

export interface Finding {
  code: string;
  severity: 'err' | 'warn' | 'off' | 'ok' | 'idea';
  params: Record<string, string | number>;
  ts?: number;
}

export interface Insights {
  days: number;
  totalLiters: number;
  usage: { groupId: string; name: string; liters: number; runs: number }[];
  findings: Finding[];
}

export interface DayStat {
  d: string;
  l: number;
  m: number;
  k: number;
}

export interface RunRow {
  zoneId: string | null;
  groupId: string | null;
  startTs: number;
  endTs: number | null;
  actualMin: number;
  category: string;
}
