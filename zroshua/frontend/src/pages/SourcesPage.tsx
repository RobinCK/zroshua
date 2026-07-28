import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, Group as ZGroup, WaterSource } from '../api';
import { useResource } from '../hooks';
import { EntitySelect } from '../components/common';
import { t } from '../i18n';
import { HintLabel, HintTitle } from '../components/Hint';

export default function SourcesPage() {
  const { data: sources, reload } = useResource<WaterSource[]>('/sources');
  const { data: groups } = useResource<ZGroup[]>('/groups');
  const [editing, setEditing] = useState<Partial<WaterSource> | null>(null);
  const notifyErr = (e: any) => notifications.show({ message: e.message, color: 'red' });

  const save = async () => {
    if (!editing?.name) return;
    try {
      if (editing.id && sources?.some((s) => s.id === editing.id)) await api.put(`/sources/${editing.id}`, editing);
      else await api.post('/sources', editing);
      setEditing(null);
      reload();
    } catch (e) {
      notifyErr(e);
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <HintTitle title={t('Water sources')} hint={t('Sources make hydraulics declarative: flow budgets, pump control with lead/lag delays, dependencies (e.g. a barrel refilled from the well) and pump energy metering counted only while watering.')} order={3} />
        <Button onClick={() => setEditing({ name: '', type: 'well', pumpStartDelayS: 0, pumpStopDelayS: 0 })}>{t('Add source')}</Button>
      </Group>

      {(sources ?? []).map((s) => (
        <Card key={s.id} withBorder>
          <Group justify="space-between">
            <Group gap="xs">
              <Text fw={600}>{s.name}</Text>
              <Text size="sm" c="dimmed">
                {{ well: t('well'), barrel: t('barrel'), mains: t('mains') }[s.type] ?? s.type}
                {s.maxFlowLpm ? ` · ${t('budget {n} l/min', { n: s.maxFlowLpm })}` : ''}
                {s.dependsOn ? ` · ${t('depends on {name}', { name: sources?.find((x) => x.id === s.dependsOn)?.name ?? s.dependsOn })}` : ''}
                {s.pumpEntity ? ` · ${t('pump')}` : ''}
                {s.energyEntity ? ` · ${t('energy meter')}` : ''}
              </Text>
            </Group>
            <Group gap={4}>
              <ActionIcon variant="subtle" onClick={() => setEditing({ ...s })}>
                <IconEdit size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="red" onClick={() => api.del(`/sources/${s.id}`).then(reload).catch(notifyErr)}>
                <IconTrash size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </Card>
      ))}

      <Modal opened={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t('Edit source') : t('New source')} size="lg">
        {editing && (
          <Stack>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" verticalSpacing="xs">
              <TextInput label={t('Name')} value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
              <Select
                label={t('Type')}
                data={[
                  { value: 'well', label: t('well') },
                  { value: 'barrel', label: t('barrel') },
                  { value: 'mains', label: t('mains') },
                ]}
                value={editing.type ?? 'well'}
                onChange={(v) => setEditing({ ...editing, type: v ?? 'well' })}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" verticalSpacing="xs">
              <NumberInput
                label={<HintLabel label={t('Max flow budget')} hint={t('l/min, empty = unlimited')} />}
                value={editing.maxFlowLpm ?? ''}
                onChange={(v) => setEditing({ ...editing, maxFlowLpm: v === '' ? null : Number(v) })}
              />
              <Select
                label={<HintLabel label={t('Depends on')} hint={t('blocked while that source runs')} />}
                data={(sources ?? []).filter((s) => s.id !== editing.id).map((s) => ({ value: s.id, label: s.name }))}
                value={editing.dependsOn ?? null}
                onChange={(v) => setEditing({ ...editing, dependsOn: v })}
                clearable
              />
            </SimpleGrid>
            <Group grow align="flex-start" wrap="wrap">
              <EntitySelect
                label={<HintLabel label={t('Pump entity')} hint={t('kept on while any zone of this source runs')} />}
                value={editing.pumpEntity ?? null}
                onChange={(v) => setEditing({ ...editing, pumpEntity: v })}
                domains={['switch', 'input_boolean']}
              />
              {editing.pumpEntity && (
                <Select
                  label={<HintLabel label={t('When the run finishes')} hint={t('Use “Keep on” or “Restore” if the pump also feeds the house / water outlets and must not be switched off.')} />}
                  data={[
                    { value: 'off', label: t('Turn the pump off') },
                    { value: 'keep_on', label: t('Leave the pump on') },
                    { value: 'restore', label: t('Restore the state it had before (off only if it was off)') },
                  ]}
                  value={editing.pumpAfterRun ?? 'off'}
                  onChange={(v) => setEditing({ ...editing, pumpAfterRun: (v as 'off' | 'keep_on' | 'restore') ?? 'off' })}
                />
              )}
            </Group>
            {editing.pumpEntity && (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" verticalSpacing="xs">
                <NumberInput
                  label={<HintLabel label={t('Pump start delay')} hint={t('s before valve opens')} />}
                  value={editing.pumpStartDelayS ?? 0}
                  onChange={(v) => setEditing({ ...editing, pumpStartDelayS: Number(v) || 0 })}
                />
                <NumberInput
                  label={<HintLabel label={t('Pump stop delay')} hint={t('s after last valve closes')} />}
                  value={editing.pumpStopDelayS ?? 0}
                  onChange={(v) => setEditing({ ...editing, pumpStopDelayS: Number(v) || 0 })}
                />
              </SimpleGrid>
            )}
            <EntitySelect
              label={<HintLabel label={t('Energy meter')} hint={t('W or kWh sensor, counted only during watering')} />}
              value={editing.energyEntity ?? null}
              onChange={(v) => setEditing({ ...editing, energyEntity: v })}
              domains={['sensor']}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" verticalSpacing="xs">
              <NumberInput
                label={<HintLabel label={t('Energy tail after watering')} hint={t('min, e.g. barrel refill')} />}
                value={editing.energyTail?.minutes ?? 0}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    energyTail: Number(v) ? { minutes: Number(v), afterGroups: editing.energyTail?.afterGroups ?? {} } : null,
                  })
                }
              />
            </SimpleGrid>
            {editing.energyTail && (
              <Stack gap={4}>
                <Text size="sm">{t('Count the tail after these groups:')}</Text>
                {(groups ?? []).map((g) => (
                  <Checkbox
                    key={g.id}
                    label={g.name}
                    checked={editing.energyTail?.afterGroups?.[g.id] !== false}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        energyTail: {
                          minutes: editing.energyTail!.minutes,
                          afterGroups: { ...editing.energyTail!.afterGroups, [g.id]: e.currentTarget.checked },
                        },
                      })
                    }
                  />
                ))}
              </Stack>
            )}
            <EntitySelect
              label={<HintLabel label={t('"Water available" sensor')} hint={t('blocks watering when off')} />}
              value={editing.okSensor ?? null}
              onChange={(v) => setEditing({ ...editing, okSensor: v })}
              domains={['binary_sensor']}
            />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs" verticalSpacing="xs">
              <EntitySelect
                label={<HintLabel label={t('Flow sensor')} hint={t('l/min, optional')} />}
                value={editing.flowSensor ?? null}
                onChange={(v) => setEditing({ ...editing, flowSensor: v })}
                domains={['sensor']}
              />
              <NumberInput
                label={<HintLabel label={t('Idle flow')} hint={t('Idle-flow alert threshold')} />}
                suffix={` ${t('l/min')}`}
                value={editing.idleFlowAlertLpm ?? ''}
                onChange={(v) => setEditing({ ...editing, idleFlowAlertLpm: v === '' ? null : Number(v) })}
              />
              <NumberInput
                label={<HintLabel label={t('Flow deviation')} hint={t('Alert when measured flow differs from the running zones\' total')} />}
              suffix=" %"
                value={editing.flowDeviationPct ?? ''}
                onChange={(v) => setEditing({ ...editing, flowDeviationPct: v === '' ? null : Number(v) })}
              />
            </SimpleGrid>
            <MultiSelect
              label={
                <HintLabel
                  label={t('Never run at the same time as')}
                  hint={
                    <>
                      {t('source exclusivity')}
                      <br />
                      <br />
                      {t('One rule instead of many group pairs — all groups fed by these sources never overlap; new groups inherit it')}
                    </>
                  }
                />
              }
              data={(sources ?? []).filter((x) => x.id !== editing.id).map((x) => ({ value: x.id, label: x.name }))}
              value={editing.exclusiveWithSourceIds ?? []}
              onChange={(v) => setEditing({ ...editing, exclusiveWithSourceIds: v })}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" verticalSpacing="xs">
              <NumberInput
                label={<HintLabel label={t('Capacity')} hint={t('Capacity (L) — enables barrel level tracking')} />}
                suffix={` ${t('L')}`}
                value={editing.capacityL ?? ''}
                onChange={(v) => setEditing({ ...editing, capacityL: v === '' ? null : Number(v) })}
              />
              <NumberInput
                label={<HintLabel label={t('Refill rate')} hint={t('l/min')} />}
                suffix={` ${t('l/min')}`}
                value={editing.refillLpm ?? ''}
                onChange={(v) => setEditing({ ...editing, refillLpm: v === '' ? null : Number(v) })}
              />
            </SimpleGrid>
            {editing.capacityL ? (
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs" verticalSpacing="xs">
                <EntitySelect
                  label={<HintLabel label={t('Level sensor')} hint={t('Level sensor (%) — overrides the estimate')} />}
                  value={editing.levelEntity ?? null}
                  onChange={(v) => setEditing({ ...editing, levelEntity: v })}
                  domains={['sensor']}
                />
                <NumberInput
                  label={t('Warn below')}
                  suffix=" %"
                  value={editing.lowReservePct ?? 20}
                  onChange={(v) => setEditing({ ...editing, lowReservePct: v === '' ? null : Number(v) })}
                />
                <NumberInput
                  label={<HintLabel label={t('Block below')} hint={t('Block scheduled runs below (%)')} />}
                  suffix=" %"
                  value={editing.blockBelowPct ?? ''}
                  onChange={(v) => setEditing({ ...editing, blockBelowPct: v === '' ? null : Number(v) })}
                />
              </SimpleGrid>
            ) : null}
            <Button onClick={save}>{t('Save')}</Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
