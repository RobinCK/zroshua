import { useState } from 'react';
import { AppShell, Badge, Burger, Group, NavLink, ScrollArea, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendarTime,
  IconChartBar,
  IconDroplet,
  IconDropletFilled,
  IconLayoutDashboard,
  IconListDetails,
  IconMap,
  IconSettings,
  IconAccessPoint,
  IconCategory,
  IconNotes,
} from '@tabler/icons-react';
import { useEngineState } from './hooks';
import DashboardPage from './pages/DashboardPage';
import ZonesPage from './pages/ZonesPage';
import GroupsPage from './pages/GroupsPage';
import SourcesPage from './pages/SourcesPage';
import SensorsPage from './pages/SensorsPage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import StatsPage from './pages/StatsPage';
import JournalPage from './pages/JournalPage';
import SettingsPage from './pages/SettingsPage';

const sections = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
      { key: 'timeline', label: 'Timeline', icon: IconCalendarTime },
      { key: 'map', label: 'Site map', icon: IconMap },
    ],
  },
  {
    label: 'Watering',
    items: [
      { key: 'zones', label: 'Zones', icon: IconDroplet },
      { key: 'groups', label: 'Groups & schedules', icon: IconCategory },
      { key: 'sources', label: 'Water sources', icon: IconAccessPoint },
      { key: 'sensors', label: 'Sensors', icon: IconListDetails },
    ],
  },
  {
    label: 'Insights',
    items: [
      { key: 'stats', label: 'Statistics', icon: IconChartBar },
      { key: 'journal', label: 'Journal', icon: IconNotes },
    ],
  },
  {
    label: 'System',
    items: [{ key: 'settings', label: 'Settings', icon: IconSettings }],
  },
] as const;

type PageKey = (typeof sections)[number]['items'][number]['key'];

const PAGE_KEYS = new Set<string>(sections.flatMap((s) => s.items.map((i) => i.key)));
const STORE_KEY = 'zroshua.page';
// Persist via localStorage, not the URL hash: Home Assistant's ingress reloads the
// add-on iframe at its base URL on refresh, which would drop a hash.
const initialPage = (): PageKey => {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s && PAGE_KEYS.has(s)) return s as PageKey;
  } catch { /* private mode */ }
  const h = window.location.hash.replace(/^#/, '');
  return (PAGE_KEYS.has(h) ? h : 'dashboard') as PageKey;
};

export default function App() {
  const [opened, { toggle, close }] = useDisclosure();
  const [page, setPage] = useState<PageKey>(initialPage);
  const { state, journalTick } = useEngineState();

  const goto = (k: PageKey) => {
    try { localStorage.setItem(STORE_KEY, k); } catch { /* private mode */ }
    setPage(k);
    close();
  };

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header className="z-header" withBorder={false} style={{ boxShadow: '0 1px 0 rgba(128,128,128,.15)' }}>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <span className="z-logo">
              <IconDropletFilled size={18} />
            </span>
            <Text fw={750} size="lg" style={{ letterSpacing: '-0.01em' }}>
              Zroshua
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            {state && !state.haConnected && (
              <Badge color="red" variant="light" size="lg">
                HA disconnected
              </Badge>
            )}
            {state && state.active.length > 0 && (
              <Badge color="teal" variant="light" size="lg" leftSection="●">
                {state.active.length} watering
              </Badge>
            )}
            {state?.snoozeUntil && (
              <Badge color="orange" variant="light" size="lg">
                paused
              </Badge>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <ScrollArea>
          {sections.map((s) => (
            <div key={s.label}>
              <div className="z-navsec">{s.label}</div>
              {s.items.map((p) => (
                <NavLink
                  key={p.key}
                  label={p.label}
                  leftSection={<p.icon size={18} stroke={1.8} />}
                  active={page === p.key}
                  variant="light"
                  onClick={() => goto(p.key)}
                />
              ))}
            </div>
          ))}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        {page === 'dashboard' && <DashboardPage state={state} />}
        {page === 'timeline' && <TimelinePage />}
        {page === 'map' && <MapPage state={state} />}
        {page === 'zones' && <ZonesPage state={state} />}
        {page === 'groups' && <GroupsPage />}
        {page === 'sources' && <SourcesPage />}
        {page === 'sensors' && <SensorsPage />}
        {page === 'stats' && <StatsPage />}
        {page === 'journal' && <JournalPage tick={journalTick} />}
        {page === 'settings' && <SettingsPage />}
      </AppShell.Main>
    </AppShell>
  );
}
