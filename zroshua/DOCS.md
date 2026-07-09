# Zroshua

Smart irrigation controller for Home Assistant: zones on top of your existing
`switch`/`valve` entities, watering groups with controlled concurrency, a scheduler,
weather adjustments, rain & soil sensors, fault control, statistics and notifications.

## Add-on options

| Option | Description |
|---|---|
| `log_level` | Backend log level (`trace`…`error`). |
| `database.driver` | `sqlite` (default, stored in `/data`, covered by HA backups), `mariadb` or `postgres`. |
| `database.host/port/name/username/password` | Connection details for an external database. For the official MariaDB add-on use host `core-mariadb`. |
| `telegram_bot_token` | Bot token from @BotFather. Chat IDs and event filters are configured in the UI (Settings → Notifications). |
| `mqtt_host/mqtt_port/mqtt_username/mqtt_password` | Optional. Only needed for an **external** MQTT broker; with the Mosquitto add-on credentials are auto-detected. Required for the Lovelace cards and native entities. |

**MQTT status:** the Settings page shows whether the MQTT bridge is connected. If the
Lovelace card shows "Waiting for sensor.zroshua_state", MQTT is not connected — install the
Mosquitto add-on + MQTT integration, or set `mqtt_host` in the options.

Changing options restarts the add-on. All irrigation configuration lives in the web UI
and applies instantly without restarts.

## Concepts

- **Zone** — one irrigation line: one or more HA entities switched together, a default
  duration, an optional flow rate (exact l/min or a min–max range), a max-runtime failsafe,
  optional cycle & soak, per-zone ignore flags (rain sensor / weather), a pause control.
- **Water source** *(optional)* — declares hydraulics: max flow budget (l/min), a pump
  entity with start/stop delays (the pump is reference-counted across zones), a dependency
  on another source (a barrel refilled by the well is blocked while well zones run),
  a "water available" binary sensor, an energy meter and an optional flow sensor with an
  idle-flow leak alert.
- **Group** — an ordered set of zones with schedules. Execution mode: sequential,
  parallel, or parallel with a limit; inter-zone delay; a 0–200 % duration multiplier;
  priority for queue conflicts.
- **Rules between groups** — *never overlap* (mutex), *order* (A must finish before B
  starts — e.g. well before barrel), *may run in parallel* (drip lines).
- **Queue** — anything that cannot start yet is visible in the dashboard queue with the
  exact reason it is waiting (mutex, flow budget, sequential group busy, soak…).

## Scheduler

- Whole-week template or individual per-day start times; several start times per day;
  seasonal window (`MM-DD`…`MM-DD`).
- Durations = zone default × group multiplier × weather percentage, clamped by the zone's
  min (rollover) and max-runtime limits. Runs shorter than the minimum are skipped and the
  minutes are added to the next run.
- The 7-day forecast of upcoming runs shows both the planned and the worst-case
  (max temperature boost) durations.
- Manual runs: one tap, preset duration adjustable with a slider before or during the run,
  guaranteed auto-off. Manual always starts — rain/weather are ignored, hydraulic
  violations only warn.
- **Zone-level schedules**: a zone can carry its own schedules in addition to its group —
  useful when one bed needs watering more often. Such runs are single-zone but still obey
  the group's rules, flow budgets, rain/soil sensors and weather scaling.
- Per-schedule zone duration overrides: each schedule can override zone durations
  (defaults come from the zone); the editor previews the end time of every start,
  including the worst-case temperature boost.
- **Run conditions**: a schedule (group or zone) can require e.g. forecast max
  ≥ 30 °C, rain probability ≤ 40 %, or a live sensor value at start time.
  All conditions must pass; failures are journaled, missing data is ignored.

## Timeline

The Timeline page renders each day (up to 7 ahead) as a 24-hour strip per group: bar
length includes the worst-case temperature boost, so gaps are guaranteed free water time.
Runs that overlap against a never-overlap/order rule are red; resolve them by moving
start times, or set the conflict policy (Settings) to decide what happens at runtime:
**wait** (start when the other group finishes — default) or **skip** (strict timetable,
the run is skipped with a journal reason).

## Weather

- Location and forecast come from the Home Assistant weather entity (auto-detected,
  overridable in Settings).
- Rain skip: probability ≥ X % **and** forecast amount ≥ Y mm.
- Freeze protect below a configurable temperature.
- **Temperature scaling** in percent steps (e.g. below 20 °C → skip, below 25 °C → −30 %,
  above 30 °C → +30 %) driven by the forecast max, yesterday's local sensor max, or a
  combination (max / average). Schedule planning reserves the worst-case boost so extended
  runs can never violate group rules.
- **Pause** at three levels — global (all watering), per group and per zone — for a chosen
  number of hours, with automatic resume. A pause skips only automatic runs (schedules, soil
  and weather triggers); manual runs always work. Use a group/zone pause to skip the next run
  without disabling it.

## Sensors

