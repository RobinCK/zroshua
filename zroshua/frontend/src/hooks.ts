import { useCallback, useEffect, useRef, useState } from 'react';
import { api, EngineState, JournalEntry } from './api';

/** Live engine state over the app WebSocket (relative path — ingress-safe). */
export function useEngineState() {
  const [state, setState] = useState<EngineState | null>(null);
  const [journalTick, setJournalTick] = useState(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;

    const connect = () => {
      const url = new URL('./api/ws', window.location.href);
      url.protocol = url.protocol.replace('http', 'ws');
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'engine') setState(msg.payload);
        if (msg.type === 'journal') setJournalTick((t) => t + 1);
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 3000);
      };
    };
    connect();

    const poll = setInterval(() => {
      api.get<EngineState>('/state').then(setState).catch(() => undefined);
    }, 5000);
    api.get<EngineState>('/state').then(setState).catch(() => undefined);

    return () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(poll);
      ws?.close();
    };
  }, []);

  return { state, journalTick };
}

/** Simple fetch-once + manual refresh hook. */
export function useResource<T>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    setLoading(true);
    api
      .get<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [reload, ...deps]);
  return { data, loading, error, reload, setData };
}

export function useJournal(tick: number) {
  const { data, reload } = useResource<JournalEntry[]>('/journal');
  const last = useRef(tick);
  useEffect(() => {
    if (tick !== last.current) {
      last.current = tick;
      reload();
    }
  }, [tick, reload]);
  return data ?? [];
}

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });

export const fmtDur = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${Math.round(min % 60)}m` : `${Math.round(min)} min`);
