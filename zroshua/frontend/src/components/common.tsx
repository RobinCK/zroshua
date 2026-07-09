import { Select, MultiSelect, Slider, Group, Text, NumberInput } from '@mantine/core';
import { useResource } from '../hooks';
import { HaEntity } from '../api';

export function EntitySelect({
  label,
  value,
  onChange,
  domains,
  clearable = true,
}: {
  label: string;
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
  label: string;
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
  label: string;
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
          suffix={` ${unit}`}
        />
      </Group>
      <Slider value={value} onChange={onChange} min={min} max={max} step={step} label={(v) => `${v} ${unit}`} />
    </div>
  );
}
