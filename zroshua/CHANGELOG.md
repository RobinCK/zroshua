# Changelog

## 0.5.2

- **The light theme no longer looks washed out.** It was white cards on a near-white page with
  10 % colour tints and grey secondary text — nothing had an edge and nothing had weight.
  Now the page sits a shade deeper so the white cards lift off it with a visible border and a
  soft shadow, modals and popovers float on a stronger one, and the navbar has an edge of its
  own. Secondary text went from 3.3:1 to 5.9:1, and every light-variant badge, button and icon
  chip carries a 16 % tint with ink dark enough to read: measured per hue on real pixels, the
  worst case moved from 2.6:1 to 4.6:1 (teal badges 2.8 → 5.6). The timeline strip and the
  occupancy picker got a track colour that is actually visible under the bars, and an empty
  progress track no longer disappears into the card. The dark theme is untouched — its
  surfaces already had real contrast.

## 0.5.1

- **No more white flash on a dark Home Assistant.** The panel had no colour scheme until
  React mounted, so every open started white and turned dark a moment later. The scheme is
  now resolved before the first painted frame.
- **Readable timeline legend in both schemes.** The legend used the state colour as the text
  colour on a tinted background of the same hue: *will be skipped* measured 1.8:1 and *may be
  skipped* 1.4:1 in the light scheme. Each entry is now a swatch of the exact bar fill next to
  plain label text — 8:1 dark, 21:1 light — and the swatch shows the one-off hatch and the
  pre-blended ghost as they really look. Same change in the Lovelace card, which inherits
  whatever theme Home Assistant is using.

## 0.5.0

- **One-off watering.** A dated, one-shot request — "these five beds tonight at 19:00, once,
  then forget it" — built in a four-step wizard: pick the zones, arrange them into ordered
  steps (zones inside a step open together), pick the time on the same occupancy strip the
  schedule editor uses, confirm. It has its own page, a button on the dashboard, and it shows
  up wherever a scheduled run does: in *Upcoming waterings*, on the timeline, in the journal
  and in both Lovelace card views, where it can be skipped or cancelled.
- A one-off is an **automatic** run, not a manual one. It waits its turn in the queue and obeys
  never-overlap and order rules, source dependencies, the "source has water" sensor and the
  flow budget — a manual run bypasses all of those, which is the last thing you want from a run
  scheduled hours in advance. It obeys pauses, the rain sensor and the soil-moisture block
  unless the one *force* switch is on. It ignores the weather multiplier, temperature scaling,
  run conditions and the minimum-duration rollover: the minutes are taken literally.
- **The wizard's numbers match what will happen.** Zones that will certainly be skipped are
  left out of the timing and the water estimate instead of being counted next to the warning
  that says they will not run; a step whose zones do not fit on their water source is timed as
  the partly serial run it will really be; a zone split by cycle/soak holds its slot for the
  whole cycle, so "finish by 21:00" no longer misses by the soak time. Every warning is a code
  the UI translates, not English text from the engine.
- Only the current step is ever queued, so a one-off that runs two rule-bound groups in the
  "wrong" order cannot deadlock against its own later step, and a cycle/soak gap is measured
  from when the previous segment really ended rather than from when the run was planned.
- Everything that stops a one-off is named: paused before its start, expired because the
  controller was busy or offline across it, dropped after half an hour of not being able to
  start, cut short by a restart, or every zone skipped. Each one is journaled, notified, and
  shown on the run's own history row. Finished rows are pruned after 30 days.
- Pausing a one-off that is already watering is refused instead of silently reporting success
  while the valves stay open — a running one is stopped by cancelling it.
- The timeline gained a third kind of run. It gets no new colour: every fifth hue collides with
  an existing one under deuteranopia, so a one-off borrows the zone hue and is told apart by a
  45° hatch, its own row and its own legend chip.
- The soil-moisture block now appears on the timeline as a *may be skipped* reason for ordinary
  scheduled runs too — it is a live sensor, so it is never a certainty.

## 0.4.0

- **The timeline now says what will actually happen.** A reserved slot is not the
  same as a slot that will be watered, and until now both looked identical. A run
  that will certainly be skipped — watering paused, its group paused, all of its
  zones paused, or the rain dry-out window covering the start — is drawn in amber.
  A run that might still be skipped is drawn in a muted version of its own colour.
  Hovering or tapping a bar names the state and lists the reasons. The bar keeps
  its place either way: the time stays reserved until the run is really skipped.
  The Lovelace card's `timeline` view shows the same three states.
- **A forecast is no longer treated as a fact.** Anything re-read at start time —
  the weather forecast, temperature scaling, forecast-based run conditions, live
  soil sensors — now marks a run *uncertain* rather than *certainly skipped*, so a
  condition wanting ≥ 30 °C against a 20 °C forecast no longer claims to know what
  the temperature will be. The same applies to the dashboard's upcoming list,
  where those reasons move from the red *will skip* badge to the yellow *may skip*.
