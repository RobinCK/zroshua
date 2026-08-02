/**
 * Keys the UI builds at runtime instead of writing as literals — `t(unit)`,
 * `t(zone.type)`, `t(weather.condition)` and friends. Static extraction cannot
 * see those calls, so every such key is declared here: `npm run i18n` keeps
 * them in the dictionaries, and adding a new value means adding it below.
 *
 * Nothing imports this module at runtime; it exists for the extractor.
 */
import { t } from './i18n';

/** ScheduleEditor: `t(day)` over the weekday checkboxes. */
const WEEKDAYS = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];

/** Zone watering type: ZonesPage card meta and the MapPage legend. */
const ZONE_TYPES = [t('sprinkler'), t('drip'), t('beds'), t('lawn'), t('shrubs')];

/** Live zone state on the site map. */
const MAP_STATES = [t('watering'), t('queued'), t('fault'), t('disabled'), t('idle')];

/** What started a run — DashboardPage `t(active.triggeredBy)`. */
const RUN_TRIGGERS = [t('manual'), t('schedule'), t('soil'), t('external'), t('tail'), t('once')];

/** Units passed to SliderInput as `unit` and rendered with `t(unit)`. */
const UNITS = [t('min'), t('h'), t('%'), t('mm')];

/** Journal target tag — JournalPage `t(target.tag)`. */
const TARGET_TAGS = [t('zone'), t('group')];

/** Home Assistant weather states — DashboardPage `t(weather.condition)`. */
const WEATHER_CONDITIONS = [
  t('sunny'),
  t('clear-night'),
  t('cloudy'),
  t('partlycloudy'),
  t('rainy'),
  t('pouring'),
  t('snowy'),
  t('snowy-rainy'),
  t('fog'),
  t('hail'),
  t('lightning'),
  t('lightning-rainy'),
  t('windy'),
  t('windy-variant'),
  t('exceptional'),
];

/** Navigation labels, declared as data in App.tsx and rendered with `t(item.label)`. */
const NAV = [
  t('Overview'),
  t('Dashboard'),
  t('Timeline'),
  t('Site map'),
  t('Watering'),
  t('Zones'),
  t('Groups & schedules'),
  t('One-off watering'),
  t('Water sources'),
  t('Sensors'),
  t('Insights'),
  t('Statistics'),
  t('Journal'),
  t('System'),
  t('Settings'),
];

export const DYNAMIC_KEYS = [
  WEEKDAYS,
  ZONE_TYPES,
  MAP_STATES,
  RUN_TRIGGERS,
  UNITS,
  TARGET_TAGS,
  WEATHER_CONDITIONS,
  NAV,
];
