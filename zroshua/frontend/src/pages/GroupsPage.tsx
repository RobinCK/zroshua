import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconEdit, IconPlayerPlay, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, Group as ZGroup, GroupRule, Settings, Zone } from '../api';
import { useResource } from '../hooks';
import { SliderInput } from '../components/common';
import ScheduleEditor, { emptySchedule, estimateRunMinutes, ZoneInfo } from '../components/ScheduleEditor';
import { BusyBand, overlapsConflict, toMin } from '../components/TimeSlotPicker';

export default function GroupsPage() {
  const { data: groups, reload } = useResource<ZGroup[]>('/groups');
  const { data: zones } = useResource<Zone[]>('/zones');
  const { data: rules, reload: reloadRules } = useResource<GroupRule[]>('/rules');
  const { data: settings } = useResource<Settings>('/settings');
  const [editing, setEditing] = useState<Partial<ZGroup> | null>(null);
  const [busy, setBusy] = useState<BusyBand[]>([]);
  const [ruleType, setRuleType] = useState<'mutex' | 'order' | 'parallel_ok'>('mutex');
  const [ruleGroups, setRuleGroups] = useState<string[]>([]);
  const [ruleBefore, setRuleBefore] = useState<string | null>(null);
  const [ruleAfter, setRuleAfter] = useState<string | null>(null);

  const notifyErr = (e: any) => notifications.show({ message: e.message, color: 'red' });
  const groupOpts = (groups ?? []).map((g) => ({ value: g.id, label: g.name }));

  const openEditor = (g: Partial<ZGroup>) => {
    setEditing({ ...g });
    setBusy([]);
    const q = g.id ? `?excludeKind=group&excludeId=${g.id}` : '';
    api.get<{ bands: BusyBand[] }>(`/busy-week${q}`).then((r) => setBusy(r.bands)).catch(() => setBusy([]));
  };

  const conflictSummary = (g: Partial<ZGroup>): string[] => {
    const zi = zoneInfoFor(g.zoneIds ?? []);
    const out: string[] = [];
    for (const sch of (g.schedules ?? []).filter((x) => x.enabled)) {
      const dur = Math.max(1, estimateRunMinutes(sch, zi, g.mode ?? 'sequential', g.parallelLimit ?? 2, g.interZoneDelayS ?? 0, g.multiplierPct ?? 100) * worstFactor);
      const entries: { dows: number[]; start: string }[] =
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
      const conflicts = conflictSummary(editing);
      if (editing.id) await api.put(`/groups/${editing.id}`, editing);
      else await api.post('/groups', editing);
      if (conflicts.length)
        notifications.show({
          title: 'Saved with rule conflicts',
          message: `${conflicts.join('; ')} — resolve on the Timeline page or rely on the conflict policy.`,
          color: 'red',
          autoClose: 10000,
        });
      setEditing(null);
      reload();
    } catch (e) {
      notifyErr(e);
    }
  };

  const addRule = async () => {
    try {
      const body =
        ruleType === 'order' ? { type: ruleType, before: ruleBefore, after: ruleAfter, groups: [] } : { type: ruleType, groups: ruleGroups };
      await api.post('/rules', body);
      setRuleGroups([]);
      setRuleBefore(null);
      setRuleAfter(null);
      reloadRules();
    } catch (e) {
      notifyErr(e);
    }
  };

  const worstFactor = settings?.tempScale.enabled
    ? 1 + settings.tempScale.steps.reduce((acc, st) => acc + Math.max(0, st.pct ?? 0), 0) / 100
    : 1;
  const zoneInfoFor = (ids: string[]): ZoneInfo[] =>
    ids
      .map((id) => zones?.find((z) => z.id === id))
      .filter((z): z is Zone => !!z && z.enabled)
      .map((z) => ({ id: z.id, name: z.name, baseMin: z.baseDurationMin, maxRuntimeMin: z.maxRuntimeMin }));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Groups & schedules</Title>
        <Button onClick={() => openEditor({ name: '', zoneIds: [], mode: 'sequential', parallelLimit: 2, interZoneDelayS: 0, multiplierPct: 100, priority: 0, schedules: [], enabled: true })}>
          Add group
        </Button>
      </Group>

      {(groups ?? []).map((g) => (
        <Card key={g.id} withBorder>
          <Group justify="space-between">
            <Group gap="xs">
              <Text fw={600}>{g.name}</Text>
              <Badge variant="light">{g.mode}</Badge>
              {!g.enabled && <Badge color="gray">disabled</Badge>}
              <Badge variant="light" color="grape">
                ×{g.multiplierPct}%
              </Badge>
            </Group>
            <Group gap={4}>
              <ActionIcon
                variant="light"
                color="teal"
                title="Run group now"
                onClick={() =>
                  api
                    .post(`/groups/${g.id}/run`)
                    .then(() => notifications.show({ message: `Group "${g.name}" started`, color: 'teal' }))
                    .catch(notifyErr)
                }
              >
                <IconPlayerPlay size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" onClick={() => openEditor(g)}>
                <IconEdit size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="red" onClick={() => api.del(`/groups/${g.id}`).then(reload).catch(notifyErr)}>
                <IconTrash size={18} />
              </ActionIcon>
            </Group>
          </Group>
          <Text size="sm" c="dimmed">
            {g.zoneIds.map((id) => zones?.find((z) => z.id === id)?.name ?? id).join(' → ') || 'no zones'}
          </Text>
          <Text size="xs" c="dimmed">
            {g.schedules.filter((s) => s.enabled).length} active schedule(s)
          </Text>
        </Card>
      ))}

      <Card withBorder>
        <Title order={4} mb="sm">
          Rules between groups
        </Title>
        <Table>
          <Table.Tbody>
            {(rules ?? []).map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  {r.type === 'order' ? (
                    <Text size="sm">
                      <Badge variant="light" color="orange" mr={6}>
                        order
                      </Badge>
                      {groupOpts.find((g) => g.value === r.before)?.label ?? r.before} <b>before</b>{' '}
                      {groupOpts.find((g) => g.value === r.after)?.label ?? r.after}
                    </Text>
                  ) : (
                    <Text size="sm">
                      <Badge variant="light" color={r.type === 'mutex' ? 'red' : 'teal'} mr={6}>
                        {r.type === 'mutex' ? 'never overlap' : 'may run in parallel'}
                      </Badge>
                      {r.groups.map((id) => groupOpts.find((g) => g.value === id)?.label ?? id).join(' + ')}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td w={40}>
                  <ActionIcon variant="subtle" color="red" onClick={() => api.del(`/rules/${r.id}`).then(reloadRules).catch(notifyErr)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Group mt="sm" align="end">
          <Select
            label="Rule"
            w={180}
            data={[
              { value: 'mutex', label: 'Never overlap' },
              { value: 'order', label: 'Order (A before B)' },
              { value: 'parallel_ok', label: 'May run in parallel' },
            ]}
            value={ruleType}
            onChange={(v) => setRuleType((v as any) ?? 'mutex')}
          />
          {ruleType === 'order' ? (
            <>
              <Select label="First (A)" data={groupOpts} value={ruleBefore} onChange={setRuleBefore} w={180} />
              <Select label="Then (B)" data={groupOpts} value={ruleAfter} onChange={setRuleAfter} w={180} />
            </>
          ) : (
            <MultiSelect label="Groups" data={groupOpts} value={ruleGroups} onChange={setRuleGroups} w={280} />
          )}
          <Button onClick={addRule}>Add rule</Button>
        </Group>
      </Card>

      <Modal opened={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit group' : 'New group'} size="xl">
        {editing && (
          <Stack>
            <TextInput label="Name" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            <MultiSelect
              label="Zones (order = watering order)"
              data={(zones ?? []).map((z) => ({ value: z.id, label: z.name }))}
              value={editing.zoneIds ?? []}
              onChange={(v) => setEditing({ ...editing, zoneIds: v })}
            />
            <Group grow>
              <Select
                label="Execution mode"
                data={[
                  { value: 'sequential', label: 'Sequential (one at a time)' },
                  { value: 'parallel', label: 'Parallel (all together)' },
                  { value: 'parallel_limit', label: 'Parallel with limit' },
                ]}
                value={editing.mode ?? 'sequential'}
                onChange={(v) => setEditing({ ...editing, mode: (v as any) ?? 'sequential' })}
              />
              {editing.mode === 'parallel_limit' && (
                <NumberInput label="Max zones at once" value={editing.parallelLimit ?? 2} onChange={(v) => setEditing({ ...editing, parallelLimit: Number(v) || 2 })} min={1} />
              )}
              <NumberInput
                label="Delay between zones (s)"
                value={editing.interZoneDelayS ?? 0}
                onChange={(v) => setEditing({ ...editing, interZoneDelayS: Number(v) || 0 })}
              />
              <NumberInput label="Priority" value={editing.priority ?? 0} onChange={(v) => setEditing({ ...editing, priority: Number(v) || 0 })} />
            </Group>
            <SliderInput label="Group multiplier" value={editing.multiplierPct ?? 100} onChange={(v) => setEditing({ ...editing, multiplierPct: v })} min={0} max={200} unit="%" />

            <Group justify="space-between">
              <Text fw={600}>Schedules</Text>
              <Button size="xs" variant="light" onClick={() => setEditing({ ...editing, schedules: [...(editing.schedules ?? []), emptySchedule()] })}>
                Add schedule
              </Button>
            </Group>
            {(editing.schedules ?? []).map((s, i) => (
              <ScheduleEditor
                key={s.id}
                schedule={s}
                zones={zoneInfoFor(editing.zoneIds ?? [])}
                mode={editing.mode ?? 'sequential'}
                parallelLimit={editing.parallelLimit ?? 2}
                interZoneDelayS={editing.interZoneDelayS ?? 0}
                multiplierPct={editing.multiplierPct ?? 100}
                worstFactor={worstFactor}
                busy={busy}
                onChange={(ns) => {
                  const next = [...(editing.schedules ?? [])];
                  next[i] = ns;
                  setEditing({ ...editing, schedules: next });
                }}
                onDelete={() => setEditing({ ...editing, schedules: (editing.schedules ?? []).filter((_, j) => j !== i) })}
              />
            ))}

            <Switch label="Enabled" checked={editing.enabled !== false} onChange={(e) => setEditing({ ...editing, enabled: e.currentTarget.checked })} />
            <Button onClick={save}>Save</Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
