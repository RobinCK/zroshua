import { FakeHa } from './fake-ha';
import { PLAN_SENSORS, PLAN_ZONES, valveEntity } from './garden-plan';

export type Scenario = 'summer' | 'calm' | 'season_off';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Deterministic noise so two runs of the stand draw the same curves. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Outdoor temperature over a summer day: 17° before dawn, 29° mid-afternoon. */
function outdoorAt(ts: number): number {
  const d = new Date(ts);
  const h = d.getHours() + d.getMinutes() / 60;
  return +(23 + 6 * Math.sin(((h - 9) / 24) * 2 * Math.PI) + (noise(Math.floor(ts / HOUR)) - 0.5)).toFixed(1);
}

/** Daylight in lux: zero at night, a bell around 13:00, part shade under trees. */
function luxAt(ts: number, shade = 0.35): number {
  const d = new Date(ts);
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 5.5 || h > 21) return 0;
  return Math.round(Math.max(0, Math.sin(((h - 5.5) / 15.5) * Math.PI)) * 60000 * shade);
}

/**
 * The garden behind the fake Home Assistant: valves, two pumps with pressure, flow and an
 * energy counter, a barrel whose level follows the water drawn, soil sensors that dry out over
 * the day and wet up while their zone waters, a rain sensor and a weather entity with a
 * forecast. A five-second tick moves the physics; a week of history is backfilled at start.
 */
export class Garden {
  private readonly open = new Set<string>();
  private readonly pumps = { well: false, barrel: false };
  private moisture = new Map<string, number>();
  private energy = { well: 1284.2, barrel: 906.4 };
  private barrelL = 1839;
  private timer: NodeJS.Timeout | null = null;
  private last = Date.now();

  constructor(
    private readonly ha: FakeHa,
    private readonly scenario: Scenario,
  ) {}

