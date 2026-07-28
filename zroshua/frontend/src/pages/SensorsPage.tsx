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
  TextInput,
  Title,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, Group as ZGroup, Settings, SoilTrigger, TempTrigger, Zone } from '../api';
import { useResource } from '../hooks';
import { EntityMultiSelect, EntitySelect, SliderInput } from '../components/common';
import { t } from '../i18n';
import { HintLabel, HintTitle } from '../components/Hint';

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
      notifications.show({ message: t('Saved'), color: 'teal' });
      reload();
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' });
    }
  };

  const targetOpts = [
    ...(zones ?? []).map((z) => ({ value: `zone:${z.id}`, label: t('Zone: {name}', { name: z.name }) })),
    ...(groups ?? []).map((g) => ({ value: `group:${g.id}`, label: t('Group: {name}', { name: g.name }) })),
  ];

  return (
    <Stack>
      <Title order={3}>{t('Sensors')}</Title>

      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <HintTitle
            title={t('Rain sensor')}
            hint={
              <>
                {t('from leak / moisture sensors')}
                <br />
                <br />
                {t('Wet at start time → the run is skipped with a journal reason. Rain during a run → affected zones stop. Zones with the "ignore rain sensor" flag keep running. Manual runs always ignore the rain sensor.')}
              </>
            }
          />
          <Switch
            label={t('Enabled')}
            checked={s.rainSensor.enabled}
            onChange={(e) => setS({ ...s, rainSensor: { ...s.rainSensor, enabled: e.currentTarget.checked } })}
          />
        </Group>
        <Stack>
          <EntityMultiSelect
            label={<HintLabel label={t('Sensors')} hint={t('any binary_sensor; several supported')} />}
            value={s.rainSensor.entities}
            onChange={(v) => setS({ ...s, rainSensor: { ...s.rainSensor, entities: v } })}
            domains={['binary_sensor']}
          />
          <Group grow>
            <NumberInput
              label={<HintLabel label={t('Quorum')} hint={t('how many must be wet')} />}
              min={1}
              value={s.rainSensor.quorum}
              onChange={(v) => setS({ ...s, rainSensor: { ...s.rainSensor, quorum: Number(v) || 1 } })}
            />
            <Select
              label={t('When rain starts during watering')}
              data={[
                { value: 'stop_all', label: t('Stop all zones') },
                { value: 'stop_linked', label: t('Stop linked zones only') },
              ]}
              value={s.rainSensor.onWetDuringRun}
              onChange={(v) => setS({ ...s, rainSensor: { ...s.rainSensor, onWetDuringRun: (v as any) ?? 'stop_all' } })}
            />
          </Group>
          <SliderInput
            label={<HintLabel label={t('Dry-out delay')} hint={t('watering stays blocked after rain')} />}
            value={s.rainSensor.dryOutHours}
            onChange={(v) => setS({ ...s, rainSensor: { ...s.rainSensor, dryOutHours: v } })}
            min={0}
            max={72}
            unit="h"
          />
        </Stack>
      </Card>

      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={4}>{t('Soil moisture triggers')}</Title>
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
            {t('Add trigger')}
          </Button>
        </Group>
        <Stack>
          {s.soilTriggers.map((trigger, i) => {
            const set = (patch: Partial<SoilTrigger>) => {
              const next = [...s.soilTriggers];
              next[i] = { ...trigger, ...patch };
              setS({ ...s, soilTriggers: next });
            };
            return (
              <Card key={trigger.id} withBorder p="sm">
                <Group justify="space-between" mb="xs">
                  <Switch label={t('Enabled')} checked={trigger.enabled} onChange={(e) => set({ enabled: e.currentTarget.checked })} />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => setS({ ...s, soilTriggers: s.soilTriggers.filter((_, j) => j !== i) })}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                <Group grow>
                  <EntitySelect label={t('Moisture sensor (%)')} value={trigger.sensor || null} onChange={(v) => set({ sensor: v ?? '' })} domains={['sensor']} />
                  <Select
                    label={t('Waters')}
                    data={targetOpts}
                    value={`${trigger.targetKind}:${trigger.targetId}`}
                    onChange={(v) => {
                      const [kind, id] = (v ?? 'zone:').split(':');
                      set({ targetKind: kind as 'zone' | 'group', targetId: id });
                    }}
                  />
                </Group>
                <Group grow mt="xs">
                  <NumberInput
                    label={t('Start below (%)')}
                    value={trigger.startBelowPct ?? ''}
                    onChange={(v) => set({ startBelowPct: v === '' ? null : Number(v) })}
                  />
                  <NumberInput label={t('Run (min)')} value={trigger.runMin} onChange={(v) => set({ runMin: Number(v) || 15 })} />
                  <NumberInput
                    label={<HintLabel label={t('Cooldown (h)')} hint={t('Sensor is slow — wait before re-checking')} />}
                    value={trigger.cooldownHours}
                    onChange={(v) => set({ cooldownHours: Number(v) || 6 })}
                  />
                </Group>
                <Group grow mt="xs">
                  <NumberInput
                    label={t('Block scheduled watering above (%)')}
                    value={trigger.blockAbovePct ?? ''}
                    onChange={(v) => set({ blockAbovePct: v === '' ? null : Number(v) })}
                  />
                  <NumberInput
                    label={t('Ignore if data older than (h)')}
                    value={trigger.staleAfterHours}
                    onChange={(v) => set({ staleAfterHours: Number(v) || 12 })}
                  />
                </Group>
                <Switch
                  mt="xs"
                  label={<HintLabel label={t('Ignore rain sensor')} hint={t('Fire and keep watering even while the rain sensor is wet — e.g. soil under a roof or in a greenhouse')} />}
                  checked={!!trigger.ignoreRainSensor}
                  onChange={(e) => set({ ignoreRainSensor: e.currentTarget.checked })}
                />
              </Card>
            );
          })}
        </Stack>
      </Card>

      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <HintTitle title={t('Temperature triggers')} hint={t('Cooling runs on hot days: when the live temperature crosses the threshold inside the daily window, water the target for a few minutes — at most once per cooldown. More flexible than a fixed midday schedule: it fires at 12:10 in a heat wave and stays quiet on a cloudy day.')} />
          <Button
            size="xs"
            variant="light"
            onClick={() =>
              setS({
                ...s,
                tempTriggers: [
                  ...(s.tempTriggers ?? []),
                  {
                    id: `tt${Date.now()}`,
                    sensor: '',
                    aboveC: 33,
                    windowFrom: '12:00',
                    windowTo: '16:00',
                    targetKind: 'zone',
                    targetId: zones?.[0]?.id ?? '',
                    runMin: 10,
                    cooldownHours: 24,
                    enabled: true,
                  },
                ],
              })
            }
          >
            {t('Add trigger')}
          </Button>
        </Group>
        <Stack>
          {(s.tempTriggers ?? []).map((trigger, i) => {
            const set = (patch: Partial<TempTrigger>) => {
              const next = [...(s.tempTriggers ?? [])];
              next[i] = { ...trigger, ...patch };
              setS({ ...s, tempTriggers: next });
            };
            return (
              <Card key={trigger.id} withBorder p="sm">
                <Group justify="space-between" mb="xs">
                  <Switch label={t('Enabled')} checked={trigger.enabled} onChange={(e) => set({ enabled: e.currentTarget.checked })} />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => setS({ ...s, tempTriggers: (s.tempTriggers ?? []).filter((_, j) => j !== i) })}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                <Group grow>
                  <EntitySelect label={t('Temperature sensor')} value={trigger.sensor || null} onChange={(v) => set({ sensor: v ?? '' })} domains={['sensor']} />
                  <Select
                    label={t('Waters')}
                    data={targetOpts}
                    value={`${trigger.targetKind}:${trigger.targetId}`}
                    onChange={(v) => {
                      const [kind, id] = (v ?? 'zone:').split(':');
                      set({ targetKind: kind as 'zone' | 'group', targetId: id });
                    }}
                  />
                </Group>
                <Group grow mt="xs">
                  <NumberInput label={t('Above (°C)')} value={trigger.aboveC} onChange={(v) => set({ aboveC: Number(v) || 30 })} />
                  <TextInput type="time" label={t('Window from')} value={trigger.windowFrom} onChange={(e) => e.target.value && set({ windowFrom: e.target.value })} />
                  <TextInput type="time" label={t('Window to')} value={trigger.windowTo} onChange={(e) => e.target.value && set({ windowTo: e.target.value })} />
                </Group>
                <Group grow mt="xs">
                  <NumberInput label={t('Run (min)')} value={trigger.runMin} onChange={(v) => set({ runMin: Number(v) || 10 })} />
                  <NumberInput
                    label={<HintLabel label={t('Cooldown (h)')} hint={t('24 = at most once a day')} />}
                    value={trigger.cooldownHours}
                    onChange={(v) => set({ cooldownHours: Number(v) || 24 })}
                  />
                </Group>
                <Switch
                  mt="xs"
                  label={t('Ignore rain sensor')}
                  checked={!!trigger.ignoreRainSensor}
                  onChange={(e) => set({ ignoreRainSensor: e.currentTarget.checked })}
                />
              </Card>
            );
          })}
        </Stack>
      </Card>

      <Button onClick={save}>{t('Save sensors')}</Button>
    </Stack>
  );
}