- A rule conflict is now an outline on the bar instead of replacing its colour, so
  a run can show that it both collides and will be skipped.
- Fixed the dry-out window marking runs that had already finished *before* it
  started raining as "will be skipped".

## 0.3.11

- **Troubleshooting section in the README** for the case where the Lovelace card keeps
  waiting for the hub entity. The usual cause is not MQTT at all: the entities were
  discovered but are *disabled* in Home Assistant, and a disabled entity has no state,
  so the card cannot see it. Also corrects the hub entity id in the docs — Home Assistant
  derives it from the device name, so it is `sensor.zroshua_zroshua_state`, not
  `sensor.zroshua_state` as previously documented. The card never depended on the name;
  it identifies the hub by its attributes.

## 0.3.10

- **The dry-out delay now starts when the sensor goes dry.** It was measured
  from the moment the rain sensor turned *wet*, so any rain lasting longer than
  the delay left nothing blocking the next run: the window had already expired
  while it was still raining, and watering was allowed the second the sensor
  dried. With a 2 h delay and rain from 05:37 to 19:11, a run scheduled for the
  evening went ahead. The window is now counted from the last time the sensor
  was seen wet, so it always runs from the end of the rain.

## 0.3.9

- **Water source labels are short again.** The ones that explained themselves
  with a dash — capacity, level sensor, idle flow, flow deviation, the two
  level thresholds — took two or three lines each and pushed their fields out
  of line. They now name the field and keep the explanation under the ⓘ, with
  the unit inside the input.
- On a phone the source form no longer squeezes three fields into a row; the
  rows stack instead, so nothing is cut mid-word.

## 0.3.8

- **Run conditions are readable again.** A condition used to be one long row of
  controls that ran into the next one, so it was hard to see where one ended.
  Each is now its own bordered block: what is measured on top, then
  *if … else …* underneath. The paragraph that explained them moved behind the
  ⓘ next to the heading.
- **Notification rows line up.** A switch and the fields it controls sat on
  different baselines because only the fields had a label above them, and the
  fields drifted to the far side of the row. They now share a baseline next to
  their switch, and are greyed out until the switch is on.
- The lead-time field no longer breaks its label across three lines; the unit
  sits inside the input instead.

## 0.3.7

- **Form help moved into an info icon.** Long explanations under fields — and
  the paragraphs above the sensors, sources, timeline and map sections — pushed
  the inputs around and made side-by-side columns line up badly, especially on
  a phone. Each explanation now sits behind an ⓘ next to its label or heading,
  shown on hover, on keyboard focus and on tap. Labels themselves lost their
  trailing parenthetical, so most now fit on one line.

## 0.3.6

- **Rain no longer lets the next zone of a group start.** When the sensor turned
  wet mid-run, the running zone stopped but the zone behind it in the group
  could still start a second later and water through the rain for its full time.
  The queued zones are now dropped before the running ones are stopped, and the
  sensor is re-read at the moment a zone would actually open its valve — a group
  plans all of its zones up front, so the reading taken at planning time is not
  enough. Skipped zones say so in the journal instead of vanishing silently.

## 0.3.5

- **A group's "last watered" no longer counts a single zone's run.** Watering
  one zone by hand — or by that zone's own schedule or a soil trigger — made the
  whole group look freshly watered. It now reports the last time the group
  itself ran; the zone card still shows the zone.
- Group cards said "1 активних розкладів"; the schedule count now takes the
  right plural form in every language.

## 0.3.4

- **The journal page is translated again.** It was still showing English
  headers and filters in every language after the 0.3.3 change.
- The per-zone duration field in the schedule editor showed its unit as
  "min" instead of the translated one.

## 0.3.3

- **Correct plural forms.** "2 дні тому" and "8 днів тому" are now both right;
  previously every count used one form. Plural rules come from the language
  itself, so Ukrainian, Polish, Czech and Slovak get their four forms and
  Romanian its three.
- **Translations moved to i18next** with dictionaries as plain JSON in
  `frontend/src/locales/`. Keys are still the English source text, so nothing
  changes on screen — but contributors now get a standard, documented setup and
  `npm run i18n`, which adds new strings and removes dead ones across all
  languages at once. See the Translations section in the README.

## 0.3.2

- **Full translation coverage.** Every remaining screen is now translated in all
  ten languages: the zone, group and water-source forms, the sensors page
  (including the soil-moisture and temperature trigger forms and their help
  text), statistics (tiles and the week/month/season switch), the map legend
  (zone type and status), the schedule editor, and the whole Settings page
  (weather triggers, temperature scaling, Telegram, limits & misc, backup).