  start() {
    this.devices();
    this.backfill();
    this.tick();
    this.timer = setInterval(() => this.tick(), 5000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  /** The barrel pump is offline in the summer scenario: the design case of a source that blocks a group. */
  private get barrelOffline() {
    return this.scenario === 'summer';
  }

  private devices() {
    const ha = this.ha;
    ha.device('dev_valves', 'Garden valves', 'Virtual garden', '32-channel relay');
    for (const z of PLAN_ZONES) {
      const id = valveEntity(z.id);
      ha.register(id, 'dev_valves', `${z.name} valve`);
      ha.setState(id, 'off', { friendly_name: `${z.name} valve`, icon: 'mdi:valve' });
      ha.onSwitch(id, (on) => {
        if (on) this.open.add(z.id);
        else this.open.delete(z.id);
        ha.setState(id, on ? 'on' : 'off');
        this.tick();
      });
    }

    const pump = (key: 'well' | 'barrel', name: string) => {
      const dev = `dev_sirio_${key}`;
      ha.device(dev, name, 'Sirio', 'Winet pump controller');
      const sw = `switch.sirio_${key}_backyard`;
      ha.register(sw, dev, name);
      ha.register(`sensor.sirio_${key}_backyard_pressure`, dev, 'Pressure');
      ha.register(`sensor.sirio_${key}_backyard_energy`, dev, 'Energy');
      ha.register(`sensor.sirio_${key}_backyard_flow`, dev, 'Flow');
      const offline = key === 'barrel' && this.barrelOffline;
      ha.setState(sw, offline ? 'unavailable' : 'off', { friendly_name: name, icon: 'mdi:water-pump' });
      ha.setState(`sensor.sirio_${key}_backyard_pressure`, offline ? 'unavailable' : '1.3', {
        friendly_name: `${name} pressure`,
        unit_of_measurement: 'bar',
        device_class: 'pressure',
        state_class: 'measurement',
      });
      ha.setState(`sensor.sirio_${key}_backyard_energy`, offline ? 'unavailable' : String(this.energy[key]), {
        friendly_name: `${name} energy`,
        unit_of_measurement: 'kWh',
        device_class: 'energy',
        state_class: 'total_increasing',
      });
      ha.setState(`sensor.sirio_${key}_backyard_flow`, offline ? 'unavailable' : '0', {
        friendly_name: `${name} flow`,
        unit_of_measurement: 'L/min',
        device_class: 'volume_flow_rate',
        state_class: 'measurement',
      });
      ha.onSwitch(sw, (on) => {
        this.pumps[key] = on;
        ha.setState(sw, on ? 'on' : 'off');
        this.tick();
      });
    };
    pump('well', 'Sirio Well Backyard');
    pump('barrel', 'Sirio Barrel Backyard');

    ha.device('dev_barrel', 'Backyard Barrel', 'Virtual garden', 'Ultrasonic level sensor');
    ha.register('sensor.backyard_barrel_level', 'dev_barrel', 'Level');
    ha.setState('sensor.backyard_barrel_level', String(Math.round((this.barrelL / 3000) * 100)), {
      friendly_name: 'Backyard Barrel level',
      unit_of_measurement: '%',
      state_class: 'measurement',
    });

    for (const s of PLAN_SENSORS) {
      const dev = `dev_${s.slug}`;
      ha.device(dev, s.name, 'Xiaomi', s.readings.includes('illuminance') ? 'Flower Care (HHCCJCY01)' : 'Soil moisture sensor');
      this.moisture.set(s.slug, s.moisture);
      for (const r of s.readings) {
        const id = `sensor.${s.slug}_${r}`;
        ha.register(id, dev, r[0].toUpperCase() + r.slice(1));
        const meta: Record<string, any> = { friendly_name: `${s.name} ${r}`, state_class: 'measurement' };
        if (r === 'moisture') Object.assign(meta, { device_class: 'moisture', unit_of_measurement: '%' });
        if (r === 'temperature') Object.assign(meta, { device_class: 'temperature', unit_of_measurement: '°C' });
        if (r === 'illuminance') Object.assign(meta, { device_class: 'illuminance', unit_of_measurement: 'lx' });
        if (r === 'conductivity') Object.assign(meta, { device_class: 'conductivity', unit_of_measurement: 'µS/cm' });
        if (r === 'battery') Object.assign(meta, { device_class: 'battery', unit_of_measurement: '%' });
        const v =
          r === 'moisture'
            ? s.moisture
            : r === 'temperature'
              ? outdoorAt(Date.now()) - 6
              : r === 'illuminance'
                ? luxAt(Date.now())
                : r === 'conductivity'
                  ? s.conductivity ?? 600
                  : s.battery;
        ha.setState(id, String(v), meta);
      }
    }

    ha.device('dev_rain', 'zig_rain_sensor', 'Tuya', 'Rain sensor');
    ha.register('binary_sensor.zig_rain_sensor_moisture', 'dev_rain', 'Moisture');
    ha.register('sensor.zig_rain_sensor_battery', 'dev_rain', 'Battery');
    ha.setState('binary_sensor.zig_rain_sensor_moisture', 'off', { friendly_name: 'zig_rain_sensor Moisture', device_class: 'moisture' });
    ha.setState('sensor.zig_rain_sensor_battery', '88', { friendly_name: 'zig_rain_sensor Battery', device_class: 'battery', unit_of_measurement: '%' });

    ha.register('sensor.outdoor_temperature', null, 'Outdoor temperature');
    ha.setState('sensor.outdoor_temperature', String(outdoorAt(Date.now())), {
      friendly_name: 'Outdoor temperature',
      device_class: 'temperature',
      unit_of_measurement: '°C',
      state_class: 'measurement',
    });

    ha.register('weather.home', null, 'Home');
    ha.setState('weather.home', 'sunny', {
      friendly_name: 'Home',
      temperature: outdoorAt(Date.now()),
      humidity: 44,
      wind_speed: 7,
      temperature_unit: '°C',
    });
    ha.onService('weather', 'get_forecasts', (_data, ids) => {
      const days = this.forecast();
      return Object.fromEntries(ids.map((id) => [id, { forecast: days }]));
    });
  }

  /** A week of weather: rain likely tomorrow — the reason the evening lawn run may skip. */
  private forecast() {
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    const rows: [number, number, number, string][] = [
      [27, 10, 0, 'sunny'],
      [22, 85, 12, 'rainy'],
      [24, 35, 1, 'partlycloudy'],
      [28, 20, 0, 'sunny'],
      [30, 10, 0, 'sunny'],
      [32, 5, 0, 'sunny'],
      [29, 10, 0, 'partlycloudy'],
    ];
    return rows.map(([t, p, mm, c], i) => ({
      datetime: new Date(base.getTime() + i * DAY).toISOString(),
      temperature: this.scenario === 'season_off' ? t - 18 : t,
      templow: (this.scenario === 'season_off' ? t - 18 : t) - 9,
      precipitation_probability: p,
      precipitation: mm,
      condition: c,
    }));
  }

  /** Seven days of history so sparklines, the moisture card and the charts have something to draw. */
  private backfill() {
    const now = Date.now();
    const from = now - 7 * DAY;
    for (const s of PLAN_SENSORS) {
      const id = `sensor.${s.slug}_moisture`;
      // a saw-tooth: a step up at each watering of its zone, then drying at ~0.45 %/h, landing
      // exactly on today's value; Cherry has not been watered for three days (it is dry now)
      const hours = s.slug === 'front_lawn_soil' ? [4] : s.slug === 'beds_soil' ? [6, 18] : [6];
      const events: number[] = [];
      for (let d = 8; d >= 0; d--) {
        for (const h of hours) {
          const day = new Date(now - d * DAY);
          day.setHours(h, 0, 0, 0);
          const ts = day.getTime();
          if (ts > now) continue;
          if (s.slug === 'cherry' && ts > now - 3 * DAY) continue;
          events.push(ts);
        }
      }
      const dry = 0.45;
      const lastBefore = (ts: number) => [...events].reverse().find((e) => e <= ts) ?? ts - 12 * HOUR;
      const peak = s.moisture + dry * ((now - lastBefore(now)) / HOUR);
      for (let ts = from; ts < now; ts += HOUR) {
        const m = peak - dry * ((ts - lastBefore(ts)) / HOUR) + (noise(ts / HOUR + s.moisture) - 0.5) * 0.6;
        this.ha.record(id, Math.max(5, m).toFixed(1), ts);
      }
      if (s.readings.includes('temperature')) {
        for (let ts = from; ts < now; ts += HOUR) this.ha.record(`sensor.${s.slug}_temperature`, (outdoorAt(ts) - 6).toFixed(1), ts);
      }
    }
    // rain yesterday evening: the dry-out window explains a skip in the journal
    const y = new Date(now - DAY);
    y.setHours(18, 20, 0, 0);
    this.ha.record('binary_sensor.zig_rain_sensor_moisture', 'off', from);
    this.ha.record('binary_sensor.zig_rain_sensor_moisture', 'on', y.getTime());
    this.ha.record('binary_sensor.zig_rain_sensor_moisture', 'off', y.getTime() + 3.8 * HOUR);
    for (let ts = from; ts < now; ts += 15 * 60_000) {
      const h = new Date(ts).getHours() + new Date(ts).getMinutes() / 60;
      const running = (h >= 3.5 && h < 7) || (h >= 6 && h < 6.25) || (h >= 18 && h < 18.12) || (h >= 21 && h < 23.25);
      this.ha.record('sensor.sirio_well_backyard_pressure', (running ? 2.7 + noise(ts) * 0.25 : 1.2 + noise(ts) * 0.1).toFixed(2), ts);
      this.ha.record('sensor.sirio_well_backyard_flow', running ? String(Math.round(22 + noise(ts + 1) * 4)) : '0', ts);
      this.ha.record('sensor.outdoor_temperature', String(outdoorAt(ts)), ts);
    }
  }

  private tick() {
    const now = Date.now();
    const dtMin = Math.min(10, (now - this.last) / 60_000);
    this.last = now;
    const flow = { well: 0, barrel: 0 };
    for (const z of PLAN_ZONES) if (this.open.has(z.id)) flow[z.source] += z.flowLpm;
    // water only moves when the source's pump runs
    const wellFlow = this.pumps.well ? flow.well : 0;
    const barrelFlow = this.pumps.barrel && !this.barrelOffline ? flow.barrel : 0;

    const ha = this.ha;
    const jitter = (k: number) => (noise(now / 5000 + k) - 0.5) * 0.12;
    ha.setState('sensor.sirio_well_backyard_flow', String(wellFlow ? Math.round(wellFlow + jitter(1) * 10) : 0));
    ha.setState(
      'sensor.sirio_well_backyard_pressure',
      (this.pumps.well ? (wellFlow ? 2.8 + jitter(2) : 3.1) : 1.25 + jitter(3) / 3).toFixed(1),
    );
    this.energy.well += this.pumps.well ? (0.75 * dtMin) / 60 : 0;
    ha.setState('sensor.sirio_well_backyard_energy', this.energy.well.toFixed(3));
    if (!this.barrelOffline) {
      ha.setState('sensor.sirio_barrel_backyard_flow', String(barrelFlow));
      ha.setState('sensor.sirio_barrel_backyard_pressure', (this.pumps.barrel ? (barrelFlow ? 2.2 + jitter(4) : 2.5) : 0.9).toFixed(1));
      this.energy.barrel += this.pumps.barrel ? (0.45 * dtMin) / 60 : 0;
      ha.setState('sensor.sirio_barrel_backyard_energy', this.energy.barrel.toFixed(3));
    }

    // the barrel refills from the well at 4 l/min and drains with the barrel zones
    this.barrelL = Math.max(0, Math.min(3000, this.barrelL + (4 - barrelFlow) * dtMin));
    ha.setState('sensor.backyard_barrel_level', String(Math.round((this.barrelL / 3000) * 100)));

    for (const s of PLAN_SENSORS) {
      let m = this.moisture.get(s.slug) ?? s.moisture;
      const h = new Date(now).getHours();
      m -= ((h > 9 && h < 20 ? 0.9 : 0.25) * dtMin) / 60;
      if (this.open.has(s.zone) && (this.pumps.well || this.pumps.barrel)) m += 0.25 * dtMin;
      m = Math.max(5, Math.min(80, m));
      this.moisture.set(s.slug, m);
      ha.setState(`sensor.${s.slug}_moisture`, m.toFixed(0));
      if (s.readings.includes('temperature')) ha.setState(`sensor.${s.slug}_temperature`, (outdoorAt(now) - 6).toFixed(1));
      if (s.readings.includes('illuminance')) ha.setState(`sensor.${s.slug}_illuminance`, String(luxAt(now)));
    }
    const out = outdoorAt(now);
    ha.setState('sensor.outdoor_temperature', String(out));
    const w = ha.getState('weather.home');
    if (w) ha.setState('weather.home', out > 20 ? 'sunny' : 'partlycloudy', { ...w.attributes, temperature: out });
  }
}
