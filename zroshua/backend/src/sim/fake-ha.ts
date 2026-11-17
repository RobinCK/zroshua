import { Logger } from '@nestjs/common';
import { createServer, type Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { simBroker } from './sim-mqtt';

export interface FakeState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context: { id: string; parent_id: null; user_id: null };
}

export interface RegistryEntry {
  entity_id: string;
  device_id: string | null;
  platform: string;
  name: string | null;
  original_name: string;
}

export interface DeviceEntry {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
}

type ServiceHandler = (data: Record<string, any>, entityIds: string[]) => unknown | Promise<unknown>;

interface Client {
  ws: WebSocket;
  authed: boolean;
  subs: Map<number, string | null>;
}

const iso = (ms: number) => new Date(ms).toISOString();
let ctxSeq = 0;

/** entity_id the way Home Assistant derives it from a name. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * A Home Assistant in miniature for the stand. It speaks the subset of the WebSocket API that
 * Zroshua and the Lovelace card use — auth, get_states, state_changed events, call_service
 * (with return_response), the entity and device registries, history, lovelace resources — and
 * runs the MQTT integration over the in-process broker: discovery configs become entities,
 * state and attribute topics update them, switch commands and `mqtt.publish` go back out.
 */
export class FakeHa {
  private readonly log = new Logger('FakeHA');
  readonly states = new Map<string, FakeState>();
  readonly history = new Map<string, { s: string; lu: number }[]>();
  readonly entities = new Map<string, RegistryEntry>();
  readonly devices = new Map<string, DeviceEntry>();
  private readonly services = new Map<string, ServiceHandler>();
  private readonly switches = new Map<string, (on: boolean) => void>();
  private readonly clients = new Set<Client>();
  private server: Server | null = null;
  /** MQTT entities by the topic that feeds them */
  private readonly mqttTopics = new Map<string, { entityId: string; kind: 'state' | 'attrs' | 'avail'; component: string }[]>();
  private readonly mqttCommand = new Map<string, string>();
  private readonly mqttAvailable = new Map<string, boolean>();

  constructor(private readonly port: number) {}

  async start() {
    this.server = createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    const wss = new WebSocketServer({ server: this.server, path: '/api/websocket' });
    wss.on('connection', (ws) => this.onConnection(ws));
    await new Promise<void>((resolve) => this.server!.listen(this.port, '0.0.0.0', resolve));
    simBroker.tap((topic, payload) => this.onMqtt(topic, payload));
    this.registerCoreServices();
    this.log.log(`Fake Home Assistant on ws://0.0.0.0:${this.port}/api/websocket`);
  }

  // ---- states ------------------------------------------------------------------------

  setState(entityId: string, state: string | number, attributes?: Record<string, any>, opts: { at?: number; silent?: boolean } = {}) {
    const now = opts.at ?? Date.now();
    const prev = this.states.get(entityId);
    const value = String(state);
    const attrs = attributes ?? prev?.attributes ?? {};
    const changed = !prev || prev.state !== value;
    if (prev && !changed && JSON.stringify(prev.attributes) === JSON.stringify(attrs)) return;
    const next: FakeState = {
      entity_id: entityId,
      state: value,
      attributes: attrs,
      last_changed: changed ? iso(now) : prev!.last_changed,
      last_updated: iso(now),
      context: { id: `sim${++ctxSeq}`, parent_id: null, user_id: null },
    };
    this.states.set(entityId, next);
    if (changed) this.record(entityId, value, now);
    if (!opts.silent) this.broadcast({ event_type: 'state_changed', data: { entity_id: entityId, old_state: prev ?? null, new_state: next }, time_fired: iso(now) });
  }

  getState(entityId: string): FakeState | undefined {
    return this.states.get(entityId);
  }

  num(entityId: string): number | null {
    const v = Number(this.states.get(entityId)?.state);
    return Number.isFinite(v) ? v : null;
  }

  /** Append a history point without touching the live state (backfill). */
  record(entityId: string, state: string, at: number) {
    const list = this.history.get(entityId) ?? [];
    const point = { s: state, lu: at / 1000 };
    // keep it sorted: the backfill writes the past after the live value was set
    let i = list.length;
    while (i > 0 && list[i - 1].lu > point.lu) i--;
    list.splice(i, 0, point);
    if (list.length > 6000) list.splice(0, list.length - 6000);
    this.history.set(entityId, list);
  }

  register(entityId: string, deviceId: string | null, name: string, platform = 'sim') {
    this.entities.set(entityId, { entity_id: entityId, device_id: deviceId, platform, name: null, original_name: name });
  }

  device(id: string, name: string, manufacturer = 'Virtual garden', model = 'Simulated device') {
    this.devices.set(id, { id, name, manufacturer, model });
  }

