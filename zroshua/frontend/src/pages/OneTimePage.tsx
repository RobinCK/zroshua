import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCalendarPlus,
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, OneTimeRun, OneTimeStatus, Upcoming, Zone } from '../api';
import { fmtDur, fmtTime, useResource } from '../hooks';
import { t } from '../i18n';
import OneTimeWizard from '../components/OneTimeWizard';

const ACTIVE_STATUSES: OneTimeStatus[] = ['scheduled', 'running'];

const STATUS_LABEL: Record<OneTimeStatus, string> = {
  scheduled: t('scheduled'),
  running: t('running'),
  done: t('done'),
  cancelled: t('cancelled'),
  skipped: t('skipped'),
  expired: t('expired'),
};

const STATUS_COLOR: Record<OneTimeStatus, string> = {
  scheduled: 'blue',
  running: 'teal',
  done: 'gray',
  cancelled: 'gray',
  skipped: 'orange',
  expired: 'gray',
};

const runTitle = (run: OneTimeRun): string => run.name?.trim() || t('One-off watering');

/** Why a finished one-off ended the way it did — the backend sends the code. */
const resultText = (run: OneTimeRun): string | null => {
  switch (run.resultCode) {
    case 'once_paused':
      return t('it was paused before its start time');
    case 'once_expired':
      return t('the controller was busy or offline at its start time');
    case 'once_paused_global':
      return t('all watering was paused');
    case 'once_group_paused':
      return t('its group was paused');
    case 'once_skipped':
      return t('every zone was skipped');
    case 'once_interrupted':
      return t('it was cut short by a restart');
    default:
      return null;
  }
};

/** How often the page re-reads the engine: a run fires, finishes and moves to history on its own. */
const REFRESH_MS = 15_000;

