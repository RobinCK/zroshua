import { Fragment, ReactNode, useMemo, useState } from 'react';
import { Alert, Badge, Box, Card, Group, ScrollArea, SegmentedControl, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { PlanEnvelope, PlanResponse, PlanSegment } from '../api';
import { useResource } from '../hooks';
import { locale, t } from '../i18n';
import { HintTitle } from '../components/Hint';

const HOUR_W = 100 / 24;

/** A run that will certainly be skipped loses its identity hue, like a conflict used to.
 *  Amber keeps a colour-blind-safe distance from the conflict red — do not darken it. */
const SKIP_CERTAIN_FILL = '#f59f00';
/** A run that might still be skipped stays its own colour, drawn as a ghost.
 *  The ghost is a pre-blended solid, not a translucent layer: a parallel group draws
 *  one bar per zone at the same instant, and stacked translucent copies composite
 *  into an almost solid colour, wiping the state out. */
const SKIP_POSSIBLE_MIX = 38;
const ghost = (hue: string) => `color-mix(in srgb, ${hue} ${SKIP_POSSIBLE_MIX}%, var(--mantine-color-body))`;
const BAR_OPACITY = 0.95;
/** A one-off run gets NO hue of its own: every fifth candidate collides with grape under
 *  deuteranopia. It borrows the zone hue (it is zone-level watering) and is told apart by a
 *  45° hatch, its own row, its own legend chip and the word "one-off" in the tooltip.
 *  Dark and light stripes alternate so the texture survives the amber certain-skip fill and
 *  the pale ghost of a possible skip alike, in both colour schemes. */
const ONCE_HATCH =
  'repeating-linear-gradient(45deg, rgba(0,0,0,.38) 0 3px, rgba(255,255,255,.30) 3px 6px, transparent 6px 10px)';
/** The finish window must not shout about a run that will not happen. */
const SKIPPED_ENVELOPE_OPACITY = 0.35;
const MAX_SKIP_REASONS = 3;

type SkipState = 'certain' | 'possible' | null | undefined;

interface TimelineRow {
  key: string;
  label: string;
  /** a row of one-off runs, drawn hatched and labelled as such */
  once: boolean;
  segs: PlanSegment[];
  envs: PlanEnvelope[];
}

function dayLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return offset === 0 ? t('Today') : d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
}

/** Colour alone must never carry meaning — every state is also named in the tooltip. */
function skipStateLabel(skip: SkipState): string | null {
  if (skip === 'certain') {
    return t('will be skipped');
  }

  if (skip === 'possible') {
    return t('may be skipped');
  }

  return null;
}

type BarKind = PlanSegment['kind'];

function barFill(kind: BarKind, skip: SkipState): string {
  if (skip === 'certain') {
    return SKIP_CERTAIN_FILL;
  }

  const hue = kind === 'group' ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-grape-5)';
  return skip === 'possible' ? ghost(hue) : hue;
}

/** The hatch is a background layer ON TOP of whatever fill the skip state produced,
 *  so the state keeps its colour and the one-off keeps its texture. */
function barBackground(kind: BarKind, skip: SkipState): string {
  const fill = barFill(kind, skip);
  return kind === 'once' ? `${ONCE_HATCH}, ${fill}` : fill;
}

/** Mantine renders a ReactNode label, so the state and its reasons get their own lines. */
function barTooltip(title: string, kind: BarKind, skip: SkipState, skipWhy?: string[]): ReactNode {
  const state = skipStateLabel(skip);

  return (
    <>
      {title}
      {kind === 'once' && (
        <>
          <br />
          {t('one-off')}
        </>
      )}
      {state !== null && (
        <>
          <br />
          {state}
        </>
      )}
      {(skipWhy ?? []).slice(0, MAX_SKIP_REASONS).map((why, i) => (
        <Fragment key={i}>
          <br />
          {why}
        </Fragment>
      ))}
    </>
  );
}

/** Bars that occupy exactly the same slot in the same state are one block of water
 *  time — a parallel group is the usual case. Keep one, and name the zones it covers. */
