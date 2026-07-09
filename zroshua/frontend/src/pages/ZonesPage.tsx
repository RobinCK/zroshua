import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  ActionIcon,
} from '@mantine/core';
import { IconDroplet, IconEdit, IconPlayerStop, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, EngineState, Settings, WaterSource, Zone } from '../api';
import { useResource, fmtDur } from '../hooks';
import { EntityMultiSelect, SliderInput, PauseControl } from '../components/common';
import ScheduleEditor, { emptySchedule } from '../components/ScheduleEditor';
import { BusyBand, overlapsConflict, toMin } from '../components/TimeSlotPicker';

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
  const { data: zones, reload } = useResource<Zone[]>('/zones');
  const { data: sources } = useResource<WaterSource[]>('/sources');
  const { data: settings } = useResource<Settings>('/settings');
  const [editing, setEditing] = useState<Partial<Zone> | null>(null);
  const [runZone, setRunZone] = useState<Zone | null>(null);
  const [runMinutes, setRunMinutes] = useState(15);
  const [flowMode, setFlowMode] = useState<'none' | 'value' | 'range'>('none');
  const [busy, setBusy] = useState<BusyBand[]>([]);

  const running = new Set(state?.active.map((a) => a.zoneId));
  const faults = new Set(state?.faults ?? []);

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
        if (hit) out.push(`${e.start} overlaps "${hit.label}"`);
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
          title: 'Saved with rule conflicts',
          message: `${conflicts.join('; ')} — see the Timeline page.`,
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

  const startRun = async () => {
    if (!runZone) return;
    try {
      const res = await api.post<{ warnings: string[] }>(`/zones/${runZone.id}/run`, { minutes: runMinutes });
      if (res.warnings?.length)
        notifications.show({ title: 'Started with warnings', message: res.warnings.join('; '), color: 'yellow' });
      else notifications.show({ message: `Watering "${runZone.name}" for ${runMinutes} min`, color: 'teal' });
      setRunZone(null);
    } catch (e) {
      notifyErr(e);
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Zones</Title>
        <Button onClick={() => openEdit(emptyZone)}>Add zone</Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {(zones ?? []).map((z) => (
          <Card key={z.id} withBorder opacity={z.enabled ? 1 : 0.5}>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <Text fw={600}>{z.name}</Text>
                {running.has(z.id) && <Badge color="teal">watering</Badge>}
                {!!z.snoozeUntil && z.snoozeUntil > Date.now() && (
                  <Badge color="orange" variant="light">
                    paused
                  </Badge>
                )}
                {faults.has(z.id) && (
                  <Badge
                    color="red"
                    style={{ cursor: 'pointer' }}
                    onClick={() => api.post(`/zones/${z.id}/clear-fault`).then(() => reload())}
                    title="Click to clear fault"
                  >
                    fault ✕
                  </Badge>
                )}
              </Group>
              <Group gap={4}>
                <PauseControl path={`/zones/${z.id}`} pausedUntil={z.snoozeUntil} onChange={reload} />
                <ActionIcon variant="subtle" onClick={() => openEdit(z)}>
                  <IconEdit size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => api.del(`/zones/${z.id}`).then(reload).catch(notifyErr)}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            </Group>
            <Text size="sm" c="dimmed">
              {z.type} · {fmtDur(z.baseDurationMin)}
              {z.flowLpm != null &&
                ` · ${typeof z.flowLpm === 'number' ? z.flowLpm : `${z.flowLpm.min}–${z.flowLpm.max}`} l/min`}
              {z.sourceId && ` · ${sources?.find((s) => s.id === z.sourceId)?.name ?? z.sourceId}`}
            </Text>
            <Text size="xs" c="dimmed" mb="sm" lineClamp={1} style={{ wordBreak: 'break-all' }}>
              {z.entities.join(', ') || 'no entities'}
            </Text>
            {running.has(z.id) ? (
              <Button
                fullWidth
                color="red"
                variant="light"
                leftSection={<IconPlayerStop size={16} />}
                onClick={() => api.post(`/zones/${z.id}/stop`).catch(notifyErr)}
              >
                Stop
              </Button>
            ) : (
              <Button
                fullWidth
                variant="light"
                leftSection={<IconDroplet size={16} />}
                onClick={() => {
                  setRunZone(z);
                  setRunMinutes(Math.round(z.baseDurationMin));
                }}
              >
                Water now
              </Button>
            )}
          </Card>
        ))}
      </SimpleGrid>

      <Modal opened={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit zone' : 'New zone'} size="lg">
        {editing && (
          <Stack>
            <TextInput label="Name" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            <Group grow>
              <Select
                label="Type"
                data={['sprinkler', 'drip', 'beds', 'lawn', 'shrubs']}
                value={editing.type ?? 'sprinkler'}
                onChange={(v) => setEditing({ ...editing, type: v ?? 'sprinkler' })}
              />
              <Select
                label="Water source"
                data={(sources ?? []).map((s) => ({ value: s.id, label: s.name }))}
                value={editing.sourceId}
                onChange={(v) => setEditing({ ...editing, sourceId: v })}
                clearable
              />
            </Group>
            <EntityMultiSelect
              label="Controlled entities (switch / valve)"
              value={editing.entities ?? []}
              onChange={(v) => setEditing({ ...editing, entities: v })}
              domains={['switch', 'valve', 'input_boolean', 'light']}
            />
            <SliderInput
              label="Default duration"
              value={editing.baseDurationMin ?? 15}
              onChange={(v) => setEditing({ ...editing, baseDurationMin: v })}
              max={180}
            />
            <Group grow>
              <NumberInput
                label="Min duration (rollover threshold, min)"
                value={editing.minDurationMin ?? 0}
                onChange={(v) => setEditing({ ...editing, minDurationMin: Number(v) || 0 })}
              />
              <NumberInput
                label="Max runtime failsafe (min)"
                value={editing.maxRuntimeMin ?? 60}
                onChange={(v) => setEditing({ ...editing, maxRuntimeMin: Number(v) || 60 })}
              />
            </Group>
            <Select
              label="Flow rate"
              data={[
                { value: 'none', label: 'Unknown' },
                { value: 'value', label: 'Exact value' },
                { value: 'range', label: 'Range (min–max)' },
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
                label="Flow (l/min)"
                value={typeof editing.flowLpm === 'number' ? editing.flowLpm : 10}
                onChange={(v) => setEditing({ ...editing, flowLpm: Number(v) || 0 })}
              />
            )}
            {flowMode === 'range' && (
              <Group grow>
                <NumberInput
                  label="Flow min (l/min)"
                  value={typeof editing.flowLpm === 'object' && editing.flowLpm ? editing.flowLpm.min : 5}
                  onChange={(v) =>
                    setEditing({
                      ...editing,
                      flowLpm: { min: Number(v) || 0, max: typeof editing.flowLpm === 'object' && editing.flowLpm ? editing.flowLpm.max : 15 },
                    })
                  }
                />
                <NumberInput
                  label="Flow max (l/min)"
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
                label="Cycle max (min, 0 = off)"
                value={editing.cycleSoak?.max_cycle_min ?? 0}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    cycleSoak: Number(v) ? { max_cycle_min: Number(v), min_soak_min: editing.cycleSoak?.min_soak_min ?? 15 } : null,
                  })
                }
              />
              <NumberInput
                label="Soak (min)"
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
              <Text fw={600} size="sm">Own schedules (waters this zone alone, in addition to its group)</Text>
              <Button size="xs" variant="light" onClick={() => setEditing({ ...editing, schedules: [...(editing.schedules ?? []), emptySchedule()] })}>
                Add schedule
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
                label="Ignore rain sensor"
                checked={!!editing.ignore?.rain_sensor}
                onChange={(e) => setEditing({ ...editing, ignore: { ...editing.ignore, rain_sensor: e.currentTarget.checked } })}
              />
              <Switch
                label="Ignore weather"
                checked={!!editing.ignore?.weather}
                onChange={(e) => setEditing({ ...editing, ignore: { ...editing.ignore, weather: e.currentTarget.checked } })}
              />
              <Switch
                label="Enabled"
                checked={editing.enabled !== false}
                onChange={(e) => setEditing({ ...editing, enabled: e.currentTarget.checked })}
              />
            </Group>
            <Button onClick={save}>Save</Button>
          </Stack>
        )}
      </Modal>

      <Modal opened={!!runZone} onClose={() => setRunZone(null)} title={`Water "${runZone?.name}"`}>
        <Stack>
          <SliderInput label="Duration" value={runMinutes} onChange={setRunMinutes} min={1} max={runZone?.maxRuntimeMin ?? 120} />
          <Text size="xs" c="dimmed">
            Manual runs always start (rain sensor / weather are ignored) and switch off automatically when the timer ends.
          </Text>
          <Button onClick={startRun}>Start</Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