- **Dates and times follow the UI language.** The timeline day headers, journal
  timestamps, date badges and "last watered" phrases now format with the
  selected locale instead of the browser default.
- Ukrainian wording polish (e.g. «можливий пропуск» instead of the awkward
  «можливо пропуск»).

## 0.3.1

- **Language picker in Settings.** Home Assistant does not pass the account
  language to an ingress add-on, so the UI followed the *device* language, which
  can differ from your HA account. Settings now has a **Language** selector:
  *System (device language)* by default, plus an explicit override to any of the
  ten languages. The choice is remembered per browser.
- **Wider translation coverage** — Settings (incl. notifications), Sensors,
  Water sources, Timeline, Statistics and the site map now translate their
  titles, section headers, buttons and key labels. Deep form fields still fall
  back to English and will be filled in next.

## 0.3.0

- **Multi-language UI.** The interface now follows the browser / Home Assistant
  language automatically — no separate setting. Supported: English (default),
  Українська, Polski, Deutsch, Slovenčina, Română, Italiano, Español, Čeština,
  Français. Anything not yet translated falls back to English, so the UI is
  never blank. Covers the navigation, dashboard, zones, groups, the journal and
  common actions to start; deeper settings screens will be translated next.

## 0.2.8

- **Group and zone cards show when each was last actually watered.** A skipped
  run is not counted (skips never create a run record), so "last watered"
  reflects real watering, not the schedule.
- **Journal is easier to read and filter.** Filter by event type and by zone
  or group (one grouped picker, each row tagged zone/group with the friendly
  name). Event names are spelled out, and on a phone the log renders as stacked
  cards instead of a cramped table.
