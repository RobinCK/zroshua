import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, Group as ZGroup, Settings, SoilTrigger, Zone } from '../api';
import { useResource } from '../hooks';
import { EntityMultiSelect, EntitySelect, SliderInput } from '../components/common';

export default function SensorsPage() {
  const { data: settings, reload } = useResource<Settings>('/settings');
  const { data: zones } = useResource<Zone[]>('/zones');
  const { data: groups } = useResource<ZGroup[]>('/groups');
  const [s, setS] = useState<Settings | null>(null);

  useEffect(() => {
    if (settings) setS(settings);
  }, [settings]);

  if (!s) return null;

  const save = async () => {
    try {
      await api.put('/settings', s);
      notifications.show({ message: 'Saved', color: 'teal' });
      reload();
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' });
    }
  };

  const targetOpts = [
    ...(zones ?? []).map((z) => ({ value: `zone:${z.id}`, label: `Zone: ${z.name}` })),
    ...(groups ?? []).map((g) => ({ value: `group:${g.id}`, label: `Group: ${g.name}` })),
  ];

  return (
    <Stack>
      <Title order={3}>Sensors</Title>

      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={4}>Rain sensor (from leak / moisture sensors)</Title>
          <Switch
            label="Enabled"
            checked={s.rainSensor.enabled}
            onChange={(e) => setS({ ...s, rainSensor: { ...s.rainSensor, enabled: e.currentTarget.checked } })}
          />
        </Group>
        <Stack>
          <EntityMultiSelect
            label="Sensors (any binary_sensor; several supported)"
            value={s.rainSensor.entities}
            onChange={(v) => setS({ ...s, rainSensor: { ...s.rainSensor, entities: v } })}
            domains={['binary_sensor']}
          />
          <Group grow>
            <NumberInput
              label="Quorum (how many must be wet)"
              min={1}
              value={s.rainSensor.quorum}
              onChange={(v) => setS({ ...s, rainSensor: { ...s.rainSensor, quorum: Number(v) || 1 } })}
            />
            <Select
              label="When rain starts during watering"
              data={[
                { value: 'stop_all', label: 'Stop all zones' },
                { value: 'stop_linked', label: 'Stop linked zones only' },
              ]}
              value={s.rainSensor.onWetDuringRun}
              onChange={(v) => setS({ ...s, rainSensor: { ...s.rainSensor, onWetDuringRun: (v as any) ?? 'stop_all' } })}
            />
          </Group>
          <SliderInput
            label="Dry-out delay (watering stays blocked after rain)"
            value={s.rainSensor.dryOutHours}
            onChange={(v) => setS({ ...s, rainSensor: { ...s.rainSensor, dryOutHours: v } })}
            min={0}
            max={72}
            unit="h"
          />
          <Text size="xs" c="dimmed">
            Wet at start time → the run is skipped with a journal reason. Rain during a run → affected zones stop.
            Zones with the "ignore rain sensor" flag keep running. Manual runs always ignore the rain sensor.
          </Text>
        </Stack>
      </Card>

      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={4}>Soil moisture triggers</Title>
          <Button
            size="xs"
            variant="light"
            onClick={() =>
              setS({
                ...s,
                soilTriggers: [
                  ...s.soilTriggers,
                  {
                    id: `t${Date.now()}`,
                    sensor: '',
                    targetKind: 'zone',
                    targetId: zones?.[0]?.id ?? '',
                    startBelowPct: 30,
                    runMin: 15,
                    cooldownHours: 6,
                    blockAbovePct: null,
                    staleAfterHours: 12,
                    enabled: true,
                  },
                ],
              })
            }
          >
            Add trigger
          </Button>
        </Group>
        <Stack>
          {s.soilTriggers.map((t, i) => {
            const set = (patch: Partial<SoilTrigger>) => {
              const next = [...s.soilTriggers];
              next[i] = { ...t, ...patch };
              setS({ ...s, soilTriggers: next });
            };
            return (
              <Card key={t.id} withBorder p="sm">
                <Group justify="space-between" mb="xs">
                  <Switch label="Enabled" checked={t.enabled} onChange={(e) => set({ enabled: e.currentTarget.checked })} />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => setS({ ...s, soilTriggers: s.soilTriggers.filter((_, j) => j !== i) })}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                <Group grow>
                  <EntitySelect label="Moisture sensor (%)" value={t.sensor || null} onChange={(v) => set({ sensor: v ?? '' })} domains={['sensor']} />
                  <Select
                    label="Waters"
                    data={targetOpts}
                    value={`${t.targetKind}:${t.targetId}`}
                    onChange={(v) => {
                      const [kind, id] = (v ?? 'zone:').split(':');
                      set({ targetKind: kind as 'zone' | 'group', targetId: id });
                    }}
                  />
                </Group>
                <Group grow mt="xs">
                  <NumberInput
                    label="Start below (%)"
                    value={t.startBelowPct ?? ''}
                    onChange={(v) => set({ startBelowPct: v === '' ? null : Number(v) })}
                  />
                  <NumberInput label="Run (min)" value={t.runMin} onChange={(v) => set({ runMin: Number(v) || 15 })} />
                  <NumberInput
                    label="Cooldown (h)"
                    description="Sensor is slow — wait before re-checking"
                    value={t.cooldownHours}
                    onChange={(v) => set({ cooldownHours: Number(v) || 6 })}
                  />
                </Group>
                <Group grow mt="xs">
                  <NumberInput
                    label="Block scheduled watering above (%)"
                    value={t.blockAbovePct ?? ''}
                    onChange={(v) => set({ blockAbovePct: v === '' ? null : Number(v) })}
                  />
                  <NumberInput
                    label="Ignore if data older than (h)"
                    value={t.staleAfterHours}
                    onChange={(v) => set({ staleAfterHours: Number(v) || 12 })}
                  />
                </Group>
                <Switch
                  mt="xs"
                  label="Ignore rain sensor"
                  description="Fire and keep watering even while the rain sensor is wet — e.g. soil under a roof or in a greenhouse"
                  checked={!!t.ignoreRainSensor}
                  onChange={(e) => set({ ignoreRainSensor: e.currentTarget.checked })}
                />
              </Card>
            );
          })}
        </Stack>
      </Card>

      <Button onClick={save}>Save sensors</Button>
    </Stack>
  );
}
