import { ActionIcon, Badge, Button, Card, Checkbox, Collapse, Group, NumberInput, SegmentedControl, Select, Stack, Switch, Text, TextInput } from '@mantine/core';
import { IconChevronDown, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { Schedule, ScheduleCondition } from '../api';
import TimeSlotPicker, { BusyBand, unionBands } from './TimeSlotPicker';
import { EntitySelect } from './common';

const CONDITION_KINDS = [
  { value: 'forecast_max', label: 'Forecast max temp today (°C)' },
  { value: 'forecast_rain_prob', label: 'Forecast rain probability (%)' },
  { value: 'sensor', label: 'Sensor value at start time' },
];

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NUM: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export function emptySchedule(): Schedule {
  return {
    id: `s${Date.now()}`,
    mode: 'week',
    weekdays: [1, 2, 3, 4, 5, 6, 0],
    starts: [{ start: '06:00' }],
    perDay: Object.fromEntries(DAY_KEYS.map((d) => [d, []])),
    season: null,
    zoneDurations: {},
    conditions: [],
    enabled: true,
  };
}

export interface ZoneInfo {
  id: string;
  name: string;
  baseMin: number;
  maxRuntimeMin: number;
}

/** Estimated run length of one occurrence, minutes (sequential/parallel aware). */
export function estimateRunMinutes(
  schedule: Schedule,
  zones: ZoneInfo[],
  mode: 'sequential' | 'parallel' | 'parallel_limit',
  parallelLimit: number,
  interZoneDelayS: number,
  multiplierPct: number,
): number {
  const durs = zones.map((z) => Math.min(((schedule.zoneDurations?.[z.id] ?? z.baseMin) * multiplierPct) / 100, z.maxRuntimeMin || 1e9));
  if (!durs.length) return 0;
  if (mode === 'parallel') return Math.max(...durs);
  const batch = mode === 'parallel_limit' ? Math.max(1, parallelLimit) : 1;
  let total = 0;
  for (let i = 0; i < durs.length; i += batch) {
    total += Math.max(...durs.slice(i, i + batch)) + interZoneDelayS / 60;
  }
  return Math.max(0, total - interZoneDelayS / 60);
}

export default function ScheduleEditor({
  schedule,
  onChange,
  onDelete,
  zones,
  mode = 'sequential',
  parallelLimit = 2,
  interZoneDelayS = 0,
  multiplierPct = 100,
  worstFactor = 1,
  busy = [],
}: {
  schedule: Schedule;
  onChange: (s: Schedule) => void;
  onDelete: () => void;
  /** When provided, shows per-schedule zone duration overrides and an end-time preview. */
  zones?: ZoneInfo[];
  mode?: 'sequential' | 'parallel' | 'parallel_limit';
  parallelLimit?: number;
  interZoneDelayS?: number;
  multiplierPct?: number;
  /** e.g. 1.3 when the max temperature boost is +30% — used for the worst-case preview. */
  worstFactor?: number;
  /** occupancy of all other schedules, from /api/busy-week */
  busy?: BusyBand[];
}) {
  const [durOpen, setDurOpen] = useState(false);
  const runMinutes = zones
    ? estimateRunMinutes(schedule, zones, mode, parallelLimit, interZoneDelayS, multiplierPct)
    : 0;
  const worstMinutes = Math.max(1, runMinutes * worstFactor);

  const starts = (list: { start: string }[], set: (v: { start: string }[]) => void, dows: number[]) => (
    <Group gap="xs">
      {list.map((s, i) => (
        <Group key={i} gap={4} wrap="nowrap">
          <TimeSlotPicker
            value={s.start}
            onChange={(v) => {
              const next = [...list];
              next[i] = { start: v };
              set(next);
            }}
            bands={unionBands(busy, dows)}
            durationMin={worstMinutes}
          />
          <ActionIcon size="sm" variant="subtle" color="red" onClick={() => set(list.filter((_, j) => j !== i))}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      <ActionIcon size="sm" variant="light" onClick={() => set([...list, { start: '06:00' }])}>
        <IconPlus size={14} />
      </ActionIcon>
    </Group>
  );

  return (
    <Card withBorder p="sm">
      <Group justify="space-between" mb="xs">
        <SegmentedControl
          size="xs"
          data={[
            { value: 'week', label: 'Whole week' },
            { value: 'per_day', label: 'Per day' },
          ]}
          value={schedule.mode}
          onChange={(v) => onChange({ ...schedule, mode: v as Schedule['mode'] })}
        />
        <Group gap="xs">
          <Switch size="xs" label="Enabled" checked={schedule.enabled} onChange={(e) => onChange({ ...schedule, enabled: e.currentTarget.checked })} />
          <ActionIcon variant="subtle" color="red" onClick={onDelete}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {schedule.mode === 'week' ? (
        <Stack gap="xs">
          <Checkbox.Group label="Days" value={schedule.weekdays.map(String)} onChange={(v) => onChange({ ...schedule, weekdays: v.map(Number) })}>
            <Group gap="xs" mt={4}>
              {DAY_KEYS.map((d) => (
                <Checkbox key={d} value={String(DAY_NUM[d])} label={d} />
              ))}
            </Group>
          </Checkbox.Group>
          {schedule.weekdays.length === 0 && (
            <Text size="xs" c="orange">
              No days selected — this schedule will not run.
            </Text>
          )}
          <Text size="sm">Start times (several = several waterings a day) — tap to pick on the day strip</Text>
          {starts(schedule.starts, (v) => onChange({ ...schedule, starts: v }), schedule.weekdays)}
        </Stack>
      ) : (
        <Stack gap={4}>
          {DAY_KEYS.map((d) => (
            <Group key={d} gap="xs" wrap="nowrap">
              <Text size="sm" w={36}>
                {d}
              </Text>
              {starts(schedule.perDay[d] ?? [], (v) => onChange({ ...schedule, perDay: { ...schedule.perDay, [d]: v } }), [DAY_NUM[d]])}
            </Group>
          ))}
        </Stack>
      )}

      {zones && zones.length > 0 && (
        <>
          <Group
            gap={6}
            mt="sm"
            style={{ cursor: 'pointer' }}
            onClick={() => setDurOpen((v) => !v)}
          >
            <IconChevronDown size={14} style={{ transform: durOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
            <Text size="sm" c="dimmed">
              Zone durations for this schedule (total ≈ {Math.round(runMinutes)} min)
            </Text>
          </Group>
          <Collapse in={durOpen}>
            <Stack gap={4} mt="xs">
              {zones.map((z) => (
                <Group key={z.id} justify="space-between" wrap="nowrap">
                  <Text size="sm" truncate style={{ minWidth: 0 }}>
                    {z.name}
                  </Text>
                  <NumberInput
                    size="xs"
                    w={110}
                    suffix=" min"
                    min={0}
                    max={z.maxRuntimeMin || undefined}
                    value={schedule.zoneDurations?.[z.id] ?? z.baseMin}
                    onChange={(v) =>
                      onChange({
                        ...schedule,
                        zoneDurations: { ...(schedule.zoneDurations ?? {}), [z.id]: Number(v) || 0 },
                      })
                    }
                  />
                </Group>
              ))}
              <Text size="xs" c="dimmed">
                Defaults come from each zone; overrides apply to this schedule only.
              </Text>
            </Stack>
          </Collapse>
        </>
      )}

      <Stack gap={4} mt="sm">
        <Group justify="space-between">
          <Group gap={6}>
            <Text size="sm" c="dimmed">
              Run conditions
            </Text>
            {(schedule.conditions?.length ?? 0) > 0 && (
              <Badge size="xs" variant="light" color="grape">
                {schedule.conditions!.length}
              </Badge>
            )}
          </Group>
          <Button
            size="compact-xs"
            variant="light"
            onClick={() =>
              onChange({
                ...schedule,
                conditions: [
                  ...(schedule.conditions ?? []),
                  { id: `c${Date.now()}`, kind: 'forecast_max', op: 'gte', value: 30 } as ScheduleCondition,
                ],
              })
            }
          >
            Add condition
          </Button>
        </Group>
        {(schedule.conditions ?? []).map((c, ci) => {
          const setC = (patch: Partial<ScheduleCondition>) => {
            const next = [...(schedule.conditions ?? [])];
            next[ci] = { ...c, ...patch };
            onChange({ ...schedule, conditions: next });
          };
          return (
            <Group key={c.id} gap="xs" wrap="wrap">
              <Select
                size="xs"
                w={230}
                data={CONDITION_KINDS}
                value={c.kind}
                onChange={(v) => setC({ kind: (v as ScheduleCondition['kind']) ?? 'forecast_max' })}
              />
              {c.kind === 'sensor' && (
                <div style={{ minWidth: 220, flexGrow: 1 }}>
                  <EntitySelect label="" value={c.entity ?? null} onChange={(v) => setC({ entity: v ?? undefined })} domains={['sensor']} />
                </div>
              )}
              <Select
                size="xs"
                w={70}
                data={[
                  { value: 'gte', label: '≥' },
                  { value: 'lte', label: '≤' },
                ]}
                value={c.op}
                onChange={(v) => setC({ op: (v as 'gte' | 'lte') ?? 'gte' })}
              />
              <NumberInput size="xs" w={90} value={c.value} onChange={(v) => setC({ value: Number(v) || 0 })} />
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                onClick={() => onChange({ ...schedule, conditions: (schedule.conditions ?? []).filter((_, j) => j !== ci) })}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          );
        })}
        {(schedule.conditions?.length ?? 0) > 0 && (
          <Text size="xs" c="dimmed">
            All conditions are checked at start time; if one fails, the run is skipped with a journal reason.
            Unavailable data never blocks watering.
          </Text>
        )}
      </Stack>

      <Group mt="xs" gap="xs">
        <TextInput
          label="Season from (MM-DD)"
          size="xs"
          w={130}
          value={schedule.season?.from ?? ''}
          onChange={(e) => onChange({ ...schedule, season: e.target.value ? { from: e.target.value, to: schedule.season?.to ?? '10-15' } : null })}
          placeholder="04-15"
        />
        <TextInput
          label="Season to (MM-DD)"
          size="xs"
          w={130}
          value={schedule.season?.to ?? ''}
          onChange={(e) => onChange({ ...schedule, season: e.target.value ? { from: schedule.season?.from ?? '04-15', to: e.target.value } : null })}
          placeholder="10-15"
        />
      </Group>
    </Card>
  );
}
