import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Box, Button, Group, Popover, SegmentedControl, Slider, Stack, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconClock, IconMinus, IconPlus } from '@tabler/icons-react';

export interface BusyBand {
  dow: number;
  startMin: number;
  endMin: number;
  worstEndMin: number;
  groupId: string | null;
  label: string;
  relation: 'conflict' | 'info';
}

export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};
export const toHHMM = (min: number): string => {
  const t = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/**
 * Merge bands from the active weekdays into one 24h occupancy strip.
 * Bands of the following day are added shifted by +1440 so an own run that
 * crosses midnight is still checked against them; duplicates (same slot on
 * several selected days) are collapsed.
 */
export function unionBands(busy: BusyBand[], activeDows: number[]): BusyBand[] {
  const days = new Set(activeDows);
  const out: BusyBand[] = [];
  const seen = new Set<string>();
  const push = (b: BusyBand) => {
    const key = `${b.startMin}|${b.worstEndMin}|${b.label}|${b.relation}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(b);
  };
  for (const b of busy) {
    if (days.has(b.dow)) push(b);
    // day-after-active band, shifted past 24:00 for cross-midnight own runs
    if (days.has((b.dow + 6) % 7))
      push({ ...b, startMin: b.startMin + 1440, endMin: b.endMin + 1440, worstEndMin: b.worstEndMin + 1440 });
  }
  return out;
}

export function overlapsConflict(startMin: number, durationMin: number, bands: BusyBand[]): BusyBand | null {
  for (const b of bands) {
    if (b.relation !== 'conflict') continue;
    if (startMin < b.worstEndMin && b.startMin < startMin + durationMin) return b;
  }
  return null;
}

export function freeUntil(startMin: number, bands: BusyBand[]): number | null {
  let next: number | null = null;
  for (const b of bands) {
    if (b.relation !== 'conflict') continue;
    if (b.startMin >= startMin && (next === null || b.startMin < next)) next = b.startMin;
  }
  return next;
}

const PRESETS = ['04:00', '05:00', '06:00', '07:00', '20:00', '21:00', '22:00'];

/**
 * Time picker with a built-in 24h occupancy strip: red bands are schedules of
 * groups bound to this one by never-overlap/order rules, gray bands are other
 * schedules. The teal block is this run (worst-case length included).
 */
export default function TimeSlotPicker({
  value,
  onChange,
  bands,
  durationMin,
  baseDurationMin,
  anchor = 'start',
  onAnchorChange,
  size = 'xs',
}: {
  value: string;
  onChange: (v: string) => void;
  bands: BusyBand[];
  /** own run length in minutes, already including the worst-case boost */
  durationMin: number;
  /** planned (unscaled) run length — shown solid, the boost tail is hatched */
  baseDurationMin?: number;
  /** 'finish' = the picked time is when the run must be done */
  anchor?: 'start' | 'finish';
  onAnchorChange?: (a: 'start' | 'finish') => void;
  size?: string;
}) {
  const [opened, setOpened] = useState(false);
  const pickedMin = toMin(value);
  // with a finish anchor the configured time is the end — the run occupies the strip BEFORE it
  const startMin = anchor === 'finish' ? Math.max(0, pickedMin - durationMin) : pickedMin;
  const baseMin = Math.min(baseDurationMin ?? durationMin, durationMin);
  const conflict = useMemo(() => overlapsConflict(startMin, durationMin, bands), [startMin, durationMin, bands]);
  const until = useMemo(() => freeUntil(startMin, bands), [startMin, bands]);

  const pct = (min: number) => (Math.max(0, Math.min(1440, min)) / 1440) * 100;
  const set = (min: number) => onChange(toHHMM(Math.round(min / 5) * 5));

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={440}
      position="bottom-start"
      withArrow
      shadow="md"
      trapFocus
      styles={{ dropdown: { maxWidth: 'calc(100vw - 24px)' } }}
    >
      <Popover.Target>
        <UnstyledButton onClick={() => setOpened((v) => !v)}>
          <Group gap={4} wrap="nowrap">
            <Badge
              size="lg"
              radius="sm"
              variant={conflict ? 'filled' : 'light'}
              color={conflict ? 'red' : 'teal'}
              leftSection={conflict ? <IconAlertTriangle size={13} /> : <IconClock size={13} />}
              style={{ cursor: 'pointer', textTransform: 'none' }}
            >
              {anchor === 'finish' ? `${toHHMM(startMin)} → ${value} (by)` : `${value} → ${toHHMM(startMin + durationMin)}`}
            </Badge>
          </Group>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Group justify="space-between" wrap="nowrap">
            <Group gap={4} wrap="nowrap">
              <ActionIcon variant="light" onClick={() => set(startMin - 15)}>
                <IconMinus size={14} />
              </ActionIcon>
              <TextInput
                type="time"
                value={value}
                onChange={(e) => e.target.value && onChange(e.target.value)}
                size={size}
                w={100}
              />
              <ActionIcon variant="light" onClick={() => set(startMin + 15)}>
                <IconPlus size={14} />
              </ActionIcon>
            </Group>
            <Text size="xs" c={conflict ? 'red' : 'dimmed'} ta="right">
              {conflict
                ? `overlaps "${conflict.label}" (${toHHMM(conflict.startMin)}–${toHHMM(conflict.worstEndMin)})`
                : until !== null
                  ? `free until ${toHHMM(until)}`
                  : 'no rule-bound schedules this day'}
            </Text>
          </Group>

          {onAnchorChange && (
            <SegmentedControl
              size="xs"
              fullWidth
              value={anchor}
              onChange={(v) => onAnchorChange(v as 'start' | 'finish')}
              data={[
                { label: 'Start at this time', value: 'start' },
                { label: 'Finish by this time', value: 'finish' },
              ]}
            />
          )}

          {/* 24h occupancy strip */}
          <Box
            pos="relative"
            h={38}
            style={{ background: 'var(--mantine-color-default-hover)', borderRadius: 6, overflow: 'hidden', cursor: 'crosshair' }}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              set(((e.clientX - rect.left) / rect.width) * 1440);
            }}
          >
            {Array.from({ length: 11 }, (_, i) => (
              <Box key={i} pos="absolute" top={0} bottom={0} style={{ left: `${(i + 1) * 2 * (100 / 24)}%`, width: 1, background: 'var(--mantine-color-default-border)' }} />
            ))}
            {bands.filter((b) => b.startMin < 1440).map((b, i) => (
              <Tooltip key={i} label={`${b.label}: ${toHHMM(b.startMin)}–${toHHMM(b.worstEndMin)}`}>
                <Box
                  pos="absolute"
                  top={b.relation === 'conflict' ? 4 : 12}
                  h={b.relation === 'conflict' ? 30 : 16}
                  style={{
                    left: `${pct(b.startMin)}%`,
                    width: `${Math.max(0.4, pct(b.worstEndMin) - pct(b.startMin))}%`,
                    background: b.relation === 'conflict' ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-gray-6)',
                    opacity: b.relation === 'conflict' ? 0.75 : 0.45,
                    borderRadius: 3,
                  }}
                />
              </Tooltip>
            ))}
            {/* own run: solid = planned length, hatched = worst-case temp boost, white tick = planned end */}
            <Box
              pos="absolute"
              top={0}
              h={38}
              style={{
                left: `${pct(startMin)}%`,
                width: `${Math.max(0.6, pct(startMin + baseMin) - pct(startMin))}%`,
                background: 'var(--mantine-color-teal-5)',
                opacity: 0.95,
                borderRadius: durationMin > baseMin ? '4px 0 0 4px' : 4,
                boxShadow: '0 0 0 1px var(--mantine-color-teal-8)',
              }}
            />
            {durationMin > baseMin && (
              <>
                <Box
                  pos="absolute"
                  top={0}
                  h={38}
                  style={{
                    left: `${pct(startMin + baseMin)}%`,
                    width: `${Math.max(0, pct(startMin + durationMin) - pct(startMin + baseMin))}%`,
                    background:
                      'repeating-linear-gradient(135deg, var(--mantine-color-teal-5) 0 3px, transparent 3px 7px)',
                    borderRadius: '0 4px 4px 0',
                  }}
                />
                <Box
                  pos="absolute"
                  top={2}
                  h={34}
                  style={{ left: `${pct(startMin + baseMin)}%`, width: 2, background: 'rgba(255,255,255,.9)', borderRadius: 1 }}
                />
              </>
            )}
          </Box>
          <Group gap={2} justify="space-between">
            {['00', '04', '08', '12', '16', '20', '24'].map((h) => (
              <Text key={h} size="xs" c="dimmed">
                {h}
              </Text>
            ))}
          </Group>

          <Slider
            min={0}
            max={1435}
            step={5}
            value={startMin}
            onChange={set}
            label={(v) => toHHMM(v)}
            marks={[{ value: 360 }, { value: 720 }, { value: 1080 }]}
          />

          <Group gap={4}>
            {PRESETS.map((p) => (
              <Button key={p} size="compact-xs" variant={value === p ? 'filled' : 'light'} onClick={() => onChange(p)}>
                {p}
              </Button>
            ))}
            <Button size="compact-xs" variant="subtle" ml="auto" onClick={() => setOpened(false)}>
              Done
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            Red = groups bound to this one by rules (never-overlap / order), incl. worst-case boost. Gray = other
            schedules. Teal = this run.
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