function dedupeBars<T extends PlanSegment>(segs: T[]): T[] {
  const bySlot = new Map<string, T[]>();
  for (const s of segs) {
    const key = `${s.start}|${s.end}|${s.skip ?? ''}|${s.conflict}|${s.kind}`;
    bySlot.set(key, [...(bySlot.get(key) ?? []), s]);
  }
  return [...bySlot.values()].map(([first, ...rest]) => {
    if (!rest.length) return first;
    const names = [first, ...rest].map((x) => x.zoneName);
    const shown = names.slice(0, 3).join(', ');
    return { ...first, zoneName: names.length > 3 ? `${shown} +${names.length - 3}` : shown };
  });
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
    const dayEnvs = (plan?.envelopes ?? []).filter((e) => e.start < to && e.worstEnd > from);
    const byGroup = new Map<string, TimelineRow>();
    // A one-off keeps its own row even when it is named after a group: it is a
    // different kind of run and the row label is half of how it is recognised.
    const rowOf = (kind: BarKind, groupName: string): TimelineRow => {
      // the backend sends an empty name for an unnamed one-off — the label is ours to translate
      const label = kind === 'once' ? groupName || t('One-off watering') : groupName;
      const key = `${kind === 'once' ? 'once' : 'plan'}|${label}`;
      const row = byGroup.get(key) ?? { key, label, once: kind === 'once', segs: [], envs: [] };
      byGroup.set(key, row);
      return row;
    };
    for (const s of daySegs) {
      rowOf(s.kind, s.groupName).segs.push(s);
    }
    for (const e of dayEnvs) {
      rowOf(e.kind, e.groupName).envs.push(e);
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
      rows: [...byGroup.values()],
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
  const fmt = (ts: number) => new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <Stack>
      <Group justify="space-between">
        <HintTitle title={t('Timeline')} hint={t('Solid bars = planned zones (temperature scaling shifts the following zones, they never overlap). The white tick is the planned end; dark hatching inside the bar = may finish earlier (negative scaling), hatched tail after the tick = worst-case temperature boost. Gaps after the hatched tail are guaranteed free water time.')} order={3} />
        <Badge variant="light" color={busyPct > 50 ? 'orange' : 'teal'}>
          {t('water busy {p}% of the day', { p: busyPct })}
        </Badge>
      </Group>
      <ScrollArea type="auto" offsetScrollbars={false}>
        <SegmentedControl
          data={Array.from({ length: 7 }, (_, i) => ({ value: String(i), label: dayLabel(i) }))}
          value={dayOffset}
          onChange={setDayOffset}
          fullWidth
          miw={420}
        />
      </ScrollArea>
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
            {rows.map((row) => (
              <Box key={row.key} h={32} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {row.once && (
                  <Box
                    w={10}
                    h={10}
                    style={{
                      flexShrink: 0,
                      borderRadius: 2,
                      background: `${ONCE_HATCH}, var(--mantine-color-grape-5)`,
                    }}
                  />
                )}
                <Text
                  size="sm"
                  truncate
                  pr={8}
                  title={row.once ? `${row.label} · ${t('one-off')}` : row.label}
                  style={{ minWidth: 0 }}
                >
                  {row.label}
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
            {rows.map((row) => (
              <Group key={row.key} gap={0} wrap="nowrap" h={32} align="center">
                <Box pos="relative" h={26} style={{ flexGrow: 1, background: 'var(--mantine-color-default-hover)', borderRadius: 4 }}>
                  {/* hour gridlines */}
                  {Array.from({ length: 12 }, (_, i) => (
                    <Box key={i} pos="absolute" top={0} bottom={0} style={{ left: `${(i + 1) * 2 * HOUR_W}%`, width: 1, background: 'var(--mantine-color-default-border)' }} />
                  ))}
                  {/* zone segments at their base (unscaled) positions. A parallel group starts
                      every zone at once, so its bars coincide exactly — draw such a stack once:
                      translucent copies would pile up into an opaque block and hide the ghost
                      state, and only the topmost would be hoverable anyway. */}
                  {dedupeBars(row.segs).map((s, i) => (
                    <Tooltip
                      key={i}
                      label={barTooltip(
                        `${s.zoneName}: ${fmt(s.start)}–${fmt(s.end)}${s.conflict ? ' — CONFLICT' : ''}`,
                        s.kind,
                        s.skip,
                        s.skipWhy,
                      )}
                    >
                      <Box
                        pos="absolute"
                        top={3}
                        h={20}
                        style={{
                          left: `${pct(s.start)}%`,
                          width: `${Math.max(0.5, pct(s.end) - pct(s.start))}%`,
                          background: barBackground(s.kind, s.skip),
                          borderRadius: 4,
                          opacity: BAR_OPACITY,
                          // a conflict outlines whatever fill the skip rules produced, so a
                          // skipped run can still show that it also collides
                          boxShadow: s.conflict
                            ? 'inset 0 0 0 2px var(--mantine-color-red-6), inset 1px 0 0 rgba(0,0,0,.35)'
                            : 'inset 1px 0 0 rgba(0,0,0,.35)',
                          // above the finish-window overlay, and a run with a skip state
                          // sits above a plain one: the tooltip is the only place it
                          // explains itself, while a plain bar has nothing to say
                          zIndex: s.skip ? 3 : 2,
                        }}
                      />
                    </Tooltip>
                  ))}
                  {/* finish window per run, drawn over the bars: hatched inside = may
                      finish earlier, hatched tail = worst-case boost, white tick = planned end */}
                  {row.envs.map((e, i) => {
                    const color =
                      e.skip === 'certain'
                        ? SKIP_CERTAIN_FILL
                        : e.kind === 'group'
                          ? 'var(--mantine-color-teal-4)'
                          : 'var(--mantine-color-grape-4)';
                    const hatch = (c: string) => `repeating-linear-gradient(135deg, ${c} 0 3px, transparent 3px 7px)`;
                    const tailOpacity = e.skip ? SKIPPED_ENVELOPE_OPACITY : 1;
                    return (
                      <Box key={`e${i}`} style={{ pointerEvents: 'none' }}>
                        {e.minEnd < e.end && (
                          <Box
                            pos="absolute"
                            top={3}
                            h={20}
                            style={{ left: `${pct(e.minEnd)}%`, width: `${Math.max(0, pct(e.end) - pct(e.minEnd))}%`, background: hatch('rgba(0,0,0,.5)') }}
                          />
                        )}
                        {e.worstEnd > e.end && (
                          <Tooltip label={`${e.groupName}: finishes between ${fmt(e.minEnd)} and ${fmt(e.worstEnd)} (planned ${fmt(e.end)}) depending on temperature scaling`}>
                            <Box
                              pos="absolute"
                              top={3}
                              h={20}
                              style={{
                                left: `${pct(e.end)}%`,
                                width: `${Math.max(0, pct(e.worstEnd) - pct(e.end))}%`,
                                background: hatch(color),
                                borderRadius: '0 4px 4px 0',
                                pointerEvents: 'auto',
                                opacity: tailOpacity,
                              }}
                            />
                          </Tooltip>
                        )}
                        <Box pos="absolute" top={1} style={{ left: `${pct(e.end)}%`, width: 2, height: 24, background: 'rgba(255,255,255,.85)', borderRadius: 1, opacity: tailOpacity }} />
                      </Box>
                    );
                  })}
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
          <Badge variant="light" color="teal">{t('group schedule')}</Badge>
          <Badge variant="light" color="grape">{t('zone schedule')}</Badge>
          {/* the swatch carries the texture, the text stays on a readable background:
              hatch strokes running through the glyphs drop them to ~2:1 contrast */}
          <Badge
            variant="light"
            color="grape"
            leftSection={
              <Box
                w={10}
                h={10}
                style={{ borderRadius: 2, background: `${ONCE_HATCH}, var(--mantine-color-grape-5)` }}
              />
            }
          >
            {t('one-off')}
          </Badge>
          <Badge variant="light" color="red">{t('rule conflict')}</Badge>
          <Badge variant="light" style={{ background: `${SKIP_CERTAIN_FILL}33`, color: SKIP_CERTAIN_FILL }}>
            {t('will be skipped')}
          </Badge>
          <Badge variant="light" style={{ background: ghost('var(--mantine-color-teal-6)'), color: 'var(--mantine-color-teal-4)' }}>
            {t('may be skipped')}
          </Badge>
        </Group>
      </Card>
    </Stack>
  );
}
