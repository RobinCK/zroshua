# Changelog

## 0.1.25

- **Fix: the Lovelace card kept showing the old version after an add-on update**
  (e.g. it still had Snooze/Rain-delay instead of Pause). The dashboard resource
  URL was unversioned, so Home Assistant and the browser served a cached copy.
  The resource is now versioned by the card's content hash and the existing
  registered resource is updated on change, so the new card loads after an update.
- **Fix: the add-on forgot the open page on refresh.** Page state was kept in the
  URL hash, which Home Assistant's ingress drops when it reloads the panel. It is
  now stored in `localStorage`, so a refresh keeps you on the same page.
- **Fix: could not drag/pan the map on mobile** (pinch-zoom worked, panning did
  not). The scroll viewport used `overflow: hidden`, which blocks programmatic
  scrolling on mobile browsers; it now uses `overflow: auto` with hidden
  scrollbars. One-finger drag pans, two-finger pinch zooms.

## 0.1.24

- **Map zoom reworked for touch.** Removed wheel-to-zoom on desktop (it hijacked
  page scrolling); desktop now zooms with the corner buttons and pans by
  dragging. On mobile you can **pinch-to-zoom and drag with one finger**.
- **Zoom buttons no longer cover the plan.** The SVG gets right padding so the
  floating zoom controls sit in a clear strip — top-right shapes stay clickable.
- **Dashboard stat tiles: aligned icons.** The tile icon was vertically centred
  on the whole text, so tiles with a sub-line (3 rows) showed the icon lower
  than tiles without one (2 rows). Icons are now top-aligned and line up across
  all tiles.

## 0.1.23

- **Map zoom & pan** for large plans. Zoom buttons in the top-right corner (and
  the mouse wheel) zoom toward the cursor/centre; drag to pan on desktop, one
  finger on mobile. Remaining-time labels keep their fixed pixel size at any zoom.
- **Better zone-type colours.** Sprinkler was a flat blue that blended with the
  drip colour; the type palette is now a distinct, dark-mode- and CVD-checked
  set — sprinkler indigo, drip mint, beds amber, lawn lime, shrubs rose — so the
  two water types no longer read as the same colour.

## 0.1.22

- **Map labels are now scale-independent.** The remaining-minute labels were
  drawn as SVG text in the plan's own coordinates, so they looked different on
  every map (tiny on large plans, huge on small ones). They are now a separate
  HTML layer at a fixed pixel size, positioned over each watering zone from its
  on-screen box and re-aligned on resize. The queued dashed outline is likewise
  a constant 2 px regardless of the plan's scale.

## 0.1.21

- **The open page now survives a browser refresh.** The add-on's sidebar
  navigation is client-side; it stores the current page in the URL hash, so a
  reload (or the browser back/forward buttons) keeps you where you were instead
  of jumping back to the dashboard.
- **Site map redesign — cleaner and more informative.** Instead of dark icon
  chips, zones are now **filled by their watering type** (sprinkler / drip / beds
  / lawn / shrubs — a colored legend maps each), and **live state is shown by the
  fill itself**: a watering zone brightens and pulses with its remaining minutes
  on it, idle is steady, queued gets a moving dashed outline, fault turns red,
  disabled fades. The plan reads at a glance like a real garden diagram.

## 0.1.20

- **Site map is now two-channel and far more informative.** Besides the live
  state (fill color), each zone gets a chip at its center showing its **watering
  type** — sprinkler / drip / beds / lawn / shrubs — with a monochrome glyph, and
  the **remaining minutes** while it is watering. A type legend sits under the map
  next to the state legend. At a glance the plan now says *what kind* of irrigation
  each area is and how long it has left, not only whether it is running.

## 0.1.19

- **Site map now works with any SVG, not just tagged polygons.** Exports from
  Figma / Sketch / Illustrator are made of plain shapes (`rect`, `path`,
  `circle`, …) with no `id`, so nothing was clickable. Zroshua now injects a
  stable id into every shape on upload (existing maps are backfilled on load),
  and all shape types — not only `polygon` — are assignable.
- **A zone can be made of several shapes.** *Assign zones* is now a paint flow:
  pick a zone, then tap the shapes that belong to it (tap again to remove).
  Tapping a shape owned by another zone moves it. A zone stored as multiple
  shapes is colored and clickable as one. New per-zone `svgElementIds` field
  (additive; the legacy single `svgElementId` is migrated automatically).
