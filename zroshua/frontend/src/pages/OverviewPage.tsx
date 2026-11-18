import { useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import type { EngineState } from '../api';
import { t } from '../i18n';
import { CardStrip, Panel, PanelHeader, Section, UiButton } from '../ui/kit';
import {
  DayTimeline,
  FindingsCard,
  GroupCard,
  QuickRun,
  SourceCard,
  StatusBadges,
  StatusHero,
  UpcomingCard,
  ZoneBoard,
} from '../ui/garden';
import { ZoneSheet } from '../components/ZoneSheet';
import { actions } from '../view/actions';
import {
  badgeViews,
  findUpcoming,
  findingView,
  groupView,
  quickTargets,
  sourceView,
  statusView,
  timelineLanes,
  upcomingViews,
  weatherDays,
  zoneSections,
} from '../view/garden';
import { dayStart, liters } from '../view/format';
import { useGarden } from '../view/useGarden';
import s from './layout.module.css';

/**
 * The overview: the same cards as the Lovelace board, in the same order — status, quick run,
 * next 7 days, groups, zones, today, water sources, needs attention. On a phone the rows of
 * cards become swipe strips and only the first zone groups are open.
 */
export default function OverviewPage({ state, goto }: { state: EngineState | null; goto: (page: string) => void }) {
  const { garden, reload } = useGarden(state);
  const phone = useMediaQuery('(max-width: 640px)');
  const [zoneId, setZoneId] = useState<string | null>(null);
  const status = statusView(garden);
  const quick = quickTargets(garden);
  const attention = garden.attention.map((f, i) => findingView(f, i, garden.now));
  const groups = garden.groups.map((g) => groupView(garden, g));
  const sources = garden.sources.map((x) => sourceView(garden, x));
  const lanes = timelineLanes(garden);
  const today = garden.days[garden.days.length - 1];
  const upcomingCount = garden.upcoming.filter((u) => u.ts > garden.now).length;
  const skips = garden.upcoming.filter((u) => u.ts > garden.now && (u.willSkip || (u.maybeSkip?.length ?? 0) > 0)).length;

  return (
    <div className={s.page}>
      <StatusBadges
        badges={badgeViews(garden)}
        scroll={!!phone}
        onOpen={(k) => {
          if (k === 'attention') document.getElementById('attention')?.scrollIntoView({ behavior: 'smooth' });
          else if (k.startsWith('lvl_') || k.startsWith('p_')) goto('sources');
          else if (k === 'rain') goto('sensors');
          else if (k === 'today') goto('stats');
          else if (k === 'next') goto('timeline');
        }}
      />

      <div className={s.row}>
        <div className={s.wide}>
          <StatusHero
            status={status}
            onStopAll={() => actions.stopAll(reload)}
            onPause={(hours) => actions.pauseAll(hours, reload)}
            onResume={() => (status.seasonOff ? goto('groups') : actions.pauseAll(0, reload))}
            onAttention={() => document.getElementById('attention')?.scrollIntoView({ behavior: 'smooth' })}
          />
        </div>
        <div>
          <QuickRun
            zones={quick.zones}
            groups={quick.groups}
            now={garden.now}
            onStart={(kind, id, min) => {
              if (kind === 'zone') actions.runZone(id, garden.zones.find((z) => z.id === id)?.name ?? id, min, reload);
              else actions.runGroup(id, garden.groups.find((g) => g.id === id)?.name ?? id, min, reload);
            }}
            onMore={() => goto('zones')}
          />
        </div>
      </div>

      <Section
        id="groups"
        title={t('Groups')}
        meta={t('{n} groups · {w} watering', { n: groups.length, w: groups.filter((g) => g.state === 'watering').length })}
        action={
          <UiButton size="sm" variant="ghost" onClick={() => goto('groups')}>
            {t('Manage')}
          </UiButton>
        }
      >
        <CardStrip>
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onRun={(id) => actions.runGroup(id, g.name, undefined, reload)}
              onStop={(id) => actions.stopGroup(id, reload)}
              onPause={(id) => actions.pauseGroup(id, 24, reload)}
              onResume={(id) => actions.pauseGroup(id, 0, reload)}
              onOpen={() => goto('groups')}
            />
          ))}
        </CardStrip>
      </Section>

      <div className={s.row}>
        <div>
          <UpcomingCard
            days={weatherDays(garden)}
            runs={upcomingViews(garden)}
            onAction={(key, a) => {
              const u = findUpcoming(garden, key);
              if (u) actions.upcoming(u, a, reload);
            }}
            summary={
              upcomingCount
                ? skips
                  ? t('{n} runs · {k} may skip', { n: upcomingCount, k: skips })
                  : t('{n} runs', { n: upcomingCount })
                : undefined
            }
            action={
              <UiButton size="sm" variant="ghost" onClick={() => goto('timeline')}>
                {t('Timeline')}
              </UiButton>
            }
          />
        </div>
        <div className={s.wide}>
        <DayTimeline
          lanes={lanes}
          dayStart={dayStart(garden.now)}
          now={garden.now}
          compact={!!phone}
          summary={today ? t('{l} so far', { l: liters(today.l) }) : undefined}
          action={
            <UiButton size="sm" variant="ghost" onClick={() => goto('timeline')}>
              {t('Week')}
            </UiButton>
          }
        />
        </div>
      </div>

      <Panel pad="lg" aria-label={t('Zones')}>
        <PanelHeader
          large
          level={2}
          title={t('Zones')}
          sub={t('{n} zones · tap a zone to water or pause it', { n: garden.zones.length })}
          aside={
            <UiButton size="sm" variant="ghost" onClick={() => goto('zones')}>
              {t('Manage')}
            </UiButton>
          }
        />
        <ZoneBoard sections={zoneSections(garden)} onOpen={setZoneId} minTile={phone ? 150 : 200} openSections={phone ? 2 : 99} />
      </Panel>

      {sources.length > 0 && (
        <Section id="sources" title={t('Water sources')} action={<UiButton size="sm" variant="ghost" onClick={() => goto('sources')}>{t('Manage')}</UiButton>}>
          <CardStrip>
            {sources.map((x) => (
              <SourceCard key={x.id} source={x} onOpen={() => goto('sources')} />
            ))}
          </CardStrip>
        </Section>
      )}

      <div id="attention">
        <FindingsCard title={t('Needs attention')} sub={t('What Zroshua cannot fix itself')} items={attention} counted empty={t('All good — nothing needs you.')} />
      </div>

      <ZoneSheet garden={garden} zoneId={zoneId} onClose={() => setZoneId(null)} onEdit={() => goto('zones')} onChanged={reload} />
    </div>
  );
}
