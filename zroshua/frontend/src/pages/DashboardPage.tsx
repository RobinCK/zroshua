import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Flex,
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
  IconCalendarPlus,
  IconTrash,
} from '@tabler/icons-react';
import { ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { api, EngineState, Group as ZGroup, Upcoming, WeatherNow, Zone } from '../api';
import { fmtDur, fmtTime, useResource } from '../hooks';
import { t, locale } from '../i18n';
import { SliderInput } from '../components/common';
import OneTimeWizard from '../components/OneTimeWizard';

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
          <Text size="xs" c="dimmed" lineClamp={2}>
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
  const { data: upcoming, reload: reloadUpcoming } = useResource<Upcoming[]>('/upcoming', [state?.active.length]);
  const { data: zones } = useResource<Zone[]>('/zones');
  const { data: groups } = useResource<ZGroup[]>('/groups');
  const { data: today } = useResource<{ totals: { minutes: number; litersMin: number; litersMax: number } }>(
    '/stats/daily?days=1',
    [state?.active.length],
  );
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const countdown = (ts: number) => {
    const s = Math.max(0, Math.round((ts - nowTick) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return t('in {d}d {h}h', { d, h });
    if (h > 0) return t('in {h}h {m}m', { h, m: String(m).padStart(2, '0') });
    return t('in {m}m', { m });
  };
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [hours, setHours] = useState(24);
  const [wizardOpen, setWizardOpen] = useState(false);

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
    return act(() => api.post(path, { hours }), hours > 0 ? t('paused') : t('Resume'));
  };

  /** a one-off is not snoozed by hours: it is soft-skipped, or cancelled outright */
  const pauseOneTime = (u: Upcoming, paused: boolean) =>
    act(() => api.post(`/one-time/${u.targetId}/pause`, { paused }), paused ? t('Skipped') : t('Resumed')).then(
      reloadUpcoming,
    );

  const cancelOneTime = (u: Upcoming) =>
    act(() => api.del(`/one-time/${u.targetId}`), t('Cancelled')).then(reloadUpcoming);

  const next = (upcoming ?? []).filter((u) => u.ts > Date.now()).slice(0, 6);
  const litersToday = today
    ? Math.round((today.totals.litersMin + today.totals.litersMax) / 2)
    : null;

  return (
    <Stack>
      <SimpleGrid cols={{ base: 2, xs: 3, md: 6 }}>
        <InfoTile
          label={t('Watering now')}
          value={String(state?.active.length ?? 0)}
          sub={state?.queue.length ? t('{n} queued', { n: state.queue.length }) : undefined}
          icon={<IconDroplet size={22} />}
          color="teal"
        />
        <InfoTile
          label={t('Zones')}
          value={`${(zones ?? []).filter((z) => z.enabled).length}/${zones?.length ?? 0}`}
          sub={t('enabled / total')}
          icon={<IconPlant2 size={22} />}
          color="green"
        />
        <InfoTile
          label={t('Groups')}
          value={String(groups?.length ?? 0)}
          sub={t('{n} enabled', { n: (groups ?? []).filter((g) => g.enabled).length })}
          icon={<IconCategory size={22} />}
          color="violet"
        />
        <InfoTile
          label={t('Today water')}
          value={litersToday !== null ? t('{n} L', { n: litersToday }) : '—'}
          icon={<IconBucketDroplet size={22} />}
          color="blue"
        />
        <InfoTile
          label={t('Today time')}
          value={today ? t('{n} min', { n: Math.round(today.totals.minutes) }) : '—'}
          icon={<IconClockHour4 size={22} />}
          color="orange"
        />
        <InfoTile
          label={t('Next watering')}
          value={next[0] ? countdown(next[0].ts) : '—'}
          sub={next[0] ? `${new Date(next[0].ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · ${next[0].groupName}` : undefined}
          icon={<IconCalendarClock size={22} />}
          color="grape"
        />
      </SimpleGrid>
      <Grid>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder>
            <Title order={4} mb="sm">
              {t('Now')}
            </Title>
            {state?.active.length ? (
              <Stack gap="sm">
                {state.active.map((a) => (
                  <div key={a.zoneId}>
                    <Group justify="space-between" mb={4}>
                      <Group gap="xs">
                        <Text fw={600}>{a.zoneName}</Text>
                        <Badge size="xs" variant="light">
                          {t(a.triggeredBy)}
                        </Badge>
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" c="dimmed">
                          {t('ends {time}', { time: fmtTime(a.endsAt) })}
                        </Text>
                        <ActionIcon
                          variant="light"
                          onClick={() => act(() => api.post(`/zones/${a.zoneId}/extend`, { minutes: 5 }), t('+5 min'))}
                          title={t('+5 min')}
                        >
                          <IconPlus size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => act(() => api.post(`/zones/${a.zoneId}/stop`), t('Stopped'))}
                          title={t('Stop')}
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
              <Text c="dimmed">{t('Nothing is watering right now.')}</Text>
            )}

            {state?.queue.length ? (
              <>
                <Title order={5} mt="md" mb="xs">
                  {t('Queue')}
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
              {t('Weather')}
            </Title>
            {weather?.entity ? (
              <>
                <Group>
                  <Text size="xl" fw={700}>
                    {weather.temperature != null ? `${weather.temperature}°` : '—'}
                  </Text>
                  <Text c="dimmed">{weather.condition ? t(weather.condition) : ''}</Text>
                  {weather.humidity != null && <Text c="dimmed">💧 {weather.humidity}%</Text>}
                </Group>
                <SimpleGrid cols={{ base: 4, sm: 7 }} mt="sm">
                  {weather.forecast.slice(0, 7).map((f, i) => (
                    <Stack key={i} gap={0} align="center">
                      <Text size="xs" c="dimmed">
                        {new Date(Date.now() + i * 86400000).toLocaleDateString(locale, { weekday: 'short' })}
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
              <Text c="dimmed">{t('No weather entity found in Home Assistant.')}</Text>
            )}
          </Card>

          <Card withBorder mt="md">
            <Title order={4} mb="sm">
              {t('Quick actions')}
            </Title>
            <Group>
              <Button color="red" leftSection={<IconPlayerStop size={16} />} onClick={() => act(() => api.post('/stop-all'), t('All stopped'))}>
                {t('Stop all')}
              </Button>
              <Button variant="light" leftSection={<IconPlayerPause size={16} />} onClick={() => setSnoozeOpen(true)}>
                {state?.snoozeUntil ? `${t('paused')} · ${fmtTime(state.snoozeUntil)}` : t('Pause all')}
              </Button>
              <Button variant="light" leftSection={<IconCalendarPlus size={16} />} onClick={() => setWizardOpen(true)}>
                {t('One-off watering')}
              </Button>
            </Group>
            {state?.pumpStates.length ? (
              <Group mt="sm" gap="xs">
                {state.pumpStates.map((p) => (
                  <Badge key={p.sourceId} color={p.on ? 'teal' : 'gray'} variant="light">
                    {p.on ? t('pump {name}: ON', { name: p.name }) : t('pump {name}: off', { name: p.name })}
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
                        {l.levelL !== null ? t('~{n} L ({pct}%)', { n: l.levelL, pct: String(l.levelPct) }) : '—'}
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
          {t('Upcoming waterings')}
        </Title>
        {next.length ? (
          <Stack gap="xs">
            {next.map((u, i) => {
              const once = u.kind === 'once';
              const paused = once ? !!u.paused : u.snoozeUntil != null && u.snoozeUntil > Date.now();
              const dim = u.willSkip || paused ? 0.55 : 1;
              return (
                <Flex
                  key={i}
                  direction={{ base: 'column', sm: 'row' }}
                  align={{ base: 'stretch', sm: 'center' }}
                  justify="space-between"
                  gap={{ base: 4, sm: 'sm' }}
                  style={{ borderBottom: i < next.length - 1 ? '1px solid var(--mantine-color-default-border)' : undefined, paddingBottom: 6 }}
                >
                  {/* the badges come first and never shrink: inside the truncating text
                      they were the first thing a narrow phone cut off */}
                  <Group gap={6} wrap="nowrap" style={{ opacity: dim, minWidth: 0 }}>
                    {u.kind === 'zone' && (
                      <Badge size="xs" variant="light" color="blue" style={{ flexShrink: 0 }}>
                        {t('zone')}
                      </Badge>
                    )}
                    {once && (
                      // grape, the same hue the timeline, the card and the one-off page use
                      <Badge size="xs" variant="light" color="grape" style={{ flexShrink: 0 }}>
                        {t('one-off')}
                      </Badge>
                    )}
                    <Text truncate style={{ minWidth: 0 }}>
                      <b>{once ? u.groupName || t('One-off watering') : u.groupName}</b>
                      {u.kind === 'zone' ? '' : u.zones.length ? ` — ${u.zones.map((z) => z.name).join(', ')}` : ''}
                    </Text>
                  </Group>
                  <Group gap="xs" wrap="wrap" justify="flex-end" style={{ flexShrink: 0 }}>
                    {paused && (
                      <Badge variant="light" color="gray" leftSection={<IconPlayerPause size={12} />}>
                        {t('paused')}
                      </Badge>
                    )}
                    {!paused && u.willSkip && (
                      <Tooltip label={(u.skipReasons ?? []).join('; ')} multiline maw={320}>
                        <Badge variant="light" color="red" leftSection={<IconAlertTriangle size={12} />}>
                          {t('will skip')}
                        </Badge>
                      </Tooltip>
                    )}
                    {!paused && !u.willSkip && (u.maybeSkip?.length ?? 0) > 0 && (
                      <Tooltip label={(u.maybeSkip ?? []).join('; ')} multiline maw={320}>
                        <Badge variant="light" color="yellow" leftSection={<IconAlertTriangle size={12} />}>
                          {t('may skip')}
                        </Badge>
                      </Tooltip>
                    )}
                    <Text size="sm" c="dimmed">
                      {u.zones.length
                        ? t('{dur} (max {max})', {
                            dur: fmtDur(u.durationMin ?? u.zones.reduce((a, z) => a + z.minutes, 0)),
                            max: fmtDur(u.maxDurationMin ?? u.zones.reduce((a, z) => a + z.maxMinutes, 0)),
                          })
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
                        <Menu.Label>{u.kind === 'zone' ? t('{name} · zone', { name: u.groupName }) : u.groupName}</Menu.Label>
                        {/* a one-off has nothing to snooze by hours: it is skipped once, or dropped */}
                        {once ? (
                          <>
                            {paused ? (
                              <Menu.Item leftSection={<IconPlayerPlay size={14} />} onClick={() => pauseOneTime(u, false)}>
                                {t('Resume')}
                              </Menu.Item>
                            ) : (
                              <Menu.Item leftSection={<IconPlayerPause size={14} />} onClick={() => pauseOneTime(u, true)}>
                                {t('Skip this run')}
                              </Menu.Item>
                            )}
                            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => cancelOneTime(u)}>
                              {t('Cancel')}
                            </Menu.Item>
                          </>
                        ) : paused ? (
                          <Menu.Item leftSection={<IconPlayerPlay size={14} />} onClick={() => pauseRow(u, 0)}>
                            {t('Resume')}
                          </Menu.Item>
                        ) : (
                          <>
                            <Menu.Item
                              leftSection={<IconPlayerPause size={14} />}
                              onClick={() => pauseRow(u, Math.max(0.05, (u.ts + 60_000 - Date.now()) / 3600_000))}
                            >
                              {t('Skip this run')}
                            </Menu.Item>
                            <Menu.Item onClick={() => pauseRow(u, 6)}>{t('Pause {n} h', { n: 6 })}</Menu.Item>
                            <Menu.Item onClick={() => pauseRow(u, 12)}>{t('Pause {n} h', { n: 12 })}</Menu.Item>
                            <Menu.Item onClick={() => pauseRow(u, 24)}>{t('Pause {n} h', { n: 24 })}</Menu.Item>
                          </>
                        )}
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Flex>
              );
            })}
          </Stack>
        ) : (
          <Text c="dimmed">{t('No scheduled waterings in the next 7 days.')}</Text>
        )}
      </Card>

      <Modal opened={snoozeOpen} onClose={() => setSnoozeOpen(false)} title={t('Pause all watering')}>
        <Stack>
          <Text size="sm" c="dimmed">
            {t('Skip all automatic (scheduled, soil, weather) watering for a while. Manual runs still work.')}
          </Text>
          <SliderInput label={t('Pause for')} value={hours} onChange={setHours} min={0} max={336} step={6} unit="h" />
          <Group>
            <Button onClick={() => act(() => api.post('/snooze', { hours }), t('Paused')).then(() => setSnoozeOpen(false))}>{t('Pause')}</Button>
            <Button variant="light" onClick={() => act(() => api.post('/snooze', { hours: 0 }), t('Resumed')).then(() => setSnoozeOpen(false))}>
              {t('Resume now')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <OneTimeWizard opened={wizardOpen} onClose={() => setWizardOpen(false)} onSaved={reloadUpcoming} />
    </Stack>
  );
}
