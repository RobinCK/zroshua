import type { CSSProperties } from 'react';
import {
  IconAlertTriangle,
  IconChevronRight,
  IconDropletFilled,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
} from '@tabler/icons-react';
import { EmptyNote, LinedList, LinedRow, Panel, PanelHeader, SegmentBar, StatTiles, StatusPill, UiButton, stateStyle } from '../kit';
import type { GardenState } from '../tokens/base';
import { t } from '../../i18n';
import type { StatusView, TimelineLaneView, UpcomingView, WeatherDayView } from './types';
import s from './garden.module.css';

/**
 * The top card: what is happening, in one sentence, instead of four zero tiles. «Stop all»
 * only exists while something can be stopped; off season it offers the one thing to do.
 */
export function StatusHero({
  status,
  onStopAll,
  onPause,
  onResume,
  onAttention,
}: {
  status: StatusView;
  onStopAll?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onAttention?: () => void;
}) {
  const v = status;
  return (
    <Panel pad="lg" fill aria-label={t('Irrigation status')}>
      <div className={s.kicker}>
        <span className={s.mark} aria-hidden="true">
          <IconDropletFilled size={16} />
        </span>
        <span className={s.brand}>Zroshua</span>
        <span className={s.date}>{v.kicker}</span>
        <span style={{ marginLeft: 'auto' }}>
          <StatusPill state={v.mode.state}>{v.mode.label}</StatusPill>
        </span>
      </div>
      <div className={s.stack}>
        <h2 className={s.headline}>{v.headline}</h2>
        <p className={s.subline}>{v.sub}</p>
      </div>
      {v.run && v.run.length > 0 && <SegmentBar segments={v.run} labels ariaLabel={t('Order of zones in the running group')} />}
      {v.attention && (
        <button type="button" className={s.attention} onClick={onAttention}>
          <span aria-hidden="true" style={{ color: 'var(--ui-tone-err-fg)', display: 'flex' }}>
            <IconAlertTriangle size={20} />
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className={s.attTitle}>{v.attention.title}</span>
            <span className={s.attSub}>{v.attention.sub}</span>
          </span>
          <IconChevronRight size={18} color="var(--ui-text-3)" aria-hidden="true" />
        </button>
      )}
      <StatTiles items={v.stats} />
      <div className={s.actions} style={{ marginTop: 'auto' }}>
        {v.canStop && (
          <UiButton variant="danger" icon={<IconPlayerStopFilled size={14} />} onClick={onStopAll}>
            {t('Stop all')}
          </UiButton>
        )}
        {v.seasonOff ? (
          <UiButton variant="primary" icon={<IconPlayerPlayFilled size={14} />} onClick={onResume}>
            {t('Turn schedules on')}
          </UiButton>
        ) : v.paused ? (
          <UiButton variant="primary" icon={<IconPlayerPlayFilled size={14} />} onClick={onResume}>
            {t('Resume watering')}
          </UiButton>
        ) : (
          <UiButton variant="secondary" icon={<IconPlayerPauseFilled size={16} />} onClick={onPause}>
            {t('Pause all for 24 h')}
          </UiButton>
        )}
      </div>
    </Panel>
  );
}

/**
 * The next week: a weather strip and the runs with what may stop them. Same pills as the
 * zone and group status lines.
 */
