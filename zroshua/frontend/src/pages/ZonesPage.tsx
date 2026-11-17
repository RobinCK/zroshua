import { useState } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  TextInput,
  Title,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, EngineState, Settings, WaterSource, Zone } from '../api';
import { useResource } from '../hooks';
import { t } from '../i18n';
import { EntityMultiSelect, SliderInput } from '../components/common';
import ScheduleEditor, { emptySchedule } from '../components/ScheduleEditor';
import { BusyBand, overlapsConflict, toMin } from '../components/TimeSlotPicker';
import { HintLabel, HintTitle } from '../components/Hint';
import { ZoneSheet } from '../components/ZoneSheet';
import { Panel } from '../ui/kit';
import { ZoneBoard } from '../ui/garden';
import { zoneSections } from '../view/garden';
import { useGarden } from '../view/useGarden';
import { useMediaQuery } from '@mantine/hooks';

const emptyZone: Partial<Zone> = {
  name: '',
  type: 'sprinkler',
  entities: [],
  sourceId: null,
  flowLpm: null,
  baseDurationMin: 15,
  minDurationMin: 0,
  maxRuntimeMin: 60,
  ignore: {},
  cycleSoak: null,
  svgElementId: null,
  soilSensor: null,
  schedules: [],
  enabled: true,
};

