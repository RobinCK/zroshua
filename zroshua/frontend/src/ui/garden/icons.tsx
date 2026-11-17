import {
  IconArrowRight,
  IconBucketDroplet,
  IconChartBar,
  IconCloudRain,
  IconDroplet,
  IconEngine,
  IconEqual,
  IconGauge,
  IconLeaf,
  IconPlant2,
  IconSeedling,
  IconTree,
  IconBolt,
  IconClockHour4,
  type Icon,
} from '@tabler/icons-react';

/** The same sprinkler the Lovelace card draws, in the Tabler stroke style. */
function IconSprinkler({ size = 24, stroke = 1.8 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20v-8" />
      <path d="M8.5 20h7" />
      <path d="M12 8.5V4.5" />
      <path d="M8.2 9.7 6 7.5" />
      <path d="M15.8 9.7 18 7.5" />
      <path d="M7.5 12.5h-3" />
      <path d="M19.5 12.5h-3" />
    </svg>
  );
}

/** Zone types → icon. Unknown types get the sprinkler: it is what a zone is by default. */
const ZONE_ICONS: Record<string, Icon | typeof IconSprinkler> = {
  lawn: IconSprinkler,
  sprinkler: IconSprinkler,
  beds: IconSeedling,
  drip: IconDroplet,
  shrubs: IconLeaf,
  tree: IconTree,
};

export function ZoneIcon({ kind, size = 20 }: { kind: string; size?: number }) {
  const I = ZONE_ICONS[kind] ?? IconSprinkler;
  return <I size={size} stroke={1.8} />;
}

const SOURCE_ICONS: Record<string, Icon> = {
  pump: IconEngine,
  well: IconEngine,
  tank: IconBucketDroplet,
  barrel: IconBucketDroplet,
  mains: IconDroplet,
};

export function SourceIcon({ kind, size = 22 }: { kind: string; size?: number }) {
  const I = SOURCE_ICONS[kind] ?? IconDroplet;
  return <I size={size} stroke={1.8} />;
}

const SENSOR_ICONS: Record<string, Icon> = {
  plant: IconPlant2,
  soil: IconDroplet,
  rain: IconCloudRain,
};

export function SensorIcon({ kind, size = 22 }: { kind: string; size?: number }) {
  const I = SENSOR_ICONS[kind] ?? IconDroplet;
  return <I size={size} stroke={1.8} />;
}

const MEASURE_ICONS: Record<string, Icon> = {
  water: IconDroplet,
  energy: IconBolt,
  time: IconClockHour4,
  flow: IconGauge,
  usage: IconChartBar,
};

export function MeasureIcon({ kind, size = 22 }: { kind: string; size?: number }) {
  const I = MEASURE_ICONS[kind] ?? IconChartBar;
  return <I size={size} stroke={1.8} />;
}

/** Execution mode glyph: an arrow for one by one, two bars for at once. */
export function ModeIcon({ mode, size = 14 }: { mode: string; size?: number }) {
  const I = mode === 'sequential' ? IconArrowRight : IconEqual;
  return <I size={size} stroke={2} aria-hidden="true" />;
}
