import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Grid,
  Group,
  Modal,
  Progress,
  Stack,
  Text,
  Title,
  Badge,
  SimpleGrid,
  ActionIcon,
  Tooltip,
  Menu,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconPlayerStop,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconDroplet,
  IconPlant2,
  IconCategory,
  IconBucketDroplet,
  IconClockHour4,
  IconCalendarClock,
} from '@tabler/icons-react';
import { ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { api, EngineState, Group as ZGroup, Upcoming, WeatherNow, Zone } from '../api';
import { fmtDur, fmtTime, useResource } from '../hooks';
import { SliderInput } from '../components/common';

function InfoTile({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card p="sm">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon variant="light" color={color} size={40} radius="md">
          {icon}
        </ThemeIcon>
        <div style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed" truncate>
            {label}
          </Text>
          <Text size="lg" fw={700} lh={1.25} truncate>
            {value}
          </Text>
          {sub && (
            <Text size="xs" c="dimmed" truncate>
              {sub}
            </Text>
          )}
        </div>
      </Group>
    </Card>
  );
}

export default function DashboardPage({ state }: { state: EngineState | null }) {
  const { data: weather } = useResource<WeatherNow>('/weather');
  const { data: upcoming } = useResource<Upcoming[]>('/upcoming', [state?.active.length]);
  const { data: zones } = useResource<Zone[]>('/zones');
  const { data: groups } = useResource<ZGroup[]>('/groups');
  const { data: today } = useResource<{ totals: { minutes: number; litersMin: number; litersMax: number } }>(
    '/stats/daily?days=1',
    [state?.active.length],
  );
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const countdown = (ts: number) => {
    const s = Math.max(0, Math.round((ts - nowTick) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `in ${d}d ${h}h`;
    if (h > 0) return `in ${h}h ${String(m).padStart(2, '0')}m`;
    return `in ${m}m`;
  };
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [hours, setHours] = useState(24);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notifications.show({ message: ok, color: 'teal' });
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' });
    }
  };

  /** pause/resume the target (group or single zone) of an upcoming row */
  const pauseRow = (u: Upcoming, hours: number) => {
    const kind = u.kind ?? 'group';
    const id = u.targetId ?? u.groupId;
    const path = kind === 'zone' ? `/zones/${id}/pause` : `/groups/${id}/pause`;
    return act(() => api.post(path, { hours }), hours > 0 ? 'Paused' : 'Resumed');
  };

  const next = (upcoming ?? []).filter((u) => u.ts > Date.now()).slice(0, 6);
  const litersToday = today
    ? Math.round((today.totals.litersMin + today.totals.litersMax) / 2)
    : null;

  return (
    <Stack>
      <SimpleGrid cols={{ base: 2, xs: 3, md: 6 }}>
        <InfoTile
          label="Watering now"
          value={String(state?.active.length ?? 0)}
          sub={state?.queue.length ? `${state.queue.length} queued` : undefined}
          icon={<IconDroplet size={22} />}
          color="teal"
        />
        <InfoTile
          label="Zones"
          value={`${(zones ?? []).filter((z) => z.enabled).length}/${zones?.length ?? 0}`}
          sub="enabled / total"
          icon={<IconPlant2 size={22} />}
          color="green"
        />
        <InfoTile
          label="Groups"
          value={String(groups?.length ?? 0)}
          sub={`${(groups ?? []).filter((g) => g.enabled).length} enabled`}
          icon={<IconCategory size={22} />}
          color="violet"
        />
        <InfoTile
          label="Today water"
          value={litersToday !== null ? `${litersToday} L` : '—'}
          icon={<IconBucketDroplet size={22} />}
          color="blue"
        />
        <InfoTile
          label="Today time"
          value={today ? `${Math.round(today.totals.minutes)} min` : '—'}
          icon={<IconClockHour4 size={22} />}
          color="orange"
        />
        <InfoTile
          label="Next watering"
          value={next[0] ? countdown(next[0].ts) : '—'}
          sub={next[0] ? `${new Date(next[0].ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · ${next[0].groupName}` : undefined}
          icon={<IconCalendarClock size={22} />}
          color="grape"
        />
      </SimpleGrid>
      <Grid>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder>
            <Title order={4} mb="sm">
              Now
            </Title>
            {state?.active.length ? (
              <Stack gap="sm">
                {state.active.map((a) => (
                  <div key={a.zoneId}>
                    <Group justify="space-between" mb={4}>
                      <Group gap="xs">
                        <Text fw={600}>{a.zoneName}</Text>
                        <Badge size="xs" variant="light">
                          {a.triggeredBy}
                        </Badge>
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" c="dimmed">
                          ends {fmtTime(a.endsAt)}
                        </Text>
                        <ActionIcon
                          variant="light"
                          onClick={() => act(() => api.post(`/zones/${a.zoneId}/extend`, { minutes: 5 }), '+5 min')}
                          title="+5 min"
                        >
                          <IconPlus size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => act(() => api.post(`/zones/${a.zoneId}/stop`), 'Stopped')}
                          title="Stop"
                        >
                          <IconPlayerStop size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Progress value={a.progress * 100} animated />
                  </div>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed">Nothing is watering right now.</Text>
            )}

            {state?.queue.length ? (
              <>
                <Title order={5} mt="md" mb="xs">
                  Queue
                </Title>
                <Stack gap={4}>
                  {state.queue.map((q, i) => (
                    <Group key={i} justify="space-between">
                      <Text size="sm">
                        {q.zoneName} — {fmtDur(q.durationMin)}
                      </Text>
                      <Badge variant="light" color="gray">
                        {q.waitReason}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </>
            ) : null}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder>
            <Title order={4} mb="sm">
              Weather
            </Title>
            {weather?.entity ? (
              <>
                <Group>
                  <Text size="xl" fw={700}>
                    {weather.temperature != null ? `${weather.temperature}°` : '—'}
                  </Text>
                  <Text c="dimmed">{weather.condition}</Text>
                  {weather.humidity != null && <Text c="dimmed">💧 {weather.humidity}%</Text>}
                </Group>
                <SimpleGrid cols={{ base: 4, sm: 7 }} mt="sm">
                  {weather.forecast.slice(0, 7).map((f, i) => (
                    <Stack key={i} gap={0} align="center">
                      <Text size="xs" c="dimmed">
                        {new Date(Date.now() + i * 86400000).toLocaleDateString(undefined, { weekday: 'short' })}
                      </Text>
                      <Text size="sm" fw={600}>
                        {f.tempMaxC != null ? `${Math.round(f.tempMaxC)}°` : '—'}
                      </Text>
                      <Text size="xs" c="blue">
                        {f.precipitationProbability != null ? `${f.precipitationProbability}%` : ''}
                      </Text>
                    </Stack>
                  ))}
                </SimpleGrid>
              </>
            ) : (
              <Text c="dimmed">No weather entity found in Home Assistant.</Text>
            )}
          </Card>

          <Card withBorder mt="md">
            <Title order={4} mb="sm">
              Quick actions
            </Title>
            <Group>
              <Button color="red" leftSection={<IconPlayerStop size={16} />} onClick={() => act(() => api.post('/stop-all'), 'All stopped')}>
                Stop all
              </Button>
              <Button variant="light" leftSection={<IconPlayerPause size={16} />} onClick={() => setSnoozeOpen(true)}>
                {state?.snoozeUntil ? `Paused until ${fmtTime(state.snoozeUntil)}` : 'Pause all'}
              </Button>
            </Group>
            {state?.pumpStates.length ? (
              <Group mt="sm" gap="xs">
                {state.pumpStates.map((p) => (
                  <Badge key={p.sourceId} color={p.on ? 'teal' : 'gray'} variant="light">
                    pump {p.name}: {p.on ? 'ON' : 'off'}
                  </Badge>
                ))}
              </Group>
            ) : null}
            {(state?.sourceLevels?.length ?? 0) > 0 && (
              <Stack gap={6} mt="sm">
                {state!.sourceLevels!.map((l) => (
                  <div key={l.sourceId}>
                    <Group justify="space-between" mb={2}>
                      <Text size="xs" c="dimmed">
                        {l.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {l.levelL !== null ? `~${l.levelL} L (${l.levelPct}%)` : '—'}
                      </Text>
                    </Group>
                    <Progress
                      value={l.levelPct ?? 0}
                      color={(l.levelPct ?? 100) < 20 ? 'red' : (l.levelPct ?? 100) < 40 ? 'yellow' : 'blue'}
                      size="sm"
                    />
                  </div>
                ))}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      <Card withBorder>
        <Title order={4} mb="sm">
          Upcoming waterings
        </Title>
        {next.length ? (
          <Stack gap="xs">
            {next.map((u, i) => {
              const paused = u.snoozeUntil != null && u.snoozeUntil > Date.now();
              const dim = u.willSkip || paused ? 0.55 : 1;
              return (
                <Group key={i} justify="space-between" wrap="nowrap">
                  <Text style={{ opacity: dim, minWidth: 0 }} truncate>
                    <b>{u.groupName}</b>
                    {u.kind === 'zone' ? '' : u.zones.length ? ` — ${u.zones.map((z) => z.name).join(', ')}` : ''}
                    {u.kind === 'zone' && (
                      <Badge size="xs" variant="light" color="blue" ml={6} style={{ verticalAlign: 'middle' }}>
                        zone
                      </Badge>
                    )}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    {paused && (
                      <Badge variant="light" color="gray" leftSection={<IconPlayerPause size={12} />}>
                        paused
                      </Badge>
                    )}
                    {!paused && u.willSkip && (
                      <Tooltip label={(u.skipReasons ?? []).join('; ')} multiline maw={320}>
                        <Badge variant="light" color="red" leftSection={<IconAlertTriangle size={12} />}>
                          will skip
                        </Badge>
                      </Tooltip>
                    )}
                    {!paused && !u.willSkip && (u.maybeSkip?.length ?? 0) > 0 && (
                      <Tooltip label={(u.maybeSkip ?? []).join('; ')} multiline maw={320}>
                        <Badge variant="light" color="yellow" leftSection={<IconAlertTriangle size={12} />}>
                          may skip
                        </Badge>
                      </Tooltip>
                    )}
                    <Text size="sm" c="dimmed" visibleFrom="sm">
                      {u.zones.length
                        ? `${fmtDur(u.durationMin ?? u.zones.reduce((a, z) => a + z.minutes, 0))} (max ${fmtDur(u.maxDurationMin ?? u.zones.reduce((a, z) => a + z.maxMinutes, 0))})`
                        : ''}
                    </Text>
                    <Badge variant="light" color="grape" style={{ opacity: dim }}>
                      {countdown(u.ts)}
                    </Badge>
                    <Badge variant="light" style={{ opacity: dim }}>
                      {fmtTime(u.ts)}
                    </Badge>
                    <Menu position="bottom-end" withArrow>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color={paused ? 'teal' : 'gray'}>
                          {paused ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>{u.kind === 'zone' ? u.groupName + ' · zone' : u.groupName}</Menu.Label>
                        {paused ? (
                          <Menu.Item leftSection={<IconPlayerPlay size={14} />} onClick={() => pauseRow(u, 0)}>
                            Resume
                          </Menu.Item>
                        ) : (
                          <>
                            <Menu.Item
                              leftSection={<IconPlayerPause size={14} />}
                              onClick={() => pauseRow(u, Math.max(0.05, (u.ts + 60_000 - Date.now()) / 3600_000))}
                            >
                              Skip this run
                            </Menu.Item>
                            <Menu.Item onClick={() => pauseRow(u, 6)}>Pause 6 h</Menu.Item>
                            <Menu.Item onClick={() => pauseRow(u, 12)}>Pause 12 h</Menu.Item>
                            <Menu.Item onClick={() => pauseRow(u, 24)}>Pause 24 h</Menu.Item>
                          </>
                        )}
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Group>
              );
            })}
          </Stack>
        ) : (
          <Text c="dimmed">No scheduled waterings in the next 7 days.</Text>
        )}
      </Card>

      <Modal opened={snoozeOpen} onClose={() => setSnoozeOpen(false)} title="Pause all watering">
        <Stack>
          <Text size="sm" c="dimmed">
            Skip all automatic (scheduled, soil, weather) watering for a while. Manual runs still work.
          </Text>
          <SliderInput label="Pause for" value={hours} onChange={setHours} min={0} max={336} step={6} unit="h" />
          <Group>
            <Button onClick={() => act(() => api.post('/snooze', { hours }), 'Paused').then(() => setSnoozeOpen(false))}>Pause</Button>
            <Button variant="light" onClick={() => act(() => api.post('/snooze', { hours: 0 }), 'Resumed').then(() => setSnoozeOpen(false))}>
              Resume now
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