- **Fixed fractional-hour pause text in the journal** (e.g. "paused for
  0.8125…h" now reads "paused for 49 min (until 8:44 AM)").

## 0.2.7

- Water source editor: put **Pump entity** and **When the run finishes** side by
  side in one row (they belong together); the pump start/stop delays now sit
  below them and only show once a pump entity is set.

## 0.2.6

- **Pump: choose what happens after a run.** A source's pump entity no longer
  always switches off when watering ends. Per source, pick *turn off* (default),
  *leave on*, or *restore the state it had before Zroshua turned it on* — for
  pumps that also feed the house or water outlets and must not be cut.
- **Pump availability check.** If the pump entity is `unavailable` at start, the
  run raises a fault notification and continues best-effort (in addition to the
  existing pre-start availability check that flags it before a scheduled start).
- **Conditions: skip *or* water less.** Every run condition now has an explicit
  action for when it is not met — *skip the run* (as before) or *water less*: run
  at a chosen % of the normal time. "Water less" only shortens a run, so it stays
  inside the reserved worst-case slot and never clashes with another group. The
  soil-moisture condition reads more clearly as a result ("sensors ≤ X% → else
  skip / water less").

## 0.2.5

- **Cleaner group tiles in the Lovelace card.** The tile header showed the
  pause button next to a bare execution-mode glyph — the parallel-mode icon
  (two bars) looked like a second pause and the sequential arrow read as
  random. The corner now holds only the pause/resume button; the execution
  mode moved into the meta line as a labelled chip (Sequential / Parallel /
  Parallel ×N). The card attributes gained `parallelLimit` for the ×N label.

## 0.2.4

- **The add-on dashboard's "Upcoming waterings" is now mobile-friendly too**
  (same fix as 0.2.3 did for the Lovelace card). Each row stacks the name and
  zones above the meta line (duration · countdown · time · pause menu) on a
  phone, and folds back to a single line on wider screens.

## 0.2.3

- **Lovelace card `upcoming` view is now mobile-friendly.** On a narrow card
  the name, zones and the meta line (duration · countdown · time · pause
  button) stacked into one cramped row and overflowed. Each run is now a
  two-line block — name and zones on top, the meta line below — and folds back
  to a single line on wider cards (via a container query), so it reads cleanly
  at phone width.

## 0.2.2

- **Upcoming waterings now include a zone's own schedules**, not only group runs.
  A zone watered on its own schedule (more often than its group) shows up tagged
  *zone*, with the same skip prediction and duration estimate as group runs — on
  the dashboard and in the Lovelace card's `upcoming` view.
- **Pause / skip a run straight from Upcoming waterings.** Each row has a pause
  menu: *skip this run* (pauses just that group or zone until the run is past),
  pause 6/12/24 h, or resume. Paused rows are marked and dimmed. The card's
  upcoming rows get the same skip/resume button.
- **Soil moisture as a run condition, with several sensors.** A sensor condition
  can now read **multiple sensors combined** (average / min / max), and a one-tap
  **Soil moisture** preset drops in a *sensor(s) ≤ %* rule — skip the scheduled
  run while the bed is already moist. Skipping is safe: a soil-moisture trigger
  still waters the zone if it dries out before the next scheduled run. (Existing
  single-sensor conditions keep working unchanged.)

## 0.2.1

- Fixed the group-level "started" notification reporting **1 zone planned**
  for parallel groups regardless of the real count (the dispatcher drains the
  queue before the first zone's start message is built, so counting the queue
  there always saw a single zone). The planned count is now recorded when the
  group run is created; the "finished" message was already correct.

## 0.2.0

Feature release. Everything is additive — existing configurations keep working
unchanged.

- **Water source exclusivity.** Mark sources that must never run at the same
  time (Water sources → "Never run at the same time as"). Every pair of groups
  drawing from such sources becomes mutually exclusive automatically — in the
  scheduler, the timeline conflict check and the time-slot picker — replacing
  hand-written never-overlap rules for each group pair.
- **"Finish by" schedule anchor.** Each start time can be a *start at* or a
  *finish by* time. With *finish by*, the start is computed from the worst-case
  run length (temperature boost, batching, max-runtime clamps included), so the
  run is guaranteed done by the configured time even on the hottest planned day.
- **Per-schedule zone selection.** A schedule can water only a subset of the
  group's zones (checkboxes in the schedule editor) — e.g. a midday refresh for
  the two thirstiest beds only. Unticked zones keep their durations for the
  other schedules. Replaces the "set duration 0 in this schedule" workaround.
- **Barrel volume tracking.** Give a source a capacity (L) and optionally a
  refill rate (L/min): Zroshua estimates the live level from running zones'
  flow rates, or reads an analog **level sensor (%)** directly. The level is
  shown on the dashboard, published as `sensor.<source>_level` via MQTT
  discovery, warns below a low-reserve threshold and can block scheduled
  starts below a critical percentage (manual runs are never blocked).
- **Temperature triggers (heat burst).** Sensors → Temperature triggers: when
  a temperature sensor passes a threshold inside a daily window (e.g. ≥ 30 °C
  between 13:00 and 16:00), water a zone or group for N minutes with a
  cooldown — replaces the "midday schedule + sensor condition" pattern.
  Respects the rain sensor unless set to ignore it.
- **Flow deviation alerts.** Per source: with a flow sensor, the measured flow
  is compared against the expected sum of running zones; a sustained deviation
  beyond your threshold raises a fault naming the direction (higher → possible
  burst pipe, lower → clogged emitters / low pressure), at most once an hour.
- **Smarter notifications.** Group-level messages (one *started* / *finished*
  message per group run instead of one per zone — on by default), an optional
  **daily digest** (runs, minutes, liters, energy, cost, skips, faults at a
  chosen time) and **quiet hours** that suppress everything except faults.
- **Upcoming waterings predict skips.** Runs that would be skipped under the
  current state are marked *will skip* with the reasons — including the rain
  **dry-out window with its end time** (the sensor may already be dry while
  the delay still blocks) — and *may skip* for start-time-dependent conditions.
  Shown on the dashboard and in the Lovelace card's `upcoming` view.
- The **time-slot picker** now draws the run's planned length solid with a
  hatched worst-case tail (and a tick at the planned end), and the **Lovelace
  card timeline** shows the same worst-case boost tails as the Timeline page.
- Fixed source level accounting losing consumption between the once-a-minute
  persists.

## 0.1.27

- **Timeline: the finish window is now clearly readable.** The translucent
  bands from 0.1.26 were hard to tell apart (the "may finish earlier" band hid
  under the bars and the boost tail blended into the track). Now a **white tick**
  marks the planned end, **dark hatching inside the bar** shows how much earlier
  a run may finish (negative scaling), and a **hatched tail** after the tick
  shows the worst-case temperature boost.

## 0.1.26

- **Timeline: temperature scaling no longer draws overlapping zones inside a
  group.** Each zone bar was stretched to its own worst-case end while the next
  zone stayed at its base start, so scaled zones of one group visually overlapped
  — which read as a pressure conflict that cannot actually happen (at runtime a
  longer zone simply shifts the next one). Zones are now drawn at their base
  cascade (back-to-back), and each run shows a **finish window** instead: a
  medium-opacity band = may finish earlier (negative scaling steps), a faint band
  = worst-case temperature boost. Tooltips show the window ("finishes between
  … and …"); rule conflicts are still detected against the worst case.
- The Lovelace card timeline uses the base plan (no more overlapping bars).
- **Soil moisture triggers can ignore the rain sensor** (per-trigger switch) —
  for soil under a roof or in a greenhouse. Such a trigger fires even while the
  rain sensor is wet and its watering survives a rain event; by default a wet
  sensor postpones the trigger until dry (previously zone-target triggers
  ignored rain unconditionally and group-target ones were always blocked).

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
