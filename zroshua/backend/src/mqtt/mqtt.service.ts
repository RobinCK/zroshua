import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import mqtt, { MqttClient } from 'mqtt';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../db/database.module';
import { Run, Zone } from '../db/entities';
import { ConfigService } from '../config/config.service';
import { EngineService } from '../engine/engine.service';
import { env } from '../env';

const AVAIL_TOPIC = 'zroshua/status';
const DISCOVERY_PREFIX = 'homeassistant';

/**
 * Optional MQTT discovery bridge. Activates only when broker credentials are
 * present (auto-provided by the Supervisor when the Mosquitto add-on is
 * installed — `services: mqtt:want`). Publishes Zroshua zones and status back
 * into Home Assistant as native entities.
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('MQTT');
  private client: MqttClient | null = null;
  private publishedIds = new Set<string>();
  private stateTimer: NodeJS.Timeout | null = null;
  private discoveryTimer: NodeJS.Timeout | null = null;
  private runs: Repository<Run>;
  status: { configured: boolean; connected: boolean; broker: string | null; source: string; detail: string } = {
    configured: false,
    connected: false,
    broker: null,
    source: 'none',
    detail: 'not started',
  };

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource,
    private readonly config: ConfigService,
    private readonly engine: EngineService,
  ) {
    this.runs = ds.getRepository(Run);
  }

  async onModuleInit() {
    const creds = await this.resolveCredentials();
    if (!creds) {
      this.status = {
        configured: false,
        connected: false,
        broker: null,
        source: 'none',
        detail:
          'No MQTT broker found. Install the Mosquitto add-on + MQTT integration, or set mqtt.host in the add-on options.',
      };
      this.log.log(`MQTT dormant — ${this.status.detail}`);
      return;
    }
    const url = `mqtt://${creds.host}:${creds.port}`;
    this.status = { configured: true, connected: false, broker: `${creds.host}:${creds.port}`, source: creds.source, detail: 'connecting…' };
    this.client = mqtt.connect(url, {
      username: creds.user || undefined,
      password: creds.password || undefined,
      will: { topic: AVAIL_TOPIC, payload: Buffer.from('offline'), retain: true, qos: 1 },
      reconnectPeriod: 5000,
    });
    this.client.on('connect', () => {
      this.status.connected = true;
      this.status.detail = 'connected';
      this.log.log(`Connected to broker ${url}`);
      this.client!.publish(AVAIL_TOPIC, 'online', { retain: true });
      this.client!.subscribe(['zroshua/+/+/set', 'zroshua/+/set', 'zroshua/command', `${DISCOVERY_PREFIX}/status`]);
      void this.publishDiscovery();
      void this.publishStates();
    });
    this.client.on('message', (topic, payload) => void this.onMessage(topic, payload.toString()));
    this.client.on('close', () => {
      this.status.connected = false;
      if (this.status.detail === 'connected') this.status.detail = 'disconnected, retrying…';
    });
    this.client.on('error', (e) => {
      this.status.detail = `error: ${e.message}`;
      this.log.warn(`MQTT error: ${e.message}`);
    });
    this.stateTimer = setInterval(() => void this.publishStates(), 15_000);
    this.discoveryTimer = setInterval(() => void this.publishDiscovery(), 5 * 60_000);
  }

  onModuleDestroy() {
    if (this.stateTimer) clearInterval(this.stateTimer);
    if (this.discoveryTimer) clearInterval(this.discoveryTimer);
    this.client?.publish(AVAIL_TOPIC, 'offline', { retain: true });
    this.client?.end();
  }

  /** Dev env vars take precedence; otherwise ask the Supervisor services API (Mosquitto add-on). */
  private async resolveCredentials(): Promise<{ host: string; port: number; user?: string; password?: string; source: string } | null> {
    if (env.mqtt.host) {
      return { host: env.mqtt.host, port: env.mqtt.port ?? 1883, user: env.mqtt.user, password: env.mqtt.password, source: 'options' };
    }
    if (!env.supervisorToken) return null;
    try {
      const res = await fetch(`${env.supervisorApi}/services/mqtt`, {
        headers: { authorization: `Bearer ${env.supervisorToken}` },
      });
      if (!res.ok) return null;
      const body: any = await res.json();
      const d = body?.data;
      if (!d?.host) return null;
      return { host: d.host, port: d.port ?? 1883, user: d.username, password: d.password, source: 'supervisor' };
    } catch {
      return null;
    }
  }

  private device() {
    return {
      identifiers: ['zroshua'],
      name: 'Zroshua',
      manufacturer: 'Zroshua',
      model: 'Irrigation add-on',
      sw_version: '0.1.0',
    };
  }

  private pub(topic: string, payload: string | object, retain = false) {
    if (!this.client?.connected) return;
    this.client.publish(topic, typeof payload === 'string' ? payload : JSON.stringify(payload), { retain });
  }

  private async publishDiscovery() {
    if (!this.client?.connected) return;
    const zones = await this.config.zones.find();
    const common = { availability_topic: AVAIL_TOPIC, device: this.device() };
    const current = new Set<string>();

    for (const z of zones) {
      const sid = `zroshua_zone_${z.id}`;
      current.add(`switch:${sid}`);
      this.pub(
        `${DISCOVERY_PREFIX}/switch/${sid}/config`,
        {
          ...common,
          name: `${z.name} watering`,
          unique_id: sid,
          icon: 'mdi:sprinkler-variant',
          command_topic: `zroshua/zone/${z.id}/set`,
          state_topic: `zroshua/zone/${z.id}/state`,
        },
        true,
      );
      current.add(`sensor:${sid}_next`);
      this.pub(
        `${DISCOVERY_PREFIX}/sensor/${sid}_next/config`,
        {
          ...common,
          name: `${z.name} next watering`,
          unique_id: `${sid}_next`,
          device_class: 'timestamp',
          state_topic: `zroshua/zone/${z.id}/next`,
        },
        true,
      );
    }

    // one daily water counter per water source — chart well vs. barrel separately
    const sources = await this.config.sources.find();
    for (const s of sources) {
      const sid = `zroshua_source_${s.id}_water_today`;
      current.add(`sensor:${sid}`);
      this.pub(
        `${DISCOVERY_PREFIX}/sensor/${sid}/config`,
        {
          ...common,
          name: `${s.name} water today`,
          unique_id: sid,
          unit_of_measurement: 'L',
          device_class: 'water',
          state_class: 'total_increasing',
          icon: 'mdi:water-pump',
          state_topic: `zroshua/source/${s.id}/liters_today`,
        },
        true,
      );
    }

    // device_class + state_class make HA record long-term statistics (hourly/
    // daily/weekly consumption charts, Energy dashboard). total_increasing
    // treats the midnight reset to 0 as a meter reset, not negative usage.
    const globals: [string, string, object][] = [
      ['binary_sensor', 'zroshua_watering_active', { name: 'Watering active', device_class: 'running', state_topic: 'zroshua/active' }],
      [
        'sensor',
        'zroshua_liters_today',
        {
          name: 'Water today',
          object_id: 'zroshua_water_today', // pin entity_id to sensor.zroshua_water_today
          unit_of_measurement: 'L',
          device_class: 'water',
          state_class: 'total_increasing',
          icon: 'mdi:water',
          state_topic: 'zroshua/stats/liters_today',
        },
      ],
      [
        'sensor',
        'zroshua_energy_today',
        {
          name: 'Pump energy today',
          object_id: 'zroshua_pump_energy_today', // pin entity_id to sensor.zroshua_pump_energy_today
          unit_of_measurement: 'kWh',
          device_class: 'energy',
          state_class: 'total_increasing',
          state_topic: 'zroshua/stats/energy_today',
        },
      ],
      ['switch', 'zroshua_snooze', { name: 'Snooze all watering', icon: 'mdi:sleep', command_topic: 'zroshua/snooze/set', state_topic: 'zroshua/snooze/state' }],
      // rich hub state consumed by the Lovelace card (json_attributes carry the full snapshot)
      [
        'sensor',
        'zroshua_state',
        {
          name: 'Zroshua state',
          object_id: 'zroshua_state', // pin entity_id to sensor.zroshua_state
          icon: 'mdi:sprinkler-variant',
          state_topic: 'zroshua/hub/state',
          json_attributes_topic: 'zroshua/hub/attrs',
        },
      ],
    ];
    for (const [component, id, cfg] of globals) {
      current.add(`${component}:${id}`);
      this.pub(`${DISCOVERY_PREFIX}/${component}/${id}/config`, { ...common, unique_id: id, ...cfg }, true);
    }

    // remove discovery configs for deleted zones/sources
    for (const key of this.publishedIds) {
      if (!current.has(key)) {
        const [component, id] = key.split(':');
        this.pub(`${DISCOVERY_PREFIX}/${component}/${id}/config`, '', true);
      }
    }
    this.publishedIds = current;
  }

  private async publishStates() {
    if (!this.client?.connected) return;
    const snapshot = this.engine.snapshot();
    const zones = await this.config.zones.find();
    const activeIds = new Set(snapshot.active.map((a) => a.zoneId));

    for (const z of zones) {
      this.pub(`zroshua/zone/${z.id}/state`, activeIds.has(z.id) ? 'ON' : 'OFF');
      const next = await this.engine.nextRunTs(z.id);
      this.pub(`zroshua/zone/${z.id}/next`, next ? new Date(next).toISOString() : 'None');
    }
    this.pub('zroshua/active', snapshot.active.length ? 'ON' : 'OFF');
    this.pub('zroshua/snooze/state', snapshot.snoozeUntil && snapshot.snoozeUntil > Date.now() ? 'ON' : 'OFF');

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const rows = await this.runs
      .createQueryBuilder('r')
      .where('r.startTs >= :from AND r.endTs IS NOT NULL', { from: dayStart.getTime() })
      .getMany();
    const liters = rows.reduce((acc, r) => acc + ((r.litersMin ?? 0) + (r.litersMax ?? 0)) / 2, 0);
    const kwh = rows.reduce((acc, r) => acc + (r.energyKwh ?? 0), 0);
    this.pub('zroshua/stats/liters_today', liters.toFixed(1));
    this.pub('zroshua/stats/energy_today', kwh.toFixed(3));

    // per-source breakdown; runs of zones without a source count only toward the total
    const sources = await this.config.sources.find();
    const litersBySource = new Map<string, number>();
    for (const r of rows) {
      if (!r.sourceId) continue;
      litersBySource.set(r.sourceId, (litersBySource.get(r.sourceId) ?? 0) + ((r.litersMin ?? 0) + (r.litersMax ?? 0)) / 2);
    }
    for (const s of sources) {
      this.pub(`zroshua/source/${s.id}/liters_today`, (litersBySource.get(s.id) ?? 0).toFixed(1));
    }

    await this.publishHub(snapshot, zones, liters, kwh);
  }

  /** Full snapshot for the Lovelace card: compact state + rich json attributes. */
  private async publishHub(snapshot: any, zones: Zone[], litersToday: number, kwhToday: number) {
    const groups = await this.config.groups.find({ order: { orderIndex: 'ASC' } });
    const settings = await this.config.getSettings();
    const activeZoneIds = new Set(snapshot.active.map((a: any) => a.zoneId));
    const queueZoneIds = new Set(snapshot.queue.map((q: any) => q.zoneId));
    const runningGroupIds = new Set([...snapshot.active, ...snapshot.queue].map((a: any) => a.groupId).filter(Boolean));

    const upcoming = (await this.engine.upcoming(7)).slice(0, 12).map((u: any) => ({
      groupId: u.groupId,
      groupName: u.groupName,
      ts: u.ts,
      minutes: Math.round(u.zones.reduce((a: number, z: any) => a + z.minutes, 0)),
      zones: u.zones.map((z: any) => z.name),
    }));

    // 2-day timeline for the card (compact)
    const plan = await this.engine.plan(2).catch(() => ({ segments: [] as any[] }));
    const timeline = (plan.segments ?? []).slice(0, 200).map((s: any) => ({
      g: s.groupName,
      z: s.zoneName,
      s: s.start,
      e: s.worstEnd,
      c: s.conflict ? 1 : 0,
      k: s.kind === 'zone' ? 'z' : 'g',
    }));

    const attrs = {
      updated: new Date().toISOString(),
      paused: snapshot.paused,
      rainDelayUntil: snapshot.rainDelayUntil,
      snoozeUntil: snapshot.snoozeUntil,
      haConnected: snapshot.haConnected,
      litersToday: Math.round(litersToday),
      kwhToday: +kwhToday.toFixed(2),
      currency: settings.energyCurrency,
      active: snapshot.active,
      queue: snapshot.queue,
      upcoming,
      timeline,
      zones: zones.map((z) => {
        const run = snapshot.active.find((a: any) => a.zoneId === z.id);
        return {
          id: z.id,
          name: z.name,
          type: z.type,
          enabled: z.enabled,
          running: activeZoneIds.has(z.id),
          queued: queueZoneIds.has(z.id),
          fault: snapshot.faults.includes(z.id),
          baseMin: z.baseDurationMin,
          maxMin: z.maxRuntimeMin,
          groupIds: groups.filter((g) => g.zoneIds.includes(z.id)).map((g) => g.id),
          endsAt: run ? run.endsAt : null,
        };
      }),
      groups: groups.map((g) => {
        const next = upcoming.find((u: any) => u.groupId === g.id && u.ts > Date.now());
        return {
          id: g.id,
          name: g.name,
          mode: g.mode,
          enabled: g.enabled,
          running: runningGroupIds.has(g.id),
          activeZones: snapshot.active.filter((a: any) => a.groupId === g.id).length,
          queuedZones: snapshot.queue.filter((q: any) => q.groupId === g.id).length,
          zoneCount: g.zoneIds.length,
          schedules: (g.schedules ?? []).filter((s) => s.enabled).length,
          nextTs: next?.ts ?? null,
          nextMinutes: next?.minutes ?? null,
        };
      }),
    };
    this.pub('zroshua/hub/state', `${snapshot.active.length} watering`, true);
    this.pub('zroshua/hub/attrs', attrs, true);
  }

  private async onMessage(topic: string, payload: string) {
    try {
      if (topic === `${DISCOVERY_PREFIX}/status` && payload === 'online') {
        // HA restarted — re-announce everything
        await this.publishDiscovery();
        await this.publishStates();
        return;
      }
      const zoneCmd = /^zroshua\/zone\/(.+)\/set$/.exec(topic);
      if (zoneCmd) {
        const zoneId = zoneCmd[1];
        if (payload === 'ON') await this.engine.startZoneManual(zoneId);
        else await this.engine.stopZone(zoneId, 'manual_stop');
        await this.publishStates();
        return;
      }
      if (topic === 'zroshua/snooze/set') {
        await this.engine.setSnooze(payload === 'ON' ? 24 : 0);
        await this.publishStates();
        return;
      }
      if (topic === 'zroshua/command') {
        await this.handleCommand(JSON.parse(payload));
        await this.publishStates();
      }
    } catch (e: any) {
      this.log.warn(`Command ${topic} failed: ${e.message}`);
    }
  }

  /** JSON command channel for the Lovelace card. */
  private async handleCommand(cmd: any) {
    switch (cmd?.action) {
      case 'run_zone':
        return void (await this.engine.startZoneManual(cmd.zoneId, cmd.minutes));
      case 'stop_zone':
        return void (await this.engine.stopZone(cmd.zoneId, 'manual_stop'));
      case 'run_group': {
        const g = await this.config.groups.findOneBy({ id: cmd.groupId });
        if (g) await this.engine.startGroupRun(g, 'manual', cmd.minutes);
        return;
      }
      case 'stop_group':
        return void (await this.engine.stopGroup(cmd.groupId));
      case 'stop_all':
        return void (await this.engine.stopAll('manual_stop'));
      case 'rain_delay':
        return void (await this.engine.setRainDelay(Number(cmd.hours) || 0));
      case 'snooze':
        return void (await this.engine.setSnooze(Number(cmd.hours) || 0));
      default:
        this.log.warn(`unknown command action: ${cmd?.action}`);
    }
  }
}