  onService(domain: string, service: string, fn: ServiceHandler) {
    this.services.set(`${domain}.${service}`, fn);
  }

  /** A device that answers turn_on / turn_off (a valve, a pump). */
  onSwitch(entityId: string, fn: (on: boolean) => void) {
    this.switches.set(entityId, fn);
  }

  // ---- websocket ---------------------------------------------------------------------

  private onConnection(ws: WebSocket) {
    const client: Client = { ws, authed: false, subs: new Map() };
    this.clients.add(client);
    ws.send(JSON.stringify({ type: 'auth_required', ha_version: '2026.11.0' }));
    ws.on('message', (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      void this.onMessage(client, msg);
    });
    ws.on('close', () => this.clients.delete(client));
    ws.on('error', () => this.clients.delete(client));
  }

  private reply(client: Client, id: number, result: unknown, error?: { code: string; message: string }) {
    if (client.ws.readyState !== WebSocket.OPEN) return;
    client.ws.send(JSON.stringify(error ? { id, type: 'result', success: false, error } : { id, type: 'result', success: true, result }));
  }

  private async onMessage(client: Client, msg: any) {
    if (msg.type === 'auth') {
      client.authed = true;
      client.ws.send(JSON.stringify({ type: 'auth_ok', ha_version: '2026.11.0' }));
      return;
    }
    if (!client.authed) return;
    const id = msg.id;
    try {
      switch (msg.type) {
        case 'ping':
          client.ws.send(JSON.stringify({ id, type: 'pong' }));
          return;
        case 'get_states':
          return this.reply(client, id, [...this.states.values()]);
        case 'subscribe_events':
          client.subs.set(id, msg.event_type ?? null);
          return this.reply(client, id, null);
        case 'unsubscribe_events':
          client.subs.delete(msg.subscription);
          return this.reply(client, id, null);
        case 'call_service':
          return this.reply(client, id, await this.callService(msg));
        case 'config/entity_registry/list':
        case 'config/entity_registry/list_for_display':
          return this.reply(client, id, [...this.entities.values()]);
        case 'config/device_registry/list':
          return this.reply(client, id, [...this.devices.values()]);
        case 'history/history_during_period':
          return this.reply(client, id, this.historyDuring(msg));
        case 'lovelace/resources':
          return this.reply(client, id, []);
        case 'get_config':
          return this.reply(client, id, {
            location_name: 'Virtual garden',
            time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            unit_system: { temperature: '°C', length: 'km', mass: 'kg', volume: 'L' },
            version: '2026.11.0',
            components: ['mqtt', 'weather', 'history'],
          });
        case 'auth/current_user':
          return this.reply(client, id, { id: 'sim-user', name: 'Stand', is_owner: true, is_admin: true });
        default:
          return this.reply(client, id, null, { code: 'unknown_command', message: `Unknown command ${msg.type}` });
      }
    } catch (e: any) {
      this.reply(client, id, null, { code: 'service_error', message: e?.message ?? String(e) });
    }
  }