- **Rain** — one or more binary sensors (leak sensors work great): quorum aggregation,
  a configurable dry-out delay after the last wet signal, skip-at-start and stop-during-run
  behaviour (all zones or linked zones only). Zones can ignore the rain sensor individually.
- **Soil moisture** — triggers per zone or group: water for N minutes when moisture drops
  below a threshold, then wait a cooldown (soil sensors react slowly); optionally block
  scheduled runs above a wet threshold; stale sensor data is ignored safely.

## Fault control

- Check-back after every command: a zone that fails to turn **on** is skipped (the rest of
  the plan continues) and reported. A zone that fails to turn **off** triggers escalation:
  pump shutdown, repeated retries and a critical notification.
- Independent per-zone max-runtime failsafe.
- Zones switched on outside Zroshua are either adopted as manual runs (with auto-off) or
  switched off, per your policy.
- On startup, persisted active runs are resumed and any orphaned "on" zones are reconciled off.
- Optional idle-flow leak detection per source (flow while nothing should be running).

## Statistics

- Calculated liters per run from zone flow rates (ranges produce min–max estimates),
  aggregated per day / zone / group.
- Pump energy is measured **only during runs** (kWh counters or W power sensors both work),
  plus an optional configurable "refill tail" after selected groups, tracked as a separate
  category. Set a tariff to see costs.
- Charts for liters, minutes and kWh per day; CSV export.

## Site map

Upload an SVG plan of your property (Inkscape/Figma; one path/polygon per zone). Use
*Assign zones* mode: tap a polygon, pick the zone. The map colors polygons by live state
(watering / queued / scheduled / fault / disabled) and tapping a zone opens a popup with
status, next run and a water-now slider. The SVG is stored in the database and is part of
config export/import.

## Notifications

Providers are configured in Settings → Notifications:

- **Telegram** — set `telegram_bot_token` in the add-on options, then add a provider with
  your chat ID(s).
- **Home Assistant notify** — any `notify.*` service, including mobile push.

Events (each provider can subscribe selectively): watering started, watering finished
(duration + time until the next run), skipped (with reason), stopped by rain, faults,
system events.

## Lovelace cards

A custom card (`custom:zroshua-card`) with five views — `dashboard`, `groups`, `zones`,
`upcoming`, `timeline` — lets you run groups/zones, watch the current watering, the queue,
upcoming runs and today's timeline straight from a Home Assistant dashboard. With the
Mosquitto add-on installed the add-on deploys the card to `/config/www` and registers the
Lovelace resource automatically (YAML-mode dashboards: add `/local/zroshua-card.js` as a
module resource yourself). Add it to a view with `type: custom:zroshua-card`, `view: groups`.
The card reads `sensor.zroshua_state` and sends commands via the `mqtt.publish` service.

## MQTT discovery (native HA entities)

Zero-configuration: if the **Mosquitto broker** add-on is installed, the Supervisor hands
Zroshua the credentials automatically and the following entities appear in Home Assistant
(via MQTT discovery, grouped under a "Zroshua" device):

| Entity | Purpose |
|---|---|
| `switch.<zone>_watering` per zone | Turn on = manual run with the zone default duration (auto-off timer); turn off = stop. Usable in automations and by voice assistants. |
| `sensor.<zone>_next_watering` per zone | Timestamp of the next scheduled run. |
| `binary_sensor.zroshua_watering_active` | Whether anything is watering. |
| `sensor.zroshua_water_today` / `sensor.zroshua_pump_energy_today` | Daily consumption totals. |
| `sensor.<source>_water_today` per water source | Daily liters attributed to that source (a run is attributed via its zone's source; zones without a source count only toward the total). |
| `switch.zroshua_snooze` | Pause all automatic watering for 24 h (turn off to resume). |

The consumption sensors carry `device_class` (`water` / `energy`) and
`state_class: total_increasing` (the midnight reset to 0 reads as a meter reset), so
Home Assistant records **long-term statistics** for them and they can be added to the
**Energy dashboard** (water source / individual device).

Availability is handled with a Last-Will message: if the add-on dies, entities show
*unavailable* instead of stale states. Without a broker the bridge stays dormant.

### Consumption charts

With statistics recorded, the built-in `statistics-graph` card charts water per hour,
day or week — no extra custom cards:

```yaml
type: statistics-graph
title: Water per hour
chart_type: bar
period: hour
days_to_show: 1
stat_types: [change]
entities:
  - sensor.zroshua_water_today   # or the per-source sensors to compare sources
```

Use `period: day` + `days_to_show: 7` for a week-by-day view, or `period: week` for
weekly totals. Statistics accumulate from the first start of add-on version 0.1.16 —
earlier history is not backfilled.

## Backup & restore

- With the default SQLite driver everything (including the site map) lives in `/data`
  and is included in Home Assistant backups.
- With MariaDB/PostgreSQL, data lives in your database server.
- Settings → Backup: export/import the whole configuration as JSON at any time.