export default function ZonesPage({ state }: { state: EngineState | null }) {
  const { reload } = useResource<Zone[]>('/zones');
  const { data: sources } = useResource<WaterSource[]>('/sources');
  const { data: settings } = useResource<Settings>('/settings');
  const [editing, setEditing] = useState<Partial<Zone> | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const { garden, reload: reloadGarden } = useGarden(state, ['zones', 'groups', 'upcoming', 'lastRuns', 'sources']);
  const phone = useMediaQuery('(max-width: 640px)');
  const [flowMode, setFlowMode] = useState<'none' | 'value' | 'range'>('none');
  const [busy, setBusy] = useState<BusyBand[]>([]);


  const notifyErr = (e: any) => notifications.show({ message: e.message, color: 'red' });

  const worstFactor = settings?.tempScale.enabled
    ? 1 + settings.tempScale.steps.reduce((acc, st) => acc + Math.max(0, st.pct ?? 0), 0) / 100
    : 1;

  const zoneConflicts = (z: Partial<Zone>): string[] => {
    const out: string[] = [];
    const zid = z.id ?? 'new';
    for (const sch of (z.schedules ?? []).filter((x) => x.enabled)) {
      const dur = Math.max(1, (sch.zoneDurations?.[zid] ?? z.baseDurationMin ?? 15) * worstFactor);
      const entries =
        sch.mode === 'per_day'
          ? Object.entries(sch.perDay ?? {}).flatMap(([d, list]) =>
              (list ?? []).map((x) => ({ dows: [{ sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }[d] ?? 0], start: x.start })),
            )
          : (sch.starts ?? []).map((x) => ({ dows: sch.weekdays ?? [], start: x.start }));
      for (const e of entries) {
        const hit = overlapsConflict(toMin(e.start), dur, busy.filter((b) => e.dows.includes(b.dow)));
        if (hit) out.push(t('{start} overlaps "{label}"', { start: e.start, label: hit.label }));
      }
    }
    return out;
  };

  const save = async () => {
    if (!editing?.name) return;
    try {
      const conflicts = zoneConflicts(editing);
      if (editing.id) await api.put(`/zones/${editing.id}`, editing);
      else await api.post('/zones', editing);
      if (conflicts.length)
        notifications.show({
          title: t('Saved with rule conflicts'),
          message: t('{conflicts} — see the Timeline page.', { conflicts: conflicts.join('; ') }),
          color: 'red',
          autoClose: 10000,
        });
      setEditing(null);
      reload();
    } catch (e) {
      notifyErr(e);
    }
  };

  const openEdit = (z: Partial<Zone>) => {
    setEditing({ ...z });
    setFlowMode(z.flowLpm == null ? 'none' : typeof z.flowLpm === 'number' ? 'value' : 'range');
    setBusy([]);
    const q = z.id ? `?excludeKind=zone&excludeId=${z.id}` : '';
    api.get<{ bands: BusyBand[] }>(`/busy-week${q}`).then((r) => setBusy(r.bands)).catch(() => setBusy([]));
  };


  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>{t('Zones')}</Title>
        <Button onClick={() => openEdit(emptyZone)}>{t('Add zone')}</Button>
      </Group>

      <Panel pad="lg" aria-label={t('Zones')}>
        <ZoneBoard sections={zoneSections(garden)} onOpen={setSheetId} minTile={phone ? 150 : 210} />
      </Panel>

      <ZoneSheet
        garden={garden}
        zoneId={sheetId}
        onClose={() => setSheetId(null)}
        onChanged={() => {
          reload();
          reloadGarden();
        }}
        onEdit={(z) => {
          setSheetId(null);
          openEdit(z);
        }}
      />

      <Modal opened={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t('Edit zone') : t('New zone')} size="lg">
        {editing && (
          <Stack>
            <TextInput label={t('Name')} value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            <Group grow>
              <Select
                label={t('Type')}
                data={[
                  { value: 'sprinkler', label: t('sprinkler') },
                  { value: 'drip', label: t('drip') },
                  { value: 'beds', label: t('beds') },
                  { value: 'lawn', label: t('lawn') },
                  { value: 'shrubs', label: t('shrubs') },
                ]}
                value={editing.type ?? 'sprinkler'}
                onChange={(v) => setEditing({ ...editing, type: v ?? 'sprinkler' })}
              />
              <Select
                label={t('Water source')}
                data={(sources ?? []).map((s) => ({ value: s.id, label: s.name }))}
                value={editing.sourceId}
                onChange={(v) => setEditing({ ...editing, sourceId: v })}
                clearable
              />
            </Group>
            <EntityMultiSelect
              label={<HintLabel label={t('Controlled entities')} hint={t('switch / valve')} />}
              value={editing.entities ?? []}
              onChange={(v) => setEditing({ ...editing, entities: v })}
              domains={['switch', 'valve', 'input_boolean', 'light']}
            />
            <SliderInput
              label={t('Default duration')}
              value={editing.baseDurationMin ?? 15}
              onChange={(v) => setEditing({ ...editing, baseDurationMin: v })}
              max={180}
            />
            <Group grow>
              <NumberInput
                label={<HintLabel label={t('Min duration')} hint={t('rollover threshold, min')} />}
                value={editing.minDurationMin ?? 0}
                onChange={(v) => setEditing({ ...editing, minDurationMin: Number(v) || 0 })}
              />
              <NumberInput
                label={t('Max runtime failsafe (min)')}
                value={editing.maxRuntimeMin ?? 60}
                onChange={(v) => setEditing({ ...editing, maxRuntimeMin: Number(v) || 60 })}
              />
            </Group>
            <Select
              label={t('Flow rate')}
              data={[
                { value: 'none', label: t('Unknown') },
                { value: 'value', label: t('Exact value') },
                { value: 'range', label: t('Range (min–max)') },
              ]}
              value={flowMode}
              onChange={(v) => {
                const mode = (v ?? 'none') as typeof flowMode;
                setFlowMode(mode);
                setEditing({
                  ...editing,
                  flowLpm: mode === 'none' ? null : mode === 'value' ? 10 : { min: 5, max: 15 },
                });
              }}
            />
            {flowMode === 'value' && (
              <NumberInput
                label={t('Flow (l/min)')}
                value={typeof editing.flowLpm === 'number' ? editing.flowLpm : 10}
                onChange={(v) => setEditing({ ...editing, flowLpm: Number(v) || 0 })}
              />
            )}
            {flowMode === 'range' && (
              <Group grow>
                <NumberInput
                  label={t('Flow min (l/min)')}
                  value={typeof editing.flowLpm === 'object' && editing.flowLpm ? editing.flowLpm.min : 5}
                  onChange={(v) =>
                    setEditing({
                      ...editing,
                      flowLpm: { min: Number(v) || 0, max: typeof editing.flowLpm === 'object' && editing.flowLpm ? editing.flowLpm.max : 15 },
                    })
                  }
                />
                <NumberInput
                  label={t('Flow max (l/min)')}
                  value={typeof editing.flowLpm === 'object' && editing.flowLpm ? editing.flowLpm.max : 15}
                  onChange={(v) =>
                    setEditing({
                      ...editing,
                      flowLpm: { min: typeof editing.flowLpm === 'object' && editing.flowLpm ? editing.flowLpm.min : 5, max: Number(v) || 0 },
                    })
                  }
                />
              </Group>
            )}
            <Group grow>
              <NumberInput
                label={t('Cycle max (min, 0 = off)')}
                value={editing.cycleSoak?.max_cycle_min ?? 0}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    cycleSoak: Number(v) ? { max_cycle_min: Number(v), min_soak_min: editing.cycleSoak?.min_soak_min ?? 15 } : null,
                  })
                }
              />
              <NumberInput
                label={t('Soak (min)')}
                value={editing.cycleSoak?.min_soak_min ?? 15}
                disabled={!editing.cycleSoak}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    cycleSoak: editing.cycleSoak ? { ...editing.cycleSoak, min_soak_min: Number(v) || 15 } : null,
                  })
                }
              />
            </Group>
            <Group justify="space-between">
              <HintTitle title={t('Own schedules')} hint={t('waters this zone alone, in addition to its group')} />
              <Button size="xs" variant="light" onClick={() => setEditing({ ...editing, schedules: [...(editing.schedules ?? []), emptySchedule()] })}>
                {t('Add schedule')}
              </Button>
            </Group>
            {(editing.schedules ?? []).map((sch, i) => (
              <ScheduleEditor
                key={sch.id}
                schedule={sch}
                busy={busy}
                worstFactor={worstFactor}
                zones={[{ id: editing.id ?? 'new', name: editing.name ?? '', baseMin: editing.baseDurationMin ?? 15, maxRuntimeMin: editing.maxRuntimeMin ?? 60 }]}
                onChange={(ns) => {
                  const next = [...(editing.schedules ?? [])];
                  next[i] = ns;
                  setEditing({ ...editing, schedules: next });
                }}
                onDelete={() => setEditing({ ...editing, schedules: (editing.schedules ?? []).filter((_, j) => j !== i) })}
              />
            ))}
            <Group>
              <Switch
                label={t('Ignore rain sensor')}
                checked={!!editing.ignore?.rain_sensor}
                onChange={(e) => setEditing({ ...editing, ignore: { ...editing.ignore, rain_sensor: e.currentTarget.checked } })}
              />
              <Switch
                label={t('Ignore weather')}
                checked={!!editing.ignore?.weather}
                onChange={(e) => setEditing({ ...editing, ignore: { ...editing.ignore, weather: e.currentTarget.checked } })}
              />
              <Switch
                label={t('Enabled')}
                checked={editing.enabled !== false}
                onChange={(e) => setEditing({ ...editing, enabled: e.currentTarget.checked })}
              />
            </Group>
            <Group justify="space-between">
              <Button onClick={save}>{t('Save')}</Button>
              {editing.id && (
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() =>
                    api
                      .del(`/zones/${editing.id}`)
                      .then(() => {
                        setEditing(null);
                        reload();
                        reloadGarden();
                      })
                      .catch(notifyErr)
                  }
                >
                  {t('Delete zone')}
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>

    </Stack>
  );
}
