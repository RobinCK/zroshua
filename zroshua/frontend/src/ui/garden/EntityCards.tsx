import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerStopFilled } from '@tabler/icons-react';
import {
  IconButton,
  IconChip,
  Meter,
  Metric,
  Panel,
  PanelHeader,
  SegmentBar,
  Sparkline,
  StatRow,
  StatusLine,
  Tile,
  UiButton,
} from '../kit';
import { t } from '../../i18n';
import { ModeIcon, SensorIcon, SourceIcon, ZoneIcon } from './icons';
import type { GroupView, SensorView, SourceView } from './types';
import s from './garden.module.css';

/** Watering and fault tint the chip; everything else keeps a calm neutral chip. */
const LOUD = new Set(['watering', 'fault', 'queued']);

/**
 * A group: header (what it is and how it runs) · status tile (what happens, when, why, with
 * the zones as segments in run order) · one main action in the same place on every card.
 */
export function GroupCard({
  group,
  onRun,
  onStop,
  onPause,
  onResume,
  onOpen,
}: {
  group: GroupView;
  onRun?: (id: string) => void;
  onStop?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onOpen?: (id: string) => void;
}) {
  const g = group;
  return (
    <Panel state={g.state} fill aria-label={g.name}>
      <PanelHeader
        icon={
          <IconChip state={g.state} calm={!LOUD.has(g.state)}>
            <ZoneIcon kind={g.kind} size={22} />
          </IconChip>
        }
        title={g.name}
        sub={
          <>
            <ModeIcon mode={g.mode} />
            <span>{g.meta}</span>
          </>
        }
      />
      <Tile state={g.state} grow>
        <StatusLine state={g.state} word={g.word} aside={g.when} />
        <div className={s.headline15}>{g.headline}</div>
        {g.detail && (
          <div className={s.detail} data-tone={g.detailTone ?? undefined}>
            {g.detail}
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <SegmentBar segments={g.segments} />
        </div>
      </Tile>
      <div className={s.footerRow}>
        {g.primary === 'stop' && (
          <UiButton variant="danger" grow icon={<IconPlayerStopFilled size={14} />} onClick={() => onStop?.(g.id)}>
            {t('Stop group')}
          </UiButton>
        )}
        {g.primary === 'run' && (
          <UiButton variant="secondary" grow icon={<IconPlayerPlayFilled size={14} />} onClick={() => onRun?.(g.id)}>
            {t('Run now')}
          </UiButton>
        )}
        {g.primary === 'none' && (
          <UiButton variant="secondary" grow onClick={() => onOpen?.(g.id)}>
            {t('Set up')}
          </UiButton>
        )}
        {g.paused ? (
          <IconButton label={t('Resume {name}', { name: g.name })} icon={<IconPlayerPlayFilled size={14} />} onClick={() => onResume?.(g.id)} />
        ) : (
          <IconButton label={t('Pause {name} for 24 h', { name: g.name })} icon={<IconPlayerPauseFilled size={16} />} onClick={() => onPause?.(g.id)} />
        )}
      </div>
    </Panel>
  );
}

/**
 * A water source: the same skeleton as a group. A pump shows pressure or flow against its
 * target, a barrel its level against the reserve; a device that does not answer says what
 * waits because of it instead of drawing an empty gauge.
 */
export function SourceCard({ source, onOpen }: { source: SourceView; onOpen?: (id: string) => void }) {
  const x = source;
  return (
    <Panel state={x.state} fill aria-label={x.name}>
      <PanelHeader
        icon={
          <IconChip state={x.state} calm={!LOUD.has(x.state) && x.state !== 'skip'}>
            <SourceIcon kind={x.kind} />
          </IconChip>
        }
        title={x.name}
        sub={x.meta}
      />
      <Tile state={x.state} grow>
        <StatusLine state={x.state} word={x.word} aside={x.when} />
        {x.problem ? (
          <>
            <div className={s.headline15}>{x.problem.headline}</div>
            <div className={s.detail} data-tone="err">
              {x.problem.detail}
            </div>
            {onOpen && (
              <div className={s.links}>
                <UiButton size="sm" variant="secondary" onClick={() => onOpen(x.id)}>
                  {t('Open source')}
                </UiButton>
              </div>
            )}
          </>
        ) : (
          <>
            {x.metric && <Metric value={x.metric.value} unit={x.metric.unit} aside={x.metric.aside} />}
            {x.meter && <Meter pct={x.meter.pct} mark={x.meter.mark} state={x.state} scale={x.meter.scale} />}
          </>
        )}
      </Tile>
      {x.stats.length > 0 && <StatRow items={x.stats} cols={3} />}
    </Panel>
  );
}

/**
 * A rain or soil sensor. Whatever it measures fits: moisture alone, moisture with soil
 * temperature, or a plant sensor with light, fertility and battery — the readings row only
 * lists what the device has. No data is said in words, never NaN.
 */
export function SensorCard({ sensor, compact }: { sensor: SensorView; compact?: boolean }) {
  const x = sensor;
  const m = x.moisture;
  const inline = compact ? x.readings.filter((r) => !r.warn).map((r) => r.value).slice(0, 3) : [];
  return (
    <Panel aria-label={x.name} fill={!compact}>
      <PanelHeader
        icon={
          <IconChip state={x.state} calm={x.state === 'done' || x.state === 'next' || x.state === 'off'}>
            <SensorIcon kind={x.kind} />
          </IconChip>
        }
        title={x.name}
        sub={x.meta}
      />
      <Tile state={x.state === 'off' ? 'off' : x.state === 'skip' || x.state === 'fault' ? x.state : null} grow>
        <StatusLine state={x.state} word={x.word} aside={x.when} />
        {m ? (
          <>
            <Metric value={m.value} unit="%" aside={compact ? inline.join(' · ') : t('soil moisture')} />
            <Meter
              thin={compact}
              mark={m.value}
              label={t('Soil moisture')}
              bands={[
                { from: 0, to: m.trigger ?? 0, state: 'skip' },
                { from: m.trigger ?? 0, to: m.wet ?? 100, state: 'done' },
                { from: m.wet ?? 100, to: 100, state: 'watering' },
              ]}
              scale={
                compact
                  ? undefined
                  : [
                      m.trigger != null ? t('dry · waters below {n}%', { n: m.trigger }) : t('dry'),
                      m.wet != null ? t('wet · blocks above {n}%', { n: m.wet }) : t('wet'),
                    ]
              }
            />
            {!compact && x.spark && x.spark.some((v) => v != null) && (
              <>
                <Sparkline values={x.spark} min={10} max={70} threshold={m.trigger} label={t('Soil moisture over the last 24 hours')} />
                <div className={s.edgeScale} aria-hidden="true">
                  <span>{t('24 h ago')}</span>
                  <span>{t('now')}</span>
                </div>
              </>
            )}
          </>
        ) : (
          x.headline && <div className={s.headline15}>{x.headline}</div>
        )}
        {!compact && x.strip && (
          <>
            <div className={s.strip} aria-label={t('Wet periods over the last 24 hours')} role="img">
              {x.strip.map((on, i) => (
                <span key={i} className={s.stripCell} data-on={on} />
              ))}
            </div>
            <div className={s.edgeScale} aria-hidden="true">
              <span>{t('24 h ago')}</span>
              <span>{t('now')}</span>
            </div>
          </>
        )}
        {x.detail && (
          <div className={s.detail} data-tone={x.detailTone ?? undefined}>
            {x.detail}
          </div>
        )}
      </Tile>
      {!compact && x.readings.length > 0 && <StatRow items={x.readings} />}
    </Panel>
  );
}
