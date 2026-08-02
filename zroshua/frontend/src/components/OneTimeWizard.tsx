import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Stack,
  Stepper,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';
import {
  api,
  Group as ZGroup,
  OneTimeDraft,
  OneTimePreview,
  OneTimeRun,
  OneTimeWarning,
  WaterSource,
  Zone,
} from '../api';
import { fmtDur, useResource } from '../hooks';
import { locale, t } from '../i18n';
import { Hint, HintLabel } from './Hint';
import TimeSlotPicker, { BusyBand, toHHMM } from './TimeSlotPicker';

/**
 * Preview warnings arrive as codes: they are wizard body copy, so the sentence
 * belongs here where it can be translated, not in the engine.
 */
export function warningText(w: OneTimeWarning): string {
  const p = (w.params ?? {}) as Record<string, string | number>;
  const zone = String(p.zone ?? '');
  const source = String(p.source ?? '');

  switch (w.code) {
    case 'zone_missing':
      return t('Zone "{zone}" no longer exists — it will be skipped', { zone });
    case 'zone_disabled':
      return t('Zone "{zone}" is disabled — it will be skipped', { zone });
    case 'zone_fault':
      return t('Zone "{zone}" is in fault state — it will be skipped', { zone });
    case 'zone_paused':
      return t('Zone "{zone}" is paused at that time — it will be skipped', { zone });
    case 'group_paused':
      return t('Group "{group}" is paused at that time, so "{zone}" will be skipped', { group: String(p.group ?? ''), zone });
    case 'zone_no_source':
      return t('Zone "{zone}" has no water source', { zone });
    case 'zone_capped':
      return t('Zone "{zone}" is capped at its {max} min failsafe', { zone, max: Number(p.max ?? 0) });
    case 'cycle_soak':
      return t('Zone "{zone}" waters {minutes} min in cycles and holds its slot for {wall} min', {
        zone,
        minutes: Number(p.minutes ?? 0),
        wall: Number(p.wall ?? 0),
      });
    case 'flow_impossible':
      return t('Zone "{zone}" alone needs {flow} l/min, more than "{source}" allows ({limit}) — it will never start', {
        zone,
        source,
        flow: Number(p.flow ?? 0),
        limit: Number(p.limit ?? 0),
      });
    case 'flow_over_budget':
      return t('"{source}": {sum} l/min exceeds the {limit} l/min budget — these zones will run one after another', {
        source,
        sum: Number(p.sum ?? 0),
        limit: Number(p.limit ?? 0),
      });
    case 'flow_unknown':
      return t('"{source}": zone "{zone}" has no flow rate, so it waits for exclusive access', { source, zone });
    case 'source_depends':
      return t('Source "{source}" waits for "{other}" — these zones will run one after another', { source, other: String(p.other ?? '') });
    case 'groups_exclusive':
      return t('Groups "{a}" and "{b}" never run at the same time — these zones will run one after another', {
        a: String(p.a ?? ''),
        b: String(p.b ?? ''),
      });
    case 'start_in_past':
      return t('That time has already passed — pick a later one');
    default:
      return w.code;
  }
}

/** The steps view re-previews on every keystroke in a minutes field — coalesce those. */
const PREVIEW_DEBOUNCE_MS = 350;
const DEFAULT_LEAD_MIN = 30;
const FALLBACK_ZONE_MIN = 15;
/** How far ahead the backend simulates the plan the occupancy strip is built from. */
const PLAN_HORIZON_DAYS = 60;

type DayMode = 'today' | 'tomorrow' | 'date';

const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Build the epoch from calendar parts, not from midnight + minutes: a DST switch
 *  inside the picked day would shift the run by an hour. */
const tsAt = (iso: string, hhmm: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  const [hh, mi] = hhmm.split(':').map(Number);

  return new Date(y || 1970, (m || 1) - 1, d || 1, hh || 0, mi || 0, 0, 0).getTime();
};

const dayIso = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);

  return isoDate(d);
};

/** Default slot: a short lead from now, rolled over to tomorrow when that crosses midnight. */
const defaultWhen = (): { day: DayMode; time: string } => {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() + DEFAULT_LEAD_MIN;

  return { day: mins >= 1440 ? 'tomorrow' : 'today', time: toHHMM(Math.ceil(mins / 5) * 5) };
};

const fmtClock = (ts: number): string =>
  new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

