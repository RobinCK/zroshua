import { useState } from 'react';
import { Drawer } from '@mantine/core';
import {
  IconAccessPoint,
  IconCalendarPlus,
  IconCalendarTime,
  IconCategory,
  IconChartBar,
  IconDots,
  IconDroplet,
  IconDropletFilled,
  IconLayoutDashboard,
  IconMap,
  IconNotes,
  IconPlant2,
  IconSettings,
  type Icon,
} from '@tabler/icons-react';
import { useEngineState } from './hooks';
import { t } from './i18n';
import { CountBadge, IconButton, StatusPill } from './ui/kit';
import OverviewPage from './pages/OverviewPage';
import ZonesPage from './pages/ZonesPage';
import GroupsPage from './pages/GroupsPage';
import SourcesPage from './pages/SourcesPage';
import SensorsPage from './pages/SensorsPage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import StatsPage from './pages/StatsPage';
import JournalPage from './pages/JournalPage';
import SettingsPage from './pages/SettingsPage';
import OneTimePage from './pages/OneTimePage';
import s from './shell.module.css';

interface PageDef {
  key: string;
  label: string;
  icon: Icon;
}

/** Every page, in the order of the top navigation. */
const PAGES: PageDef[] = [
  { key: 'dashboard', label: 'Overview', icon: IconLayoutDashboard },
  { key: 'timeline', label: 'Timeline', icon: IconCalendarTime },
  { key: 'groups', label: 'Groups', icon: IconCategory },
  { key: 'zones', label: 'Zones', icon: IconDroplet },
  { key: 'onetime', label: 'One-off', icon: IconCalendarPlus },
  { key: 'sources', label: 'Sources', icon: IconAccessPoint },
  { key: 'sensors', label: 'Sensors', icon: IconPlant2 },
  { key: 'map', label: 'Map', icon: IconMap },
  { key: 'stats', label: 'Statistics', icon: IconChartBar },
  { key: 'journal', label: 'Journal', icon: IconNotes },
];

/** The phone's bottom bar: the four places you go most, the rest behind «More». */
const TABS = ['dashboard', 'zones', 'groups', 'stats'];

const PAGE_KEYS = new Set([...PAGES.map((p) => p.key), 'settings']);
const STORE_KEY = 'zroshua.page';
// Persist via localStorage, not the URL hash: Home Assistant's ingress reloads the
// add-on iframe at its base URL on refresh, which would drop a hash.
const initialPage = (): string => {
  try {
    const v = localStorage.getItem(STORE_KEY);
    if (v && PAGE_KEYS.has(v)) return v;
  } catch {
    /* private mode */
  }
  const h = window.location.hash.replace(/^#/, '');
  return PAGE_KEYS.has(h) ? h : 'dashboard';
};

export default function App() {
  const [page, setPage] = useState<string>(initialPage);
  const [more, setMore] = useState(false);
  const { state, journalTick } = useEngineState();

  const goto = (k: string) => {
    if (!PAGE_KEYS.has(k)) return;
    try {
      localStorage.setItem(STORE_KEY, k);
    } catch {
      /* private mode */
    }
    setPage(k);
    setMore(false);
    window.scrollTo({ top: 0 });
  };

  const watering = state?.active.length ?? 0;
  const paused = !!state?.snoozeUntil && state.snoozeUntil > Date.now();
  const pill = !state ? null : !state.haConnected ? (
    <StatusPill state="fault">{t('HA disconnected')}</StatusPill>
  ) : watering ? (
    <StatusPill state="watering">{t('{count} watering', { count: watering })}</StatusPill>
  ) : paused ? (
    <StatusPill state="paused">{t('paused')}</StatusPill>
  ) : (
    <StatusPill state="done">{t('Auto')}</StatusPill>
  );
  const faults = state?.faults.length ?? 0;

  return (
    <div className={s.app}>
      <header className={s.top}>
        <button type="button" className={s.brand} onClick={() => goto('dashboard')} aria-label={t('Overview')}>
          <span className={s.mark} aria-hidden="true">
            <IconDropletFilled size={17} />
          </span>
          <span className={s.word}>zroshua</span>
        </button>
        <nav className={s.nav} aria-label={t('Sections')}>
          {PAGES.map((p) => (
            <button key={p.key} type="button" className={s.navItem} aria-current={page === p.key ? 'page' : undefined} onClick={() => goto(p.key)}>
              {t(p.label)}
              {p.key === 'zones' && faults > 0 && <CountBadge value={faults} state="fault" />}
            </button>
          ))}
        </nav>
        <div className={s.right}>
          {pill}
          <IconButton label={t('Settings')} variant="ghost" icon={<IconSettings size={20} />} onClick={() => goto('settings')} />
        </div>
      </header>

      <main className={s.main}>
        {page === 'dashboard' && <OverviewPage state={state} goto={goto} />}
        {page === 'timeline' && <TimelinePage />}
        {page === 'map' && <MapPage state={state} />}
        {page === 'zones' && <ZonesPage state={state} />}
        {page === 'groups' && <GroupsPage state={state} />}
        {page === 'onetime' && <OneTimePage />}
        {page === 'sources' && <SourcesPage state={state} />}
        {page === 'sensors' && <SensorsPage state={state} />}
        {page === 'stats' && <StatsPage state={state} />}
        {page === 'journal' && <JournalPage tick={journalTick} />}
        {page === 'settings' && <SettingsPage />}
      </main>

      <nav className={s.tabbar} aria-label={t('Sections')}>
        {TABS.map((k) => {
          const p = PAGES.find((x) => x.key === k)!;
          return (
            <button key={k} type="button" className={s.tab} aria-current={page === k ? 'page' : undefined} onClick={() => goto(k)}>
              <p.icon size={22} stroke={1.8} />
              {t(p.label)}
              {k === 'zones' && faults > 0 && (
                <span className={s.tabDot}>
                  <CountBadge value={faults} state="fault" />
                </span>
              )}
            </button>
          );
        })}
        <button type="button" className={s.tab} aria-current={!TABS.includes(page) ? 'page' : undefined} onClick={() => setMore(true)}>
          <IconDots size={22} stroke={1.8} />
          {t('More')}
        </button>
      </nav>

      <Drawer opened={more} onClose={() => setMore(false)} position="bottom" size="auto" title={t('All sections')}>
        <div className={s.more}>
          {[...PAGES.filter((p) => !TABS.includes(p.key)), { key: 'settings', label: 'Settings', icon: IconSettings }].map((p) => (
            <button key={p.key} type="button" className={s.moreItem} aria-current={page === p.key ? 'page' : undefined} onClick={() => goto(p.key)}>
              <p.icon size={20} stroke={1.8} />
              {t(p.label)}
            </button>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