  private broadcast(event: { event_type: string; data: unknown; time_fired: string }) {
    for (const c of this.clients) {
      for (const [subId, type] of c.subs) {
        if (type !== null && type !== event.event_type) continue;
        if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify({ id: subId, type: 'event', event: { ...event, origin: 'LOCAL' } }));
      }
    }
  }

  private historyDuring(msg: any) {
    const from = msg.start_time ? Date.parse(msg.start_time) / 1000 : Date.now() / 1000 - 86400;
    const to = msg.end_time ? Date.parse(msg.end_time) / 1000 : Date.now() / 1000;
    const out: Record<string, { s: string; lu: number }[]> = {};
    for (const id of msg.entity_ids ?? []) {
      const list = this.history.get(id) ?? [];
      const inRange = list.filter((p) => p.lu >= from && p.lu <= to);
      // like HA: the state at the start of the window comes first
      const before = [...list].reverse().find((p) => p.lu < from);
      out[id] = before ? [{ s: before.s, lu: from }, ...inRange] : inRange;
    }
    return out;
  }

  // ---- services ----------------------------------------------------------------------

  private async callService(msg: any) {
    const { domain, service } = msg;
    const data = msg.service_data ?? {};
    const target = msg.target ?? {};
    const ids: string[] = ([] as string[]).concat(target.entity_id ?? data.entity_id ?? []);
    const key = `${domain}.${service}`;
    const context = { id: `sim${++ctxSeq}`, parent_id: null, user_id: null };
    const handler = this.services.get(key);
    if (handler) {
      const response = await handler(data, ids);
      return msg.return_response ? { context, response } : { context };
    }
    const on = service === 'turn_on' || service === 'open_valve';
    if (['switch', 'homeassistant', 'valve', 'input_boolean', 'light'].includes(domain) && (on || service === 'turn_off' || service === 'close_valve')) {
      for (const id of ids) {
        const device = this.switches.get(id);
        if (device) {
          if (this.states.get(id)?.state === 'unavailable') throw new Error(`${id} is unavailable`);
          device(on);
          continue;
        }
        // the MQTT integration: a switch made from discovery publishes to its command topic
        const topic = this.mqttCommand.get(id);
        if (topic) simBroker.inject(topic, on ? 'ON' : 'OFF');
      }
      return { context };
    }
    if (domain === 'notify' || domain === 'persistent_notification') return { context };
    throw new Error(`Service ${key} not found`);
  }

  private registerCoreServices() {
    this.onService('mqtt', 'publish', (data) => {
      simBroker.inject(String(data.topic), typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload ?? ''), !!data.retain);
    });
  }

  // ---- MQTT integration ----------------------------------------------------------------

  private onMqtt(topic: string, payload: string) {
    const disc = /^homeassistant\/(sensor|binary_sensor|switch)\/([^/]+)\/config$/.exec(topic);
    if (disc) {
      this.onDiscovery(disc[1], disc[2], payload);
      return;
    }
    for (const sub of this.mqttTopics.get(topic) ?? []) this.applyMqtt(sub, payload);
    // availability topics are shared, so they are routed separately
    if (this.mqttAvailable.has(topic)) {
      this.mqttAvailable.set(topic, payload === 'online');
    }
  }

  private onDiscovery(component: string, objectId: string, payload: string) {
    if (!payload) return;
    let cfg: any;
    try {
      cfg = JSON.parse(payload);
    } catch {
      return;
    }
    const deviceName = cfg.device?.name ?? '';
    const entitySlug = cfg.object_id ?? slug(`${deviceName} ${cfg.name ?? objectId}`);
    const entityId = `${component}.${entitySlug}`;
    const deviceId = `mqtt_${slug(deviceName || 'zroshua')}`;
    if (!this.devices.has(deviceId)) this.device(deviceId, deviceName || 'Zroshua', 'Zroshua', 'Irrigation add-on');
    this.register(entityId, deviceId, cfg.name ?? objectId, 'mqtt');
    const attrs: Record<string, any> = { friendly_name: `${deviceName} ${cfg.name ?? ''}`.trim() };
    if (cfg.unit_of_measurement) attrs.unit_of_measurement = cfg.unit_of_measurement;
    if (cfg.device_class) attrs.device_class = cfg.device_class;
    if (cfg.state_class) attrs.state_class = cfg.state_class;
    if (cfg.icon) attrs.icon = cfg.icon;
    if (!this.states.has(entityId)) this.setState(entityId, 'unknown', attrs);
    const add = (t: string | undefined, kind: 'state' | 'attrs' | 'avail') => {
      if (!t) return;
      const list = (this.mqttTopics.get(t) ?? []).filter((x) => x.entityId !== entityId || x.kind !== kind);
      list.push({ entityId, kind, component });
      this.mqttTopics.set(t, list);
    };
    add(cfg.state_topic, 'state');
    add(cfg.json_attributes_topic, 'attrs');
    add(cfg.availability_topic, 'avail');
    if (cfg.command_topic) this.mqttCommand.set(entityId, cfg.command_topic);
    for (const [t, p] of simBroker.retainedFor([cfg.state_topic, cfg.json_attributes_topic, cfg.availability_topic].filter(Boolean))) {
      for (const sub of this.mqttTopics.get(t) ?? []) if (sub.entityId === entityId) this.applyMqtt(sub, p);
    }
  }

  private applyMqtt(sub: { entityId: string; kind: 'state' | 'attrs' | 'avail'; component: string }, payload: string) {
    const cur = this.states.get(sub.entityId);
    const attrs = { ...(cur?.attributes ?? {}) };
    if (sub.kind === 'attrs') {
      try {
        const extra = JSON.parse(payload);
        // json_attributes replace the previous set (HA keeps only the friendly bits)
        const keep = ['friendly_name', 'unit_of_measurement', 'device_class', 'state_class', 'icon'];
        const next: Record<string, any> = {};
        for (const k of keep) if (k in attrs) next[k] = attrs[k];
        this.setState(sub.entityId, cur?.state ?? 'unknown', { ...next, ...extra });
      } catch {
        /* not json */
      }
      return;
    }
    if (sub.kind === 'avail') {
      if (payload === 'offline') this.setState(sub.entityId, 'unavailable', attrs);
      return;
    }
    let state = payload;
    if (sub.component === 'switch' || sub.component === 'binary_sensor') state = payload === 'ON' ? 'on' : payload === 'OFF' ? 'off' : payload;
    if (sub.component === 'sensor' && (payload === 'None' || payload === '')) state = 'unknown';
    this.setState(sub.entityId, state, attrs);
  }
}