- Fix: on a paused group the add-on Groups page showed two play-like icons side
  by side; the pause control now stays a pause glyph (orange when active).

## 0.1.18

- **Rain delay is gone; watering is now paused, not delayed.** The manual
  "Rain delay" button duplicated Snooze and was confusing, so both are replaced
  by a single **Pause** concept — "pause automatic watering for N hours, resume
  automatically" — available at three levels:
  - **Global** — *Pause all watering* on the dashboard (the hub switch keeps
    its `switch.zroshua_snooze` entity id, relabeled "Pause all watering").
  - **Per group** — a pause control on each group (add-on Groups page and the
    Lovelace card group tile); a paused group shows a "paused until …" state.
  - **Per zone** — a pause control on each zone (add-on Zones page and the card
    zone action sheet), so you can **skip the next run of one bed without
    disabling it** — no more toggling a zone/group off and remembering to turn
    it back on.
  A pause only skips **automatic** runs (schedules, soil and weather triggers);
  manual runs always work. Automatic resume at the end of the window.
- New API: `POST /api/groups/:id/pause` and `POST /api/zones/:id/pause`
  (`{ hours }`, 0 = resume). New MQTT commands `pause`, `pause_group`,
  `pause_zone`. Hub attributes gain `pausedUntil` on each group and zone.
- Migration-safe: adds a nullable `snoozeUntil` column to zones (groups already
  had one). The unused per-zone *ignore rain delay* flag is retired; the stored
  field is left untouched.

## 0.1.17

- **Fix: upcoming-run duration ignored the group's execution mode** — a
  parallel group (e.g. 13 beds × 7 min all together) was shown as the *sum* of
  its zones ("70m") instead of the real wall-clock length ("7m"). The
  dashboard's upcoming list, the Lovelace card group tiles and the card's
  upcoming view now honor the mode: parallel = longest zone, limited parallel =
  batches, sequential = sum, plus inter-zone delays — matching what the
  timeline always showed.
- Upcoming durations also apply per-schedule zone duration overrides and the
  max-runtime clamp, so the preview matches what will actually run.

## 0.1.16

- **Daily water sensor per water source**: every water source now gets its own
  `<source name> water today` sensor over MQTT discovery, so well vs. barrel
  consumption can be charted separately. A run is attributed to its zone's
  source; runs of zones without a source count only toward the total.
- **Water & energy sensors are statistics-ready**: `sensor.zroshua_water_today`,
  `sensor.zroshua_pump_energy_today` and the new per-source sensors carry
  `device_class` (`water` / `energy`) and `state_class: total_increasing`.
  Home Assistant now records long-term statistics for them — the built-in
  *statistics-graph* card charts consumption per hour / day / week, and the
  sensors fit the Energy dashboard (water source / individual device). The
  daily midnight reset is understood as a meter reset. Statistics accumulate
  from this version onward; earlier history is not backfilled.
- Entity ids of the two totals are pinned via `object_id`
  (`sensor.zroshua_water_today` / `sensor.zroshua_pump_energy_today`) so new
  installs get the documented ids; existing installs keep their registered ids.

## 0.1.15

- **Lovelace card: dashboard entities are now clickable** — tapping a running
  zone in "Now" or a waiting zone in "Queue" opens the same action sheet as the
  zones view (stop watering / duration presets). Stopping from the sheet closes
  it immediately.
- **Add-on UI refresh**: brand header with logo mark and translucent blur,
  navigation grouped into sections (Overview / Watering / Insights / System),
  dashboard stat tiles with colored icons matching the Lovelace card, rounded
  cards with softer borders, centered modals with blurred overlay, unified
  radii and shadows across all pages. No functional changes.

## 0.1.14

- **Fix: taps on zone chips sometimes not registering** (needed a second tap)
  and random flicker on mobile. The card re-rendered on every `hass` update —
  i.e. on any entity change anywhere in Home Assistant — so a tap could land on
  DOM that was rebuilt mid-touch. The card now re-renders only when the Zroshua
  hub entity itself changes.
- Touch polish: hover styles (the gray border that stuck to a chip after a tap)
  apply only on devices with a mouse; tap highlight and stray focus rings are
  suppressed (keyboard focus still shows an outline); chips get a subtle press
  effect instead. Hub entity lookup result is cached.

## 0.1.13

