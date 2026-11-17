import { useState } from 'react';
import {
  IconEdit,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconPlus,
  IconTool,
} from '@tabler/icons-react';
import type { Zone } from '../api';
import { t } from '../i18n';
import { ChoiceChips, IconChip, KeyValues, Meter, Metric, Sheet, StatusLine, Tile, UiButton } from '../ui/kit';
import { ZoneIcon } from '../ui/garden';
import { actions } from '../view/actions';
import { hhmm, minutes, when, ago } from '../view/format';
import { zoneView, type GardenData } from '../view/garden';

/**
 * One zone, from any page: what it is doing, the facts (source, flow, next run, last run) and
 * the few things you do to a zone — stop, water for a preset, add five minutes, pause, clear a
 * fault. A bottom sheet on a phone, a dialog on a desktop.
 */
export function ZoneSheet({
  garden,
  zoneId,
  onClose,
  onEdit,
  onChanged,
}: {
  garden: GardenData;
  zoneId: string | null;
  onClose: () => void;
  onEdit?: (z: Zone) => void;
  onChanged?: () => void;
}) {
  const z = garden.zones.find((x) => x.id === zoneId) ?? null;
  const [dur, setDur] = useState<number | null>(null);
  if (!z) return <Sheet opened={false} onClose={onClose} title="">{null}</Sheet>;
  const v = zoneView(garden, z);
  const run = garden.state?.active.find((a) => a.zoneId === z.id);
  const queued = garden.state?.queue.find((q) => q.zoneId === z.id);
  const group = garden.groups.find((g) => g.zoneIds.includes(z.id));
  const source = garden.sources.find((s) => s.id === z.sourceId);
  const next = garden.upcoming.find((u) => u.ts > garden.now && u.zones.some((x) => x.zoneId === z.id));
  const last = garden.lastRuns?.zones[z.id];
  const flow = z.flowLpm == null ? null : typeof z.flowLpm === 'number' ? `${z.flowLpm}` : `${z.flowLpm.min}–${z.flowLpm.max}`;
  const paused = !!z.snoozeUntil && Number(z.snoozeUntil) > garden.now;
  const base = Math.round(z.baseDurationMin) || 10;
  const presets = [...new Set([base, 5, 10, 15, 30])].filter((m) => m <= (z.maxRuntimeMin || 999)).slice(0, 5);
  const pick = dur ?? base;
  const done = () => {
    onChanged?.();
  };

  const facts = [
    { label: t('Group'), value: group ? group.name : t('none') },
    { label: t('Source'), value: source ? `${source.name}${source.pressure?.bar != null ? ` · ${source.pressure.bar} bar` : ''}` : t('none') },
    { label: t('Flow'), value: flow ? t('{flow} l/min', { flow }) : t('unknown') },
    { label: t('Next run'), value: next ? `${when(next.ts, garden.now)} · ${minutes(next.zones.find((x) => x.zoneId === z.id)?.minutes ?? base)}` : t('none') },
    { label: t('Last run'), value: last ? ago(last, garden.now) : t('never') },
  ];
  if (queued) facts.unshift({ label: t('Waiting'), value: queued.waitReason });

  return (
    <Sheet
      opened={!!zoneId}
      onClose={onClose}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconChip state={v.state} size={44}>
            <ZoneIcon kind={z.type} size={24} />
          </IconChip>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.2px' }}>{z.name}</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ui-text-3)' }}>
              {group ? group.name : t('No group')}
              {!z.enabled ? ` · ${t('off')}` : ''}
            </span>
          </span>
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Tile state={v.state}>
          <StatusLine state={v.state} word={v.state === 'watering' ? t('Watering') : v.label} aside={run ? `${hhmm(run.startTs)} → ${hhmm(run.endsAt)}` : undefined} />
          {run && (
            <>
              <Metric big value={minutes(Math.max(0, (run.endsAt - garden.now) / 60_000))} unit={t('left')} aside={t('{a} of {b}', { a: minutes((garden.now - run.startTs) / 60_000), b: minutes(run.plannedMin) })} />
              <Meter pct={run.progress * 100} state="watering" thin />
            </>
          )}
        </Tile>

        <KeyValues items={facts} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {garden.state?.faults.includes(z.id) && (
            <UiButton variant="outline" size="lg" block icon={<IconTool size={16} />} onClick={() => actions.clearFault(z.id, done)}>
              {t('Clear the fault')}
            </UiButton>
          )}
          {run ? (
            <>
              <UiButton variant="danger" size="lg" block icon={<IconPlayerStopFilled size={14} />} onClick={() => actions.stopZone(z.id, done)}>
                {t('Stop watering')}
              </UiButton>
              <UiButton variant="secondary" size="lg" block icon={<IconPlus size={16} />} onClick={() => actions.extendZone(z.id, 5, done)}>
                {t('+5 min')}
              </UiButton>
            </>
          ) : (
            <>
              <ChoiceChips
                label={t('Duration')}
                square
                cols={presets.length}
                options={presets.map((m) => ({ key: m, label: t('{n}m', { n: m }), hint: m === base ? t('default') : undefined }))}
                value={pick}
                onChange={setDur}
              />
              <UiButton
                variant="primary"
                size="xl"
                block
                icon={<IconPlayerPlayFilled size={15} />}
                onClick={() => actions.runZone(z.id, z.name, pick, () => {
                  done();
                  onClose();
                })}
              >
                {t('Water {n} min', { n: pick })}
              </UiButton>
            </>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <UiButton
              variant="ghost"
              size="lg"
              grow
              icon={paused ? <IconPlayerPlayFilled size={14} /> : <IconPlayerPauseFilled size={16} />}
              onClick={() => actions.pauseZone(z.id, paused ? 0 : 24, done)}
            >
              {paused ? t('Resume this zone') : t('Pause this zone for 24 h')}
            </UiButton>
            {onEdit && (
              <UiButton variant="ghost" size="lg" icon={<IconEdit size={16} />} onClick={() => onEdit(z)}>
                {t('Edit')}
              </UiButton>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