export default function OneTimeWizard({
  opened,
  onClose,
  onSaved,
  existing,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** when set the wizard edits that scheduled one-off instead of creating a new one */
  existing?: OneTimeRun | null;
}) {
  const { data: zones } = useResource<Zone[]>('/zones');
  const { data: groups } = useResource<ZGroup[]>('/groups');
  const { data: sources } = useResource<WaterSource[]>('/sources');

  const [step, setStep] = useState(0);
  const [minutes, setMinutes] = useState<Record<string, number>>({});
  const [stepZones, setStepZones] = useState<string[][]>([[]]);
  const [interStepDelayS, setInterStepDelayS] = useState(0);
  const [dayMode, setDayMode] = useState<DayMode>(() => defaultWhen().day);
  const [dateIso, setDateIso] = useState(dayIso(0));
  const [time, setTime] = useState(() => defaultWhen().time);
  const [anchor, setAnchor] = useState<'start' | 'finish'>('start');
  const [name, setName] = useState('');
  const [force, setForce] = useState(false);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<OneTimePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [bands, setBands] = useState<BusyBand[]>([]);
  const [saving, setSaving] = useState(false);

  // Every open starts from a clean draft, or from the run being edited.
  useEffect(() => {
    if (!opened) {
      return;
    }

    setStep(0);
    setSearch('');
    setPreview(null);
    setPreviewError(null);
    setBands([]);

    if (existing) {
      const startDate = new Date(Number(existing.startTs));

      setMinutes(Object.fromEntries(existing.steps.flat().map((z) => [z.zoneId, z.minutes])));
      setStepZones(existing.steps.map((s) => s.map((z) => z.zoneId)));
      setInterStepDelayS(existing.interStepDelayS ?? 0);
      setDayMode('date');
      setDateIso(isoDate(startDate));
      setTime(toHHMM(startDate.getHours() * 60 + startDate.getMinutes()));
      setAnchor('start');
      setName(existing.name ?? '');
      setForce(!!existing.force);

      return;
    }

    const when = defaultWhen();

    setMinutes({});
    setStepZones([[]]);
    setInterStepDelayS(0);
    setDayMode(when.day);
    setDateIso(dayIso(0));
    setTime(when.time);
    setAnchor('start');
    setName('');
    setForce(false);
  }, [opened, existing]);

  const effectiveDate = dayMode === 'today' ? dayIso(0) : dayMode === 'tomorrow' ? dayIso(1) : dateIso;
  const pickedIds = useMemo(() => stepZones.flat(), [stepZones]);
  const zoneById = useMemo(() => new Map((zones ?? []).map((z) => [z.id, z])), [zones]);
  const sourceById = useMemo(() => new Map((sources ?? []).map((s) => [s.id, s])), [sources]);

  const draft = useMemo<OneTimeDraft | null>(() => {
    const steps = stepZones
      .filter((s) => s.length > 0)
      .map((s) => s.map((zoneId) => ({ zoneId, minutes: minutes[zoneId] ?? FALLBACK_ZONE_MIN })));

    if (!steps.length) {
      return null;
    }

    return {
      name: name.trim() || null,
      startTs: tsAt(effectiveDate, time),
      anchor,
      steps,
      interStepDelayS,
      force,
    };
  }, [stepZones, minutes, name, effectiveDate, time, anchor, interStepDelayS, force]);

  // The serialised draft is both the effect dependency and the request body: comparing the
  // object identity would re-fire the preview on every render that only moved a slider back.
  const draftKey = draft ? JSON.stringify(draft) : '';

  useEffect(() => {
    if (!opened || !draftKey) {
      setPreview(null);

      return;
    }

    const id = setTimeout(() => {
      api
        .post<OneTimePreview>('/one-time/preview', JSON.parse(draftKey))
        .then((p) => {
          setPreview(p);
          setPreviewError(null);
        })
        .catch((e) => {
          setPreview(null);
          setPreviewError(e.message);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [opened, draftKey]);

  const pickedKey = pickedIds.join(',');

  useEffect(() => {
    if (!opened || !pickedKey) {
      setBands([]);

      return;
    }

    // the run being edited must not show up as an obstacle to itself
    const exclude = existing ? `&excludeOnce=${encodeURIComponent(existing.id)}` : '';

    api
      .get<{ bands: BusyBand[] }>(`/day-bands?date=${effectiveDate}&zones=${encodeURIComponent(pickedKey)}${exclude}`)
      // an unnamed one-off has no label of its own — name it here, where there are translations
      .then((r) => setBands((r.bands ?? []).map((b) => ({ ...b, label: b.label || t('One-off watering') }))))
      .catch(() => setBands([]));
  }, [opened, effectiveDate, pickedKey, existing]);

  const groupNameOfZone = useMemo(() => {
    const map = new Map<string, string>();

    for (const g of groups ?? []) {
      for (const zoneId of g.zoneIds ?? []) {
        if (!map.has(zoneId)) {
          map.set(zoneId, g.name);
        }
      }
    }

    return map;
  }, [groups]);

  const zonesByGroup = useMemo(() => {
    const query = search.trim().toLowerCase();
    const out = new Map<string, Zone[]>();

    for (const z of (zones ?? []).filter((x) => x.enabled)) {
      if (query && !z.name.toLowerCase().includes(query)) {
        continue;
      }

      const label = groupNameOfZone.get(z.id) ?? t('Ungrouped');
      out.set(label, [...(out.get(label) ?? []), z]);
    }

    return [...out.entries()];
  }, [zones, groupNameOfZone, search]);

  const toggleZone = (z: Zone, on: boolean) => {
    setStepZones((prev) =>
      on
        ? prev.map((s, i) => (i === 0 ? [...s, z.id] : s))
        : prev.map((s) => s.filter((x) => x !== z.id)),
    );

    if (on) {
      setMinutes((prev) => ({ ...prev, [z.id]: prev[z.id] ?? z.baseDurationMin ?? FALLBACK_ZONE_MIN }));
    }
  };

  const moveZone = (zoneId: string, from: number, to: number) => {
    if (to < 0 || to >= stepZones.length) {
      return;
    }

    setStepZones((prev) =>
      prev.map((s, i) => (i === from ? s.filter((x) => x !== zoneId) : i === to ? [...s, zoneId] : s)),
    );
  };

  // Dropping a step never drops the water: its zones fall back into the neighbouring step.
  const removeStep = (index: number) => {
    setStepZones((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      const target = index === 0 ? 1 : index - 1;
      const merged = prev.map((s, i) => (i === target ? [...s, ...prev[index]] : s));

      return merged.filter((_, i) => i !== index);
    });
  };

  const totalMin = Math.max(1, Math.round(preview?.totalMin ?? 0));
  const filledSteps = stepZones.filter((s) => s.length > 0).length;
  const liters = preview ? Math.round((preview.litersMin + preview.litersMax) / 2) : null;
  const canGoNext = step === 0 ? pickedIds.length > 0 : step === 1 ? filledSteps > 0 : true;
  // the server drops empty steps, so its step indexes count only the filled ones —
  // looking a verdict up by the rendered index would show another step's times
  const filledIndex = useMemo(() => {
    const map = new Map<number, number>();
    let n = 0;

    stepZones.forEach((s, i) => {
      if (s.length > 0) map.set(i, n++);
    });

    return map;
  }, [stepZones]);
  // zones the run will really water: the preview leaves out the ones it says will be skipped
  const wateredZones = (preview?.steps ?? []).reduce((n, s) => n + s.zones.length, 0);
  const startsInPast = !!preview && preview.startTs <= Date.now();
  const narrow = useMediaQuery('(max-width: 40em)');

  const dayLabel =
    dayMode === 'today'
      ? t('Today')
      : dayMode === 'tomorrow'
        ? t('Tomorrow')
        : new Date(tsAt(effectiveDate, '12:00')).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  const submit = async () => {
    if (!draft) {
      return;
    }

    setSaving(true);

    try {
      if (existing) {
        await api.put(`/one-time/${existing.id}`, draft);
      } else {
        await api.post('/one-time', draft);
      }

      notifications.show({ message: t('One-off watering scheduled'), color: 'teal' });
      onSaved?.();
      onClose();
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={existing ? t('Edit one-off watering') : t('One-off watering')}
    >
      <Stepper
        active={step}
        onStepClick={setStep}
        size={narrow ? 'xs' : 'sm'}
        iconSize={narrow ? 26 : undefined}
        allowNextStepsSelect={false}
      >
        <Stepper.Step label={t('Zones')} description={narrow ? undefined : t('{count} picked', { count: pickedIds.length })}>
          <Stack gap="xs" mt="md">
            <TextInput
              placeholder={t('Search zones')}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
            <ScrollArea.Autosize mah={380}>
              <Stack gap="sm">
                {zonesByGroup.map(([groupLabel, list]) => (
                  <div key={groupLabel}>
                    <Text size="xs" c="dimmed" fw={700} mb={4}>
                      {groupLabel}
                    </Text>
                    <Stack gap={6}>
                      {list.map((z) => {
                        const picked = pickedIds.includes(z.id);
                        const source = z.sourceId ? sourceById.get(z.sourceId) : null;

                        return (
                          <Group key={z.id} justify="space-between" wrap="nowrap" gap="xs">
                            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                              <Checkbox
                                checked={picked}
                                onChange={(e) => toggleZone(z, e.currentTarget.checked)}
                                label={z.name}
                              />
                              <Badge size="xs" variant="light" color={source ? 'blue' : 'gray'}>
                                {source ? source.name : t('no source')}
                              </Badge>
                            </Group>
                            {picked && (
                              <NumberInput
                                value={minutes[z.id] ?? z.baseDurationMin}
                                onChange={(v) => setMinutes((prev) => ({ ...prev, [z.id]: Number(v) || 1 }))}
                                min={1}
                                max={z.maxRuntimeMin || 240}
                                w={110}
                                size="xs"
                                suffix={` ${t('min')}`}
                              />
                            )}
                          </Group>
                        );
                      })}
                    </Stack>
                  </div>
                ))}
                {zonesByGroup.length === 0 && <Text c="dimmed">{t('No enabled zones match.')}</Text>}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t('Watering steps')} description={narrow ? undefined : t('{count} steps', { count: filledSteps })}>
          <Stack gap="sm" mt="md">
            <Group justify="space-between">
              <HintLabel
                label={t('Steps run one after another')}
                hint={t('Zones inside one step open at the same time — only real hydraulics (the flow budget of their water source) can force them apart. Use several steps when the zones must not share water.')}
              />
              <Group gap="xs" wrap="nowrap">
                <Text size="xs" c="dimmed">
                  {t('Delay between steps (seconds)')}
                </Text>
                <NumberInput
                  value={interStepDelayS}
                  onChange={(v) => setInterStepDelayS(Math.max(0, Number(v) || 0))}
                  min={0}
                  max={3600}
                  w={100}
                  size="xs"
                />
              </Group>
            </Group>

            {stepZones.map((ids, i) => {
              const serverIndex = filledIndex.get(i);
              const verdict = serverIndex === undefined ? undefined : preview?.steps.find((s) => s.index === serverIndex);

              return (
                <Card key={i} withBorder p="sm">
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <Text fw={600} size="sm">
                        {t('Step {n}', { n: i + 1 })}
                      </Text>
                      {verdict && (
                        <Badge variant="light" size="sm">
                          {`${fmtClock(verdict.startTs)} → ${fmtClock(verdict.endTs)}`}
                        </Badge>
                      )}
                    </Group>
                    {stepZones.length > 1 && (
                      <ActionIcon variant="subtle" color="red" onClick={() => removeStep(i)} title={t('Remove step')}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Group>

                  {ids.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {t('Empty — move a zone here.')}
                    </Text>
                  ) : (
                    <Stack gap={4}>
                      {ids.map((zoneId) => (
                        <Group key={zoneId} justify="space-between" wrap="nowrap">
                          <Text size="sm" truncate>
                            {zoneById.get(zoneId)?.name ?? zoneId} — {fmtDur(minutes[zoneId] ?? FALLBACK_ZONE_MIN)}
                          </Text>
                          <Group gap={4} wrap="nowrap">
                            <ActionIcon
                              variant="subtle"
                              disabled={i === 0}
                              onClick={() => moveZone(zoneId, i, i - 1)}
                              title={t('Move to the previous step')}
                            >
                              <IconArrowLeft size={15} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              disabled={i === stepZones.length - 1}
                              onClick={() => moveZone(zoneId, i, i + 1)}
                              title={t('Move to the next step')}
                            >
                              <IconArrowRight size={15} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      ))}
                    </Stack>
                  )}

                  {verdict?.serialised && (
                    <Text size="xs" c="dimmed" mt={6}>
                      {t('These zones do not fit on their water source at once, so the step is timed as a partly serial run.')}
                    </Text>
                  )}
                  {(verdict?.warnings ?? []).map((w, wi) => (
                    <Text key={wi} size="xs" c="orange" mt={6}>
                      {warningText(w)}
                    </Text>
                  ))}
                </Card>
              );
            })}

            <Group>
              <Button
                variant="light"
                size="compact-sm"
                leftSection={<IconPlus size={14} />}
                onClick={() => setStepZones((prev) => [...prev, []])}
              >
                {t('Add step')}
              </Button>
            </Group>

            {previewError && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                {previewError}
              </Alert>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t('When')} description={dayLabel}>
          <Stack gap="sm" mt="md">
            <SegmentedControl
              fullWidth
              value={dayMode}
              onChange={(v) => setDayMode(v as DayMode)}
              data={[
                { value: 'today', label: t('Today') },
                { value: 'tomorrow', label: t('Tomorrow') },
                { value: 'date', label: t('Pick a date') },
              ]}
            />
            {dayMode === 'date' && (
              <TextInput
                type="date"
                value={dateIso}
                min={dayIso(0)}
                // the planner only simulates 60 days ahead; past that the occupancy
                // strip would silently come back empty
                max={dayIso(PLAN_HORIZON_DAYS)}
                onChange={(e) => e.currentTarget.value && setDateIso(e.currentTarget.value)}
                w={180}
              />
            )}
            <Group gap="xs">
              <TimeSlotPicker
                value={time}
                onChange={setTime}
                bands={bands}
                durationMin={totalMin}
                baseDurationMin={totalMin}
                anchor={anchor}
                onAnchorChange={setAnchor}
              />
              <Hint>
                {t('Red bands are runs that cannot share water with these zones (never-overlap / order rules or an exclusive source), gray bands are everything else planned for that date, including other one-off runs.')}
              </Hint>
            </Group>
            {startsInPast && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                {warningText({ code: 'start_in_past' })}
              </Alert>
            )}
            {(preview?.conflicts.length ?? 0) > 0 && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title={t('Overlaps runs that cannot share water')}>
                {(preview?.conflicts ?? [])
                  .map((c) => `${c.label || t('One-off watering')}: ${fmtClock(c.startTs)}–${fmtClock(c.endTs)}`)
                  .join('; ')}
              </Alert>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t('Confirm')}>
          <Stack gap="sm" mt="md">
            <Card withBorder p="sm">
              <Text fw={600}>
                {/* built from pluralised pieces: one baked sentence cannot decline
                    "5 zones" and "2 steps" correctly in Slavic languages */}
                {preview
                  ? [
                      t('{day} {from} → {to}', {
                        day: dayLabel,
                        from: fmtClock(preview.startTs),
                        to: fmtClock(preview.endTs),
                      }),
                      t('{count} zones', { count: wateredZones }),
                      t('{count} steps', { count: preview.steps.filter((s) => s.zones.length).length }),
                    ].join(' · ')
                  : t('Calculating…')}
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                {t('Total watering time {dur}', { dur: fmtDur(totalMin) })}
                {/* zones without a flow rate cannot be estimated — say nothing rather than "~0 L" */}
                {liters ? ` · ${t('~{n} L', { n: liters })}` : ''}
              </Text>
              {wateredZones < pickedIds.length && (
                <Text size="sm" c="orange" mt={4}>
                  {t('{count} of the picked zones will be skipped', { count: pickedIds.length - wateredZones })}
                </Text>
              )}
            </Card>

            {(preview?.warnings ?? []).map((w, i) => (
              <Alert key={i} color={w.code === 'start_in_past' ? 'red' : 'orange'} icon={<IconAlertTriangle size={16} />}>
                {warningText(w)}
              </Alert>
            ))}
            {(preview?.skipReasons ?? []).length > 0 && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('will be skipped')}>
                {(preview?.skipReasons ?? []).join('; ')}
              </Alert>
            )}
            {(preview?.maybeSkip ?? []).length > 0 && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title={t('may be skipped')}>
                {(preview?.maybeSkip ?? []).join('; ')}
              </Alert>
            )}

            <TextInput
              label={t('Name (optional)')}
              placeholder={t('One-off watering')}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />

            <Switch
              checked={force}
              onChange={(e) => setForce(e.currentTarget.checked)}
              label={
                <HintLabel
                  label={t('Run even if watering is paused, it is raining or the soil is wet')}
                  hint={t('Overrides exactly three things: the global, group and zone pauses; the rain sensor and its dry-out window; the soil-moisture block. Everything else still applies — the run waits its turn in the queue, respects never-overlap and order rules, the water source and the flow budget.')}
                />
              }
            />
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="lg">
        <Button variant="subtle" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          {t('Back')}
        </Button>
        {step < 3 ? (
          <Button disabled={!canGoNext} onClick={() => setStep((s) => s + 1)}>
            {t('Next')}
          </Button>
        ) : (
          <Button loading={saving} disabled={!draft || startsInPast} onClick={submit}>
            {existing ? t('Save') : t('Schedule')}
          </Button>
        )}
      </Group>
      <Box h={4} />
    </Modal>
  );
}