- Zone action sheet is now a **floating overlay fixed to the bottom of the
  screen** (with a dimmed backdrop) instead of sitting at the end of the card —
  on a phone with a long zone list you no longer scroll to reach the run/stop
  controls; they pop over the spot you tapped. Opening animates once; live
  state updates never re-trigger the animation, so nothing jumps or flickers.
  Tap the backdrop or × to close.

## 0.1.12

- **Lovelace card redesign** (groups & zones made for real gardens, not demos):
  - `zones` view: zones are grouped into sections by their watering group with
    filter chips (All / Active / Idle / Off + live counts) — 32 zones fit on one
    screen as a compact chip grid with type icons and status dots (pulsing while
    watering, remaining time shown). Tapping a zone opens a bottom action sheet
    with duration presets (5/10/15 min + the zone's default) and a Stop button.
  - `groups` view: modern tiles with the execution-mode icon, zone/schedule
    counts, a live "N watering · M queued" row with a progress shimmer while
    running, a countdown to the next scheduled start ("in 1h 32m · 06:00 · 70m")
    and a full-width Run / **Stop group** button.
  - `dashboard` view: restyled stat tiles, run rows and quick actions to match.
- New `stop_group` MQTT command (stops the group's active runs and clears its
  queued zones); hub attributes extended additively — zones carry `groupIds` and
  `endsAt`, groups carry `activeZones`, `queuedZones`, `nextTs`, `nextMinutes`.
  Old cards keep working with the new add-on and vice versa during the update.

## 0.1.11

- **Fix: Lovelace card stuck on "Waiting for sensor.zroshua_state"** even though
  the entity existed. Home Assistant's MQTT discovery can assign a different
  entity_id (e.g. sensor.zroshua_zroshua_state) because of has_entity_name; the
  card now auto-discovers the hub entity by its attribute shape regardless of
  the exact id, and the error message lists the candidate entities it sees.
  The hub also pins object_id so new installs get sensor.zroshua_state.

## 0.1.10

- **Fix: add-on failed to start after 0.1.9** when MQTT was not configured — the
  nested `mqtt:` options block was treated as required by config validation.
  MQTT options are now flat and truly optional (`mqtt_host`, `mqtt_port`,
  `mqtt_username`, `mqtt_password`); with no MQTT configured the add-on starts
  normally and the MQTT bridge stays dormant, exactly as before. If you use the
  Mosquitto add-on, entities/cards keep working with zero configuration.

## 0.1.9

- MQTT can now be configured manually in the add-on options (mqtt.host/port/
  username/password) for external brokers, in addition to the automatic
  Mosquitto add-on detection.
- Settings page shows a live MQTT status banner (connected / configured but
  offline / off) with the reason, so the "Waiting for sensor.zroshua_state"
  card state is diagnosable without reading logs. New /api/mqtt-status endpoint.

## 0.1.8

- **Lovelace cards**: a custom `zroshua-card` with five views (dashboard, groups,
  zones, upcoming, timeline) to run groups/zones and see live status, the queue,
  upcoming runs and today's timeline from a Home Assistant dashboard. Auto-deployed
  to /config/www and registered as a resource when Mosquitto is present; commands go
  through mqtt.publish, state from a new sensor.zroshua_state hub entity.
- MQTT: sensor.zroshua_state with the full snapshot in json attributes and a
  zroshua/command topic (run_group/run_zone/stop_zone/stop_all/rain_delay/snooze).

## 0.1.7

- Engine fix: same-tick start race — several zones of a sequential group (or
  zones violating mutex/flow-budget/dependency constraints) could start
  simultaneously because in-flight starts were not yet counted as active.
  Starting runs are now reserved against all constraints.
- Manual run on a zone that is already watering now returns "zone is already
  running" instead of creating a duplicate run.
- README rewritten with UI screenshots and a full settings guide.

## 0.1.6

- **Run conditions on schedules** (group and zone): each schedule can carry
  criteria checked at start time — forecast max temperature, forecast rain
  probability, or any sensor's live value (≥ / ≤ threshold). All must pass or
  the run is skipped with a journal reason; unavailable data never blocks
  watering. Extensible for more criteria later.
- Dashboard: countdown to each upcoming watering ("in 2h 05m") and the
  next-watering tile now shows time remaining.

## 0.1.5

- Fix false manual-run warning "source X depends on a source that is currently
  running": it fired when any running zone had no water source assigned and the
  started zone's source had no dependency (null matched null). The message now
  also names the awaited source, and duplicate warnings are collapsed.

## 0.1.4

- **Time slot picker**: start times in schedule editors are now picked on a
  24-hour occupancy strip — red bands are schedules of groups bound by
  never-overlap/order rules (worst-case length included), gray bands are other
  schedules, teal is this run. Click the strip or drag the slider (5-min
  steps), quick presets, "free until HH:MM" hint and a live red warning when
  the chosen slot overlaps a rule-bound group.
- Saving a group with conflicting start times shows a loud warning naming the
  overlaps (runtime behaviour still follows the conflict policy).
- New /api/busy-week endpoint powering the editor visualization.
- Timeline: fixed label column no longer scrolls away; phantom horizontal
  scrollbar removed.
- Review fixes: schedules crossing midnight now split onto the next weekday in
  the occupancy strip and are detected in conflict checks; out-of-season
  schedules no longer produce false conflict bands; a week schedule with no
  days selected now means "off" everywhere (previously the engine ran it
  daily) with an editor hint; zone editor applies the temperature worst-case
  factor and warns on save like the group editor; picker dropdown fits phone
  screens; duplicate bands deduplicated.

## 0.1.3

- Add-on icon and logo (shown in the store and sidebar).
- Pre-start availability check: if a zone's switch/valve entity or its source
  pump is unavailable within a configurable lead window (default 30 min) before
  a scheduled start, a fault notification names the exact entity. Toggle and
  lead time in Settings.

## 0.1.2

Production-safe additive update (no data migration required — new columns and
settings keys get defaults automatically).

- **Zone-level schedules**: any zone can now have its own schedules in addition
  to its group (water one bed more often); zone runs still respect the group's
  never-overlap/order rules, flow budgets and sensors. Per-schedule zone
  duration overrides with an end-time preview in the editor.
- **Timeline page**: 24-hour visualization per day (7 days ahead) — see exactly
  when water is busy or free; bars include the worst-case temperature boost;
  overlaps that violate never-overlap/order rules are highlighted in red.
- **Conflict policy** (Settings): "wait in queue" (default) or "skip the run"
  for strict timetables — a blocked scheduled run is skipped with a journal
  reason instead of running late.
- **Dashboard tiles**: watering now / queued, zones enabled/total, groups,
  today's water and time, next watering.
- Currency string for cost statistics; layout fixes for long names
  (truncation/wrapping); schedule editor shows total run length.

## 0.1.1

- Runtime image switched to node:22-alpine (same as build stages) — fixes
  better-sqlite3 native module ABI mismatch on the Home Assistant base image.
- Options are read directly from /data/options.json; MQTT credentials come
  from the Supervisor services API (bashio no longer required).
- Native build toolchain in the backend build stage for musl targets.

## 0.1.0

Initial release.

- Zones on top of HA `switch`/`valve` entities with flow rates (value or range),
  max-runtime failsafe, cycle & soak, per-zone ignore flags.
- Water sources: flow budgets, pump control with lead/lag delays and reference counting,
  source dependencies (barrel ← well), water-availability sensor, idle-flow leak alert.
- Groups with sequential / parallel / limited-parallel execution, inter-zone delay,
  multiplier, priority; rules between groups: never-overlap, strict order, parallel-ok.
- Scheduler: whole-week or per-day start times, several waterings per day, seasonal
  windows, visible queue with wait reasons, rollover of below-minimum runs.
- Weather: rain-probability skip, freeze protect, temperature scaling in % from forecast
  and/or yesterday's local sensor max with worst-case window reservation.
- Sensors: multi-sensor rain detection (quorum, dry-out, stop-during-run), soil-moisture
  triggers with cooldown and wet-block.
- Fault control: check-back, stuck-valve escalation with pump shutdown, external-switch
  reconciliation, resume after restart.
- Statistics: calculated liters, pump energy counted only during watering plus optional
  refill tail, daily charts, CSV export.
- SVG site map with live zone states and tap-to-water popups.
- Notifications: Telegram and HA notify with per-event filters.
- MQTT discovery: native HA entities (zone switches, next-run sensors, watering-active,
  daily water/energy, snooze) published automatically when the Mosquitto add-on is present.
- SQLite in /data (HA-backup friendly) or external MariaDB/PostgreSQL; JSON export/import.