export function UpcomingCard({
  days,
  runs,
  summary,
  action,
}: {
  days: WeatherDayView[];
  runs: UpcomingView[];
  summary?: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel pad="lg" fill aria-label={t('Next 7 days')}>
      <PanelHeader title={t('Next 7 days')} sub={summary} aside={action} large level={2} />
      {days.length > 0 && (
        <div className={s.week} role="list" aria-label={t('Weather forecast')}>
          {days.map((d, i) => (
            <div key={i} role="listitem" className={s.day} data-today={i === 0}>
              <span className={s.dayName}>{d.day}</span>
              <span className={s.dayTemp}>{d.temp}</span>
              <span className={s.dayRain} data-wet={d.wet}>
                {d.rain}
              </span>
            </div>
          ))}
        </div>
      )}
      {runs.length === 0 ? (
        <EmptyNote>{t('Nothing scheduled in the next 7 days.')}</EmptyNote>
      ) : (
        <LinedList label={t('Upcoming runs')}>
          {runs.map((r) => (
            <LinedRow key={r.key}>
              <div className={s.upTime}>
                <span className={s.upDay}>{r.day}</span>
                <span className={s.upClock}>{r.time}</span>
              </div>
              <div className={s.upText}>
                <span className={s.upTitle}>{r.title}</span>
                <span className={s.upDetail}>{r.detail}</span>
              </div>
              <div className={s.upSide}>
                <StatusPill state={r.state} small>
                  {r.word}
                </StatusPill>
                <span className={s.upWhy}>{r.why}</span>
              </div>
            </LinedRow>
          ))}
        </LinedList>
      )}
    </Panel>
  );
}

const LEGEND: { state: GardenState; label: () => string }[] = [
  { state: 'done', label: () => t('Done') },
  { state: 'watering', label: () => t('Watering') },
  { state: 'queued', label: () => t('Queued') },
  { state: 'next', label: () => t('Planned') },
  { state: 'skip', label: () => t('May skip') },
];

/** Today, one lane per group, with a «now» line. Only the states that occur get a legend entry. */
export function DayTimeline({
  lanes,
  dayStart,
  now,
  summary,
  compact,
  action,
}: {
  lanes: TimelineLaneView[];
  dayStart: number;
  now: number;
  summary?: string;
  compact?: boolean;
  action?: React.ReactNode;
}) {
  const DAY = 86_400_000;
  const pct = (ts: number) => Math.max(0, Math.min(100, ((ts - dayStart) / DAY) * 100));
  const labelW = compact ? 96 : 168;
  const nowPct = pct(now);
  const nowTxt = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const used = new Set(lanes.flatMap((l) => l.bars.map((b) => b.state)));
  return (
    <Panel pad="lg" aria-label={t('Today')}>
      <PanelHeader title={t('Today')} sub={summary} aside={action} large level={2} />
      {lanes.length === 0 ? (
        <EmptyNote>{t('Nothing scheduled today.')}</EmptyNote>
      ) : (
        <div className={s.scrollX}>
          <div className={s.tl} style={{ '--lw': `${labelW}px` } as CSSProperties}>
            <div className={s.tlNowLayer} style={{ left: labelW + 12 }} aria-hidden="true">
              <span className={s.tlNowTag} style={{ left: `${nowPct}%` }}>
                {nowTxt}
              </span>
              <span className={s.tlNowLine} style={{ left: `${nowPct}%` }} />
            </div>
            {lanes.map((lane) => (
              <div key={lane.key} className={s.tlLane}>
                <div className={s.tlLabel}>
                  <span className={s.tlName}>{lane.name}</span>
                  <span className={s.tlSub}>{lane.sub}</span>
                </div>
                <div className={s.tlTrack}>
                  {lane.bars.length === 0 && <span className={s.tlEmpty}>{t('no runs today')}</span>}
                  {lane.bars.map((b, i) => {
                    const left = pct(b.start);
                    const width = Math.max(0.4, pct(b.end) - left);
                    return (
                      <span
                        key={i}
                        className={s.tlBar}
                        data-state={b.state}
                        title={b.title}
                        style={stateStyle(b.state, { left: `${left}%`, width: `${width}%` })}
                      >
                        {width > 3.5 ? b.label : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className={s.tlLane} aria-hidden="true">
              <span style={{ flex: 'none', width: labelW }} />
              <div className={s.tlTicks}>
                {['00', '04', '08', '12', '16', '20', '24'].map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {used.size > 0 && (
        <div className={s.legend}>
          {LEGEND.filter((l) => used.has(l.state)).map((l) => (
            <span key={l.state} className={s.legendItem}>
              <span className={`${s.swatch} ${s.tlBar}`} data-state={l.state} style={stateStyle(l.state, { position: 'static', padding: 0 })} />
              {l.label()}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}
