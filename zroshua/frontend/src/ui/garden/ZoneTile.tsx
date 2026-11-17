import { useState, type CSSProperties } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { ChoiceChips, EdgeProgress, IconChip, StatusLine, EmptyNote, stateStyle, type ChoiceOption } from '../kit';
import type { GardenState } from '../tokens/base';
import { t } from '../../i18n';
import { ZoneIcon } from './icons';
import type { ZoneSectionView, ZoneView } from './types';
import s from './garden.module.css';

/**
 * A zone: type icon · full name (two lines, never «Backyard La…») · one status line whose
 * number always carries its unit. A thin progress strip along the bottom only while watering.
 * The whole tile is the button that opens the zone sheet.
 */
export function ZoneTile({ zone, onOpen }: { zone: ZoneView; onOpen?: (id: string) => void }) {
  return (
    <button
      type="button"
      className={s.zone}
      data-state={zone.state}
      style={stateStyle(zone.state)}
      onClick={() => onOpen?.(zone.id)}
      aria-label={`${zone.name} — ${zone.label}`}
    >
      <IconChip state={zone.state} size={36}>
        <ZoneIcon kind={zone.kind} />
      </IconChip>
      <span className={s.zoneText}>
        <span className={s.zoneName}>{zone.name}</span>
        <StatusLine state={zone.state} word={zone.label} compact />
      </span>
      {zone.state === 'watering' && zone.progress != null && (
        <span className={s.zoneEdge}>
          <EdgeProgress pct={zone.progress} />
        </span>
      )}
    </button>
  );
}

export type ZoneFilter = 'all' | GardenState;

const SUMMARY_ORDER: GardenState[] = ['watering', 'queued', 'fault', 'paused', 'done', 'skip', 'next', 'off'];

function summaryWord(state: GardenState, n: number): string {
  switch (state) {
    case 'watering':
      return t('{n} watering', { n });
    case 'queued':
      return t('{n} queued', { n });
    case 'fault':
      return t('{n} fault', { n });
    case 'paused':
      return t('{n} paused', { n });
    case 'done':
      return t('{n} done today', { n });
    case 'skip':
      return t('{n} may skip', { n });
    case 'next':
      return t('{n} scheduled', { n });
    default:
      return t('{n} off', { n });
  }
}

/**
 * Zones by group with filters and collapsible sections. The same board is the «Zones» card in
 * Lovelace and the zones section of the add-on. On a phone pass `openSections` 1–2 so the
 * page is not a kilometre of tiles.
 */
export function ZoneBoard({
  sections,
  onOpen,
  minTile = 200,
  openSections = 99,
}: {
  sections: ZoneSectionView[];
  onOpen?: (id: string) => void;
  minTile?: number;
  openSections?: number;
}) {
  const [filter, setFilter] = useState<ZoneFilter>('all');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const all = sections.flatMap((x) => x.zones);
  const count = (st: GardenState) => all.filter((z) => z.state === st).length;
  const options: ChoiceOption<ZoneFilter>[] = [{ key: 'all', label: t('All'), count: all.length }];
  for (const [key, label] of [
    ['watering', t('Watering')],
    ['queued', t('Queued')],
    ['fault', t('Fault')],
    ['skip', t('May skip')],
    ['paused', t('Paused')],
    ['off', t('Off')],
  ] as const) {
    const n = count(key);
    if (n > 0 || key === 'watering' || key === 'off') options.push({ key, label, count: n });
  }
  const visible = sections
    .map((sec, i) => {
      const zones = filter === 'all' ? sec.zones : sec.zones.filter((z) => z.state === filter);
      const tally = SUMMARY_ORDER.map((st) => [st, sec.zones.filter((z) => z.state === st).length] as const).filter(([, n]) => n > 0);
      const summary = [t('{n} zones', { n: sec.zones.length }), ...tally.map(([st, n]) => summaryWord(st, n))].join(' · ');
      const isOpen = filter !== 'all' ? true : open[sec.id] ?? i < openSections;
      return { ...sec, zones, summary, isOpen };
    })
    .filter((sec) => sec.zones.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ChoiceChips label={t('Filter zones')} options={options} value={filter} onChange={setFilter} scroll />
      {visible.length === 0 && <EmptyNote>{t('No zones match this filter.')}</EmptyNote>}
      {visible.map((sec) => (
        <section key={sec.id} className={s.zsection}>
          <button
            type="button"
            className={s.zhead}
            aria-expanded={sec.isOpen}
            onClick={() => setOpen({ ...open, [sec.id]: !sec.isOpen })}
          >
            <IconChevronDown size={18} className={s.zchev} aria-hidden="true" />
            <span className={s.zname}>{sec.name}</span>
            <span className={s.zsum}>{sec.summary}</span>
          </button>
          {sec.isOpen && (
            <div className={s.zgrid} style={{ '--min': `${minTile}px` } as CSSProperties}>
              {sec.zones.map((z) => (
                <div key={z.id}>
                  <ZoneTile zone={z} onOpen={onOpen} />
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
