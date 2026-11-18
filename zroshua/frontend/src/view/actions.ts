import { notifications } from '@mantine/notifications';
import { api, type Upcoming } from '../api';
import type { UpcomingAction } from '../ui/garden';
import { t } from '../i18n';

/**
 * Every button that changes watering goes through here: one call, one confirmation toast, one
 * error toast. The overview, the zones page and the zone sheet share the same words.
 */
async function act(fn: () => Promise<unknown>, ok: string, done?: () => void) {
  try {
    const res: any = await fn();
    if (res?.warnings?.length) notifications.show({ title: t('Started with warnings'), message: res.warnings.join('; '), color: 'yellow' });
    else notifications.show({ message: ok, color: 'teal' });
    done?.();
  } catch (e: any) {
    notifications.show({ message: e.message, color: 'red' });
  }
}

export const actions = {
  runZone: (id: string, name: string, minutes: number, done?: () => void) =>
    act(() => api.post(`/zones/${id}/run`, { minutes }), t('Watering "{name}" for {minutes} min', { name, minutes }), done),
  stopZone: (id: string, done?: () => void) => act(() => api.post(`/zones/${id}/stop`), t('Stopped'), done),
  extendZone: (id: string, minutes: number, done?: () => void) => act(() => api.post(`/zones/${id}/extend`, { minutes }), t('+{n} min', { n: minutes }), done),
  pauseZone: (id: string, hours: number, done?: () => void) => act(() => api.post(`/zones/${id}/pause`, { hours }), hours ? t('paused') : t('Resumed'), done),
  clearFault: (id: string, done?: () => void) => act(() => api.post(`/zones/${id}/clear-fault`), t('Fault cleared'), done),
  runGroup: (id: string, name: string, minutes?: number, done?: () => void) =>
    act(() => api.post(`/groups/${id}/run`, minutes ? { minutes } : {}), t('Started "{name}"', { name }), done),
  stopGroup: (id: string, done?: () => void) => act(() => api.post(`/groups/${id}/stop`), t('Stopped'), done),
  pauseGroup: (id: string, hours: number, done?: () => void) => act(() => api.post(`/groups/${id}/pause`, { hours }), hours ? t('paused') : t('Resumed'), done),
  stopAll: (done?: () => void) => act(() => api.post('/stop-all'), t('All stopped'), done),
  pauseAll: (hours: number, done?: () => void) => act(() => api.post('/snooze', { hours }), hours ? t('Paused') : t('Resumed'), done),
  /** A row of the next 7 days: a one-off is skipped or dropped; otherwise its group or zone is paused — «skip» just past this run. */
  upcoming: (u: Upcoming, a: UpcomingAction, done?: () => void) => {
    if (u.kind === 'once') {
      if (a === 'cancel') return act(() => api.del(`/one-time/${u.targetId}`), t('Cancelled'), done);
      const paused = a !== 'resume';
      return act(() => api.post(`/one-time/${u.targetId}/pause`, { paused }), paused ? t('Skipped') : t('Resumed'), done);
    }
    const path = u.kind === 'zone' ? `/zones/${u.targetId ?? u.groupId}` : `/groups/${u.targetId ?? u.groupId}`;
    const hours = a === 'resume' ? 0 : a === 'skip' ? Math.max(0.05, (u.ts + 60_000 - Date.now()) / 3_600_000) : Number(a.slice(5));
    return act(() => api.post(`${path}/pause`, { hours }), a === 'skip' ? t('Skipped') : hours ? t('paused') : t('Resumed'), done);
  },
};
