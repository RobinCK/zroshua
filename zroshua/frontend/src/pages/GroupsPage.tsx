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
import { IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, EngineState, Group as ZGroup, GroupRule, Settings, Zone } from '../api';
import { useResource } from '../hooks';
import { t } from '../i18n';
import { SliderInput } from '../components/common';

import ScheduleEditor, { emptySchedule, estimateRunMinutes, ZoneInfo } from '../components/ScheduleEditor';
import { BusyBand, overlapsConflict, toMin } from '../components/TimeSlotPicker';
import { CardGrid } from '../ui/kit';
import { GroupCard } from '../ui/garden';
import { groupView } from '../view/garden';
import { actions } from '../view/actions';
import { useGarden } from '../view/useGarden';
import { HintLabel } from '../components/Hint';


export default function GroupsPage({ state }: { state: EngineState | null }) {
  const { data: groups, reload } = useResource<ZGroup[]>('/groups');
  const { data: zones } = useResource<Zone[]>('/zones');
  const { data: rules, reload: reloadRules } = useResource<GroupRule[]>('/rules');
  const { data: settings } = useResource<Settings>('/settings');
  const { garden, reload: reloadGarden } = useGarden(state, ['upcoming', 'lastRuns', 'sources']);
  const reloadAll = () => {
    reload();
    reloadGarden();
  };
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
        if (hit) out.push(t('{start} overlaps "{label}"', { start: e.start, label: hit.label }));
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
          title: t('Saved with rule conflicts'),
          message: t('{conflicts} — resolve on the Timeline page or rely on the conflict policy.', { conflicts: conflicts.join('; ') }),
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
        <Title order={3}>{t('Groups & schedules')}</Title>
        <Button onClick={() => openEditor({ name: '', zoneIds: [], mode: 'sequential', parallelLimit: 2, interZoneDelayS: 0, multiplierPct: 100, priority: 0, schedules: [], enabled: true })}>
          {t('Add group')}
        </Button>
      </Group>

      <CardGrid min={300}>
        {(groups ?? []).map((g) => (
          <GroupCard
            key={g.id}
            group={groupView({ ...garden, groups: groups ?? [], zones: zones ?? [] }, g)}
            onRun={(id) => actions.runGroup(id, g.name, undefined, reloadAll)}
            onStop={(id) => actions.stopGroup(id, reloadAll)}
            onPause={(id) => actions.pauseGroup(id, 24, reloadAll)}
            onResume={(id) => actions.pauseGroup(id, 0, reloadAll)}
            onOpen={() => openEditor(g)}
            onEdit={() => openEditor(g)}
          />
        ))}
      </CardGrid>

      <Card withBorder>
        <Title order={4} mb="sm">
          {t('Rules between groups')}
        </Title>
        <Table>
          <Table.Tbody>
            {(rules ?? []).map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  {r.type === 'order' ? (
                    <Text size="sm">
                      <Badge variant="light" color="orange" mr={6}>
                        {t('order')}
                      </Badge>
                      {groupOpts.find((g) => g.value === r.before)?.label ?? r.before} <b>{t('before')}</b>{' '}
                      {groupOpts.find((g) => g.value === r.after)?.label ?? r.after}
                    </Text>
                  ) : (
                    <Text size="sm">
                      <Badge variant="light" color={r.type === 'mutex' ? 'red' : 'teal'} mr={6}>
                        {r.type === 'mutex' ? t('never overlap') : t('may run in parallel')}
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
            label={t('Rule')}
            w={180}
            data={[
              { value: 'mutex', label: t('Never overlap') },
              { value: 'order', label: t('Order (A before B)') },
              { value: 'parallel_ok', label: t('May run in parallel') },
            ]}
            value={ruleType}
            onChange={(v) => setRuleType((v as any) ?? 'mutex')}
          />
          {ruleType === 'order' ? (
            <>
              <Select label={t('First (A)')} data={groupOpts} value={ruleBefore} onChange={setRuleBefore} w={180} />
              <Select label={t('Then (B)')} data={groupOpts} value={ruleAfter} onChange={setRuleAfter} w={180} />
            </>
          ) : (
            <MultiSelect label={t('Groups')} data={groupOpts} value={ruleGroups} onChange={setRuleGroups} w={280} />
          )}
          <Button onClick={addRule}>{t('Add rule')}</Button>
        </Group>
      </Card>

      <Modal opened={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t('Edit group') : t('New group')} size="xl">
        {editing && (
          <Stack>
            <TextInput label={t('Name')} value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            <MultiSelect
              label={<HintLabel label={t('Zones')} hint={t('order = watering order')} />}
              data={(zones ?? []).map((z) => ({ value: z.id, label: z.name }))}
              value={editing.zoneIds ?? []}
              onChange={(v) => setEditing({ ...editing, zoneIds: v })}
            />
            <Group grow>
              <Select
                label={t('Execution mode')}
                data={[
                  { value: 'sequential', label: t('Sequential (one at a time)') },
                  { value: 'parallel', label: t('Parallel (all together)') },
                  { value: 'parallel_limit', label: t('Parallel with limit') },
                ]}
                value={editing.mode ?? 'sequential'}
                onChange={(v) => setEditing({ ...editing, mode: (v as any) ?? 'sequential' })}
              />
              {editing.mode === 'parallel_limit' && (
                <NumberInput label={t('Max zones at once')} value={editing.parallelLimit ?? 2} onChange={(v) => setEditing({ ...editing, parallelLimit: Number(v) || 2 })} min={1} />
              )}
              <NumberInput
                label={t('Delay between zones (s)')}
                value={editing.interZoneDelayS ?? 0}
                onChange={(v) => setEditing({ ...editing, interZoneDelayS: Number(v) || 0 })}
              />
              <NumberInput label={t('Priority')} value={editing.priority ?? 0} onChange={(v) => setEditing({ ...editing, priority: Number(v) || 0 })} />
            </Group>
            <SliderInput label={t('Group multiplier')} value={editing.multiplierPct ?? 100} onChange={(v) => setEditing({ ...editing, multiplierPct: v })} min={0} max={200} unit="%" />

            <Group justify="space-between">
              <Text fw={600}>{t('Schedules')}</Text>
              <Button size="xs" variant="light" onClick={() => setEditing({ ...editing, schedules: [...(editing.schedules ?? []), emptySchedule()] })}>
                {t('Add schedule')}
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

            <Switch label={t('Enabled')} checked={editing.enabled !== false} onChange={(e) => setEditing({ ...editing, enabled: e.currentTarget.checked })} />
            <Group justify="space-between">
              <Button onClick={save}>{t('Save')}</Button>
              {editing.id && (
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() =>
                    api
                      .del(`/groups/${editing.id}`)
                      .then(() => {
                        setEditing(null);
                        reloadAll();
                      })
                      .catch(notifyErr)
                  }
                >
                  {t('Delete group')}
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
