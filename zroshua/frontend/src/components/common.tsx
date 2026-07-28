import { Select, MultiSelect, Slider, Group, Text, NumberInput, Menu, ActionIcon } from '@mantine/core';
import { IconPlayerPause, IconPlayerPauseFilled } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useResource } from '../hooks';
import { api, HaEntity } from '../api';
import { t, locale } from '../i18n';

/** Pause/resume automatic runs for a group or zone. `path` is e.g. `/groups/beds` or `/zones/bed1`. */
export function PauseControl({
  path,
  pausedUntil,
  onChange,
}: {
  path: string;
  pausedUntil: number | null;
  onChange?: () => void;
}) {
  const paused = !!pausedUntil && pausedUntil > Date.now();
  const until = paused ? new Date(pausedUntil!).toLocaleString(locale) : '';
  const set = (hours: number) =>
    api
      .post(`${path}/pause`, { hours })
      .then(() => {
        notifications.show({ message: hours ? t('paused') : t('Resume'), color: hours ? 'orange' : 'teal' });
        onChange?.();
      })
      .catch((e) => notifications.show({ message: e.message, color: 'red' }));
  return (
    <Menu shadow="md" position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant={paused ? 'light' : 'subtle'}
          color={paused ? 'orange' : 'gray'}
          title={paused ? `${t('paused')} · ${until}` : t('Pause')}
        >
          {paused ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPause size={18} />}
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{paused ? `${t('paused')} · ${until}` : t('Pause')}</Menu.Label>
        {[3, 6, 12, 24, 48].map((h) => (
          <Menu.Item key={h} onClick={() => set(h)}>
            {t('Pause {n} h', { n: h })}
          </Menu.Item>
        ))}
        {paused && (
          <Menu.Item color="teal" onClick={() => set(0)}>
            {t('Resume now')}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

export function EntitySelect({
  label,
  value,
  onChange,
  domains,
  clearable = true,
}: {
  label: React.ReactNode;
  value: string | null;
  onChange: (v: string | null) => void;
  domains?: string[];
  clearable?: boolean;
}) {
  const { data } = useResource<HaEntity[]>('/ha/entities');
  const options = (data ?? [])
    .filter((e) => !domains || domains.includes(e.entity_id.split('.')[0]))
    .map((e) => ({ value: e.entity_id, label: `${e.name} (${e.entity_id})` }));
  return <Select label={label} data={options} value={value} onChange={onChange} searchable clearable={clearable} />;
}

export function EntityMultiSelect({
  label,
  value,
  onChange,
  domains,
}: {
  label: React.ReactNode;
  value: string[];
  onChange: (v: string[]) => void;
  domains?: string[];
}) {
  const { data } = useResource<HaEntity[]>('/ha/entities');
  const options = (data ?? [])
    .filter((e) => !domains || domains.includes(e.entity_id.split('.')[0]))
    .map((e) => ({ value: e.entity_id, label: `${e.name} (${e.entity_id})` }));
  return <MultiSelect label={label} data={options} value={value} onChange={onChange} searchable />;
}

/** Slider + numeric input pair used everywhere durations/percentages appear. */
export function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 120,
  step = 1,
  unit = 'min',
}: {
  label: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div>
      <Group justify="space-between" mb={4}>
        <Text size="sm">{label}</Text>
        <NumberInput
          value={value}
          onChange={(v) => onChange(Number(v) || 0)}
          min={min}
          max={max}
          step={step}
          w={90}
          size="xs"
          suffix={` ${t(unit)}`}
        />
      </Group>
      <Slider value={value} onChange={onChange} min={min} max={max} step={step} label={(v) => `${v} ${t(unit)}`} />
    </div>
  );
}
