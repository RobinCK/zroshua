import { useMemo, useState } from 'react';
import { Alert, Badge, Box, Card, Group, ScrollArea, SegmentedControl, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { PlanResponse } from '../api';
import { useResource } from '../hooks';

const HOUR_W = 100 / 24;

function dayLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return offset === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

export default function TimelinePage() {
  const { data: plan } = useResource<PlanResponse>('/plan?days=7');
  const [dayOffset, setDayOffset] = useState('0');

  const { rows, dayConflicts, busyPct } = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() + Number(dayOffset));
    const from = dayStart.getTime();
    const to = from + 24 * 3600_000;

    const daySegs = (plan?.segments ?? []).filter((s) => s.start < to && s.worstEnd > from);
    const byGroup = new Map<string, typeof daySegs>();
    for (const s of daySegs) {
      const key = s.groupName;
      byGroup.set(key, [...(byGroup.get(key) ?? []), s]);
    }
    // busy fraction of the day (union of intervals)
    const intervals = daySegs
      .map((s) => [Math.max(s.start, from), Math.min(s.worstEnd, to)] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    let busy = 0;
    let curEnd = 0;
    for (const [a, b] of intervals) {
      if (a > curEnd) {
        busy += b - a;
        curEnd = b;
      } else if (b > curEnd) {
        busy += b - curEnd;
        curEnd = b;
      }
    }
    return {
      rows: [...byGroup.entries()],
      dayConflicts: daySegs.filter((s) => s.conflict).length,
      busyPct: Math.round((busy / (24 * 3600_000)) * 100),
      from,
    };
  }, [plan, dayOffset]);

  const dayStartTs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + Number(dayOffset));
    return d.getTime();
  }, [dayOffset]);

  const pct = (ts: number) => Math.max(0, Math.min(100, ((ts - dayStartTs) / (24 * 3600_000)) * 100));
  const nowPct = pct(Date.now());
  const fmt = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Timeline</Title>
        <Badge variant="light" color={busyPct > 50 ? 'orange' : 'teal'}>
          water busy {busyPct}% of the day
        </Badge>
      </Group>
      <SegmentedControl
        data={Array.from({ length: 7 }, (_, i) => ({ value: String(i), label: dayLabel(i) }))}
        value={dayOffset}
        onChange={setDayOffset}
        fullWidth
      />
      {dayConflicts > 0 && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          {dayConflicts} scheduled run(s) overlap with a never-overlap / order rule (shown in red). They will be
          queued or skipped at runtime depending on the conflict policy in Settings — adjust start times to resolve.
        </Alert>
      )}

      <Card withBorder p="sm">
        <Group gap={0} wrap="nowrap" align="stretch">
          {/* fixed label column — never scrolls away */}
          <Box w={132} style={{ flexShrink: 0 }}>
            <Box h={20} />
            {rows.map(([groupName]) => (
              <Box key={groupName} h={32} style={{ display: 'flex', alignItems: 'center' }}>
                <Text size="sm" truncate pr={8} title={groupName} style={{ width: '100%' }}>
                  {groupName}
                </Text>
              </Box>
            ))}
          </Box>
          <ScrollArea type="auto" style={{ flexGrow: 1, minWidth: 0 }}>
          <Box miw={560} pr={14}>
            {/* hour scale */}
            <Box pos="relative" h={20} style={{ overflow: 'hidden' }}>
              {Array.from({ length: 13 }, (_, i) => (
                <Text
                  key={i}
                  size="xs"
                  c="dimmed"
                  pos="absolute"
                  style={{
                    left: `${i * 2 * HOUR_W}%`,
                    transform: i === 0 ? 'none' : i === 12 ? 'translateX(-100%)' : 'translateX(-50%)',
                  }}
                >
                  {String(i * 2).padStart(2, '0')}
                </Text>
              ))}
            </Box>
            {rows.length === 0 && (
              <Text c="dimmed" p="md">
                Nothing scheduled this day.
              </Text>
            )}
            {rows.map(([groupName, segs]) => (
              <Group key={groupName} gap={0} wrap="nowrap" h={32} align="center">
                <Box pos="relative" h={26} style={{ flexGrow: 1, background: 'var(--mantine-color-default-hover)', borderRadius: 4 }}>
                  {/* hour gridlines */}
                  {Array.from({ length: 12 }, (_, i) => (
                    <Box key={i} pos="absolute" top={0} bottom={0} style={{ left: `${(i + 1) * 2 * HOUR_W}%`, width: 1, background: 'var(--mantine-color-default-border)' }} />
                  ))}
                  {segs.map((s, i) => (
                    <Tooltip
                      key={i}
                      label={`${s.zoneName}: ${fmt(s.start)}–${fmt(s.end)}${s.worstEnd > s.end ? ` (max ${fmt(s.worstEnd)})` : ''}${s.conflict ? ' — CONFLICT' : ''}`}
                    >
                      <Box
                        pos="absolute"
                        top={3}
                        h={20}
                        style={{
                          left: `${pct(s.start)}%`,
                          width: `${Math.max(0.5, pct(s.worstEnd) - pct(s.start))}%`,
                          background: s.conflict ? 'var(--mantine-color-red-6)' : s.kind === 'zone' ? 'var(--mantine-color-grape-5)' : 'var(--mantine-color-teal-6)',
                          borderRadius: 4,
                          opacity: 0.9,
                        }}
                      />
                    </Tooltip>
                  ))}
                  {Number(dayOffset) === 0 && nowPct > 0 && nowPct < 100 && (
                    <Box pos="absolute" top={0} bottom={0} style={{ left: `${nowPct}%`, width: 2, background: 'var(--mantine-color-blue-5)' }} />
                  )}
                </Box>
              </Group>
            ))}
          </Box>
          </ScrollArea>
        </Group>
        <Group gap="md" mt="xs">
          <Badge variant="light" color="teal">group schedule</Badge>
          <Badge variant="light" color="grape">zone schedule</Badge>
          <Badge variant="light" color="red">rule conflict</Badge>
          <Text size="xs" c="dimmed">
            Bar length includes the worst-case temperature boost — gaps between bars are guaranteed free water time.
          </Text>
        </Group>
      </Card>
    </Stack>
  );
}
