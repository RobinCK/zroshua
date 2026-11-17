import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type EngineState, type Group, type PlanResponse, type Upcoming, type WeatherNow, type Zone } from '../api';
import type { GardenData } from './garden';
import type { DayStat, Finding, Insights, RunRow, SensorLive, SourceLive } from './live';

const EMPTY: Omit<GardenData, 'now' | 'state'> = {
  zones: [],
  groups: [],
  upcoming: [],
  lastRuns: null,
  runsToday: [],
  plan: null,
  sources: [],
  sensors: [],
  attention: [],
  insights: null,
  days: [],
  weather: null,
};

type Part = keyof typeof EMPTY;

/** What each part is fetched from, and how often it can change (ms). */
const PARTS: [Part, string, number][] = [
  ['zones', '/zones', 60_000],
  ['groups', '/groups', 60_000],
  ['upcoming', '/upcoming', 30_000],
  ['lastRuns', '/last-runs', 30_000],
  ['runsToday', '/stats/runs?days=1', 30_000],
  ['plan', '/plan?days=1', 60_000],
  ['sources', '/sources/live', 10_000],
  ['sensors', '/sensors/live', 30_000],
  ['attention', '/attention', 20_000],
  ['insights', '/insights?days=7', 120_000],
  ['days', '/stats/days?days=14', 60_000],
  ['weather', '/weather', 300_000],
];

/**
 * The live garden behind every dashboard: the engine state (pushed over the WebSocket) plus
 * the parts the cards need, each refreshed at its own pace and again whenever a run starts or
 * stops. `only` limits the fetches to what a page draws.
 */
export function useGarden(state: EngineState | null, only?: Part[]) {
  const [data, setData] = useState(EMPTY);
  const [now, setNow] = useState(Date.now());
  const wanted = useRef(only ? PARTS.filter(([p]) => only.includes(p)) : PARTS);
  const fetchedAt = useRef(new Map<Part, number>());

  const load = useCallback((force: boolean) => {
    const t = Date.now();
    for (const [part, path, every] of wanted.current) {
      if (!force && t - (fetchedAt.current.get(part) ?? 0) < every) continue;
      fetchedAt.current.set(part, t);
      api
        .get<unknown>(path)
        .then((v) => setData((d) => ({ ...d, [part]: v as never })))
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => {
      setNow(Date.now());
      load(false);
    }, 5_000);
    return () => clearInterval(id);
  }, [load]);

  // a run started or ended: the plan, the queue and today's totals all moved
  const activeKey = (state?.active ?? []).map((a) => a.zoneId).join(',') + '|' + (state?.queue ?? []).map((q) => q.zoneId).join(',');
  const lastKey = useRef(activeKey);
  useEffect(() => {
    if (lastKey.current === activeKey) return;
    lastKey.current = activeKey;
    load(true);
  }, [activeKey, load]);

  const garden: GardenData = { ...data, state, now: state?.now ? Math.max(now, state.now) : now };
  return { garden, reload: () => load(true) };
}

export type { Zone, Group, Upcoming, PlanResponse, WeatherNow, SourceLive, SensorLive, Finding, Insights, DayStat, RunRow };