export default function OneTimePage() {
  const [nowTick, setNowTick] = useState(Date.now());
  const { data: all, reload } = useResource<OneTimeRun[]>('/one-time?all=1', [nowTick]);
  const { data: zones } = useResource<Zone[]>('/zones');
  const { data: upcoming, reload: reloadUpcoming } = useResource<Upcoming[]>('/upcoming', [nowTick]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<OneTimeRun | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), REFRESH_MS);

    return () => clearInterval(id);
  }, []);

  const countdown = (ts: number): string => {
    const s = Math.max(0, Math.round((ts - nowTick) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);

    if (d > 0) {
      return t('in {d}d {h}h', { d, h });
    }

    if (h > 0) {
      return t('in {h}h {m}m', { h, m: String(m).padStart(2, '0') });
    }

    return t('in {m}m', { m });
  };

  const zoneName = (zoneId: string): string => (zones ?? []).find((z) => z.id === zoneId)?.name ?? zoneId;

  /** Wall-clock length, mirroring the engine: every step ends with its longest
   *  zone (capped by that zone's failsafe), then the inter-step delay. */
  const runLengthMin = (run: OneTimeRun): number => {
    const cap = (zoneId: string, minutes: number): number => {
      const max = (zones ?? []).find((z) => z.id === zoneId)?.maxRuntimeMin;
      return Math.min(Math.max(0, minutes), max || minutes);
    };
    const filled = run.steps.filter((s) => s.length > 0);
    if (!filled.length) {
      return 0;
    }

    const water = filled.reduce((acc, s) => acc + Math.max(0, ...s.map((z) => cap(z.zoneId, z.minutes))), 0);
    return water + ((filled.length - 1) * (run.interStepDelayS ?? 0)) / 60;
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notifications.show({ message: ok, color: 'teal' });
      reload();
      reloadUpcoming();
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' });
    }
  };

  const runs = (all ?? []).map((r) => ({ ...r, startTs: Number(r.startTs) }));
  const active = runs.filter((r) => ACTIVE_STATUSES.includes(r.status)).sort((a, b) => a.startTs - b.startTs);
  const history = runs.filter((r) => !ACTIVE_STATUSES.includes(r.status)).sort((a, b) => b.startTs - a.startTs);

  /** Skip verdicts are computed by the engine, so read them off the matching upcoming row. */
  const verdictOf = (run: OneTimeRun): Upcoming | undefined =>
    (upcoming ?? []).find((u) => u.kind === 'once' && u.targetId === run.id);

  const openCreate = () => {
    setEditing(null);
    setWizardOpen(true);
  };

  const openEdit = (run: OneTimeRun) => {
    setEditing(run);
    setWizardOpen(true);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>{t('One-off watering')}</Title>
        <Button leftSection={<IconCalendarPlus size={16} />} onClick={openCreate}>
          {t('Create')}
        </Button>
      </Group>

      {active.length === 0 && <Text c="dimmed">{t('No one-off watering is planned.')}</Text>}

      <Stack gap="sm">
        {active.map((run) => {
          const verdict = verdictOf(run);
          const totalMin = verdict?.durationMin ?? runLengthMin(run);
          const zoneCount = run.steps.reduce((acc, s) => acc + s.length, 0);

          return (
            <Card key={run.id} withBorder opacity={run.paused ? 0.6 : 1}>
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={4} style={{ minWidth: 0 }}>
                  <Group gap="xs">
                    <Text fw={600}>{runTitle(run)}</Text>
                    <Badge variant="light" color="grape">
                      {t('one-off')}
                    </Badge>
                    {run.status === 'running' && (
                      <Badge variant="light" color="teal">
                        {STATUS_LABEL.running}
                      </Badge>
                    )}
                    {run.paused && (
                      <Badge variant="light" color="gray" leftSection={<IconPlayerPause size={12} />}>
                        {t('paused')}
                      </Badge>
                    )}
                    {run.force && (
                      <Badge variant="light" color="red">
                        {t('forced')}
                      </Badge>
                    )}
                    {!run.paused && verdict?.willSkip && (
                      <Tooltip label={(verdict.skipReasons ?? []).join('; ')} multiline maw={320}>
                        <Badge variant="light" color="red" leftSection={<IconAlertTriangle size={12} />}>
                          {t('will skip')}
                        </Badge>
                      </Tooltip>
                    )}
                    {!run.paused && !verdict?.willSkip && (verdict?.maybeSkip?.length ?? 0) > 0 && (
                      <Tooltip label={(verdict?.maybeSkip ?? []).join('; ')} multiline maw={320}>
                        <Badge variant="light" color="yellow" leftSection={<IconAlertTriangle size={12} />}>
                          {t('may skip')}
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      {fmtTime(run.startTs)}
                    </Text>
                    <Badge variant="light" color="grape">
                      {countdown(run.startTs)}
                    </Badge>
                    <Text size="sm" c="dimmed">
                      {t('{n} zones · {m} steps · {dur}', {
                        n: zoneCount,
                        m: run.steps.filter((s) => s.length > 0).length,
                        dur: fmtDur(totalMin),
                      })}
                    </Text>
                  </Group>
                </Stack>
                <Group gap={4} wrap="nowrap">
                  {run.status === 'scheduled' && (
                    <ActionIcon variant="subtle" onClick={() => openEdit(run)} title={t('Edit')}>
                      <IconEdit size={18} />
                    </ActionIcon>
                  )}
                  {/* pausing means "let it expire", which only has meaning before it fires —
                      a run that is already watering is stopped, not paused */}
                  {run.status === 'scheduled' && (
                    <ActionIcon
                      variant="subtle"
                      color={run.paused ? 'teal' : 'gray'}
                      title={run.paused ? t('Resume') : t('Skip this run')}
                      onClick={() =>
                        act(
                          () => api.post(`/one-time/${run.id}/pause`, { paused: !run.paused }),
                          run.paused ? t('Resumed') : t('Skipped'),
                        )
                      }
                    >
                      {run.paused ? <IconPlayerPlay size={18} /> : <IconPlayerPause size={18} />}
                    </ActionIcon>
                  )}
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    title={run.status === 'running' ? t('Stop now') : t('Cancel')}
                    onClick={() =>
                      act(() => api.del(`/one-time/${run.id}`), run.status === 'running' ? t('Stopped') : t('Cancelled'))
                    }
                  >
                    {run.status === 'running' ? <IconPlayerStop size={18} /> : <IconTrash size={18} />}
                  </ActionIcon>
                </Group>
              </Group>

              <Stack gap={4} mt="sm">
                {run.steps.map((zonesInStep, i) => (
                  <Text key={i} size="sm">
                    <b>{t('Step {n}', { n: i + 1 })}</b>
                    {' — '}
                    {zonesInStep.map((z) => `${zoneName(z.zoneId)} (${fmtDur(z.minutes)})`).join(', ')}
                  </Text>
                ))}
              </Stack>
            </Card>
          );
        })}
      </Stack>

      {history.length > 0 && (
        <Card withBorder p="sm">
          <Group
            justify="space-between"
            style={{ cursor: 'pointer' }}
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <Group gap={6}>
              {historyOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              <Text fw={600} size="sm">
                {t('History')}
              </Text>
            </Group>
            <Badge variant="light" color="gray">
              {history.length}
            </Badge>
          </Group>
          <Collapse in={historyOpen}>
            <Stack gap={6} mt="sm">
              {history.map((run) => (
                <Group key={run.id} justify="space-between" wrap="nowrap" align="flex-start">
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Text size="sm" truncate>
                      {runTitle(run)} — {fmtTime(run.startTs)}
                    </Text>
                    {/* a one-word status is not a reason: say why it did not water */}
                    {resultText(run) && (
                      <Text size="xs" c="dimmed">
                        {resultText(run)}
                        {run.resultDetail ? ` · ${run.resultDetail}` : ''}
                      </Text>
                    )}
                  </Stack>
                  <Group gap={4} wrap="nowrap">
                    <Badge variant="light" color={STATUS_COLOR[run.status]}>
                      {STATUS_LABEL[run.status]}
                    </Badge>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      title={t('Delete')}
                      onClick={() => act(() => api.del(`/one-time/${run.id}`), t('Deleted'))}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              ))}
            </Stack>
          </Collapse>
        </Card>
      )}

      <OneTimeWizard
        opened={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          reload();
          reloadUpcoming();
        }}
        existing={editing}
      />
    </Stack>
  );
}
