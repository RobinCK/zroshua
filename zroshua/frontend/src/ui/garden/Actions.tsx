import { useState } from 'react';
import { IconPlayerPlayFilled } from '@tabler/icons-react';
import { ChoiceChips, IconChip, Panel, PanelHeader, SegmentTabs, Tile, UiButton, stateStyle, StatusDot } from '../kit';
import { t } from '../../i18n';
import type { BadgeView, QuickTarget } from './types';
import s from './garden.module.css';

/**
 * Water something now in two taps: pick a zone or a group, pick a duration, start. The tile
 * above the button says what will happen (litres, end time, whether the pump can take it)
 * before you commit.
 */
export function QuickRun({
  zones,
  groups,
  now,
  onStart,
  onMore,
}: {
  zones: QuickTarget[];
  groups: QuickTarget[];
  now: number;
  onStart: (kind: 'zone' | 'group', id: string, minutes: number) => void;
  onMore?: () => void;
}) {
  const [mode, setMode] = useState<'zone' | 'group'>('zone');
  const list = mode === 'zone' ? zones : groups;
  const [picked, setPicked] = useState<Record<'zone' | 'group', string | null>>({ zone: zones[0]?.id ?? null, group: groups[0]?.id ?? null });
  const [dur, setDur] = useState<number | null>(null);
  const cur = list.find((x) => x.id === picked[mode]) ?? list[0];
  const minutes = dur ?? cur?.minutes ?? 10;
  const opts = cur ? [...new Set([Math.round(cur.minutes), 5, 10, 15, 30, 45, 60])].slice(0, 5) : [5, 10, 15, 30, 60];
  const zoneRuns = cur?.sequential ? cur.zoneCount ?? 1 : 1;
  const endTs = now + minutes * zoneRuns * 60_000;
  const end = new Date(endTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const liters = cur?.flowLpm != null ? Math.round(cur.flowLpm * minutes * (cur.sequential ? 1 : 1) * (mode === 'group' && cur.sequential ? zoneRuns : 1)) : null;
  const summary = cur
    ? [cur.name, t('{n} min', { n: minutes }), liters != null ? t('≈ {n} L', { n: liters.toLocaleString() }) : null, t('ends {time}', { time: end })]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Panel fill aria-label={t('Quick run')}>
      <PanelHeader
        icon={
          <IconChip size={40}>
            <IconPlayerPlayFilled size={18} />
          </IconChip>
        }
        title={t('Quick run')}
        sub={t('Manual runs ignore rain, soil and pauses')}
      />
      <SegmentTabs
        label={t('What to run')}
        inset
        items={[
          { key: 'zone', label: t('Zone') },
          { key: 'group', label: t('Group') },
        ]}
        value={mode}
        onChange={(k) => {
          setMode(k);
          setDur(null);
        }}
      />
      {list.length === 0 ? (
        <div className={s.detail}>{mode === 'zone' ? t('No zones yet.') : t('No groups yet.')}</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className={s.label}>{mode === 'zone' ? t('Zones') : t('Groups')}</span>
            <ChoiceChips
              label={mode === 'zone' ? t('Zones') : t('Groups')}
              square
              options={list.slice(0, 6).map((x) => ({ key: x.id, label: x.name }))}
              value={cur?.id ?? null}
              onChange={(id) => {
                setPicked({ ...picked, [mode]: id });
                setDur(null);
              }}
            />
            {onMore && list.length > 6 && (
              <UiButton size="sm" variant="ghost" onClick={onMore} style={{ alignSelf: 'flex-start' }}>
                {t('All {n}…', { n: list.length })}
              </UiButton>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className={s.label}>{mode === 'zone' ? t('Duration') : t('Duration per zone')}</span>
            <ChoiceChips
              label={t('Duration')}
              square
              cols={5}
              options={opts.map((m, i) => ({ key: m, label: t('{n}m', { n: m }), hint: i === 0 ? t('default') : undefined }))}
              value={minutes}
              onChange={setDur}
            />
          </div>
          <Tile state={cur?.note?.state === 'skip' || cur?.note?.state === 'fault' ? cur.note.state : null}>
            <span className={s.headline15} style={{ fontSize: 14, fontWeight: 600 }}>
              {summary}
            </span>
            {cur?.note && (
              <span className={s.detail} data-tone={cur.note.state === 'fault' ? 'err' : cur.note.state === 'skip' ? 'warn' : undefined}>
                {cur.note.text}
              </span>
            )}
          </Tile>
          <UiButton
            variant="primary"
            size="xl"
            block
            icon={<IconPlayerPlayFilled size={15} />}
            onClick={() => cur && onStart(mode, cur.id, minutes)}
            style={{ marginTop: 'auto' }}
          >
            {cur ? t('Start {name} · {n} min', { name: cur.name, n: minutes }) : t('Start')}
          </UiButton>
        </>
      )}
    </Panel>
  );
}

/** The row of status badges at the top of a board: one glance, swipe sideways on a phone. */
export function StatusBadges({ badges, scroll, onOpen }: { badges: BadgeView[]; scroll?: boolean; onOpen?: (key: string) => void }) {
  return (
    <nav className={s.badges} data-scroll={!!scroll} aria-label={t('Irrigation status')}>
      {badges.map((b) => (
        <button key={b.key} type="button" className={s.badge} data-state={b.state} style={stateStyle(b.state)} onClick={() => onOpen?.(b.key)}>
          <span className={s.badgeDot} aria-hidden="true">
            <StatusDot state={b.state} />
          </span>
          <span className={s.badgeText}>
            <span className={s.badgeLabel}>{b.label}</span>
            <span className={s.badgeValue}>{b.value}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}
