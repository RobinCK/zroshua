import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { env } from '../env';

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
}

/**
 * Single WebSocket bridge to Home Assistant Core via the Supervisor proxy.
 * Keeps a state cache, re-subscribes on reconnect and exposes callService.
 */
@Injectable()
export class HaService extends EventEmitter implements OnModuleInit {
  private readonly log = new Logger('HA');
  private ws: WebSocket | null = null;
  private msgId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private states = new Map<string, HaState>();
  connected = false;

  onModuleInit() {
    if (!env.supervisorToken) {
      this.log.warn('SUPERVISOR_TOKEN missing — running detached from Home Assistant');
      return;
    }
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(env.haWsUrl);
    this.ws.on('open', () => this.log.log('WebSocket connected'));
    this.ws.on('message', (raw) => this.onMessage(JSON.parse(raw.toString())));
    this.ws.on('close', () => {
      this.connected = false;
      this.emit('connection', false);
      this.log.warn('WebSocket closed, reconnecting in 5s');
      setTimeout(() => this.connect(), 5000);
    });
    this.ws.on('error', (e) => this.log.error(`WebSocket error: ${e.message}`));
  }

  private async onMessage(msg: any) {
    if (msg.type === 'auth_required') {
      this.ws!.send(JSON.stringify({ type: 'auth', access_token: env.supervisorToken }));
    } else if (msg.type === 'auth_ok') {
      this.connected = true;
      const states: HaState[] = await this.send({ type: 'get_states' });
      this.states.clear();
      for (const s of states) this.states.set(s.entity_id, s);
      await this.send({ type: 'subscribe_events', event_type: 'state_changed' });
      this.emit('connection', true);
      this.log.log(`Ready, ${states.length} states cached`);
    } else if (msg.type === 'result') {
      const p = this.pending.get(msg.id);
      if (p) {
        this.pending.delete(msg.id);
        msg.success ? p.resolve(msg.result) : p.reject(new Error(JSON.stringify(msg.error)));
      }
    } else if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
      const { entity_id, new_state, old_state } = msg.event.data;
      if (new_state) this.states.set(entity_id, new_state);
      else this.states.delete(entity_id);
      this.emit('state_changed', entity_id, new_state, old_state);
    }
  }

  send(payload: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return reject(new Error('HA not connected'));
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, ...payload }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('HA request timeout'));
        }
      }, 15000);
    });
  }

  getState(entityId: string): HaState | undefined {
    return this.states.get(entityId);
  }

  allStates(): HaState[] {
    return [...this.states.values()];
  }

  isOn(entityId: string): boolean {
    const s = this.states.get(entityId)?.state;
    return s === 'on' || s === 'open';
  }

  numeric(entityId: string): number | null {
    const s = this.states.get(entityId)?.state;
    if (s === undefined || s === 'unavailable' || s === 'unknown') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  available(entityId: string): boolean {
    const s = this.states.get(entityId)?.state;
    return s !== undefined && s !== 'unavailable' && s !== 'unknown';
  }

  async callService(domain: string, service: string, target?: any, data?: any): Promise<any> {
    return this.send({ type: 'call_service', domain, service, target, service_data: data });
  }

  async turn(entityId: string, on: boolean): Promise<void> {
    const domain = entityId.split('.')[0];
    const d = domain === 'switch' || domain === 'light' || domain === 'input_boolean' ? domain : 'homeassistant';
    const svc = domain === 'valve' ? (on ? 'open_valve' : 'close_valve') : on ? 'turn_on' : 'turn_off';
    await this.callService(domain === 'valve' ? 'valve' : d, svc, { entity_id: entityId });
  }

  /**
   * Register (or update) a Lovelace module resource (storage mode only).
   * If a resource with the same base URL exists but a different query (version),
   * it is updated so a new card version is not masked by the browser cache.
   */
  async ensureLovelaceResource(url: string): Promise<'created' | 'updated' | 'exists' | 'unsupported'> {
    try {
      const base = url.split('?')[0];
      const list: any[] = await this.send({ type: 'lovelace/resources' });
      const existing = list.find((r) => (r.url ?? '').split('?')[0] === base);
      if (existing) {
        if (existing.url === url) return 'exists';
        await this.send({ type: 'lovelace/resources/update', resource_id: existing.id, res_type: 'module', url });
        return 'updated';
      }
      await this.send({ type: 'lovelace/resources/create', res_type: 'module', url });
      return 'created';
    } catch {
      return 'unsupported'; // YAML-mode dashboards manage resources in configuration.yaml
    }
  }

  private registryCache: { at: number; entities: Map<string, { device_id: string | null }>; devices: Map<string, string> } | null = null;

  /**
   * Entity → device and device → name, cached for ten minutes. A soil probe's temperature,
   * light, fertility and battery are found as the other entities of the moisture sensor's device.
   */
  async registry(): Promise<{ entities: Map<string, { device_id: string | null }>; devices: Map<string, string> }> {
    if (this.registryCache && Date.now() - this.registryCache.at < 10 * 60_000) return this.registryCache;
    try {
      const [ents, devs]: [any[], any[]] = await Promise.all([
        this.send({ type: 'config/entity_registry/list' }),
        this.send({ type: 'config/device_registry/list' }),
      ]);
      this.registryCache = {
        at: Date.now(),
        entities: new Map(ents.map((e) => [e.entity_id, { device_id: e.device_id ?? null }])),
        devices: new Map(devs.map((d) => [d.id, d.name_by_user || d.name || d.id])),
      };
    } catch (e: any) {
      // not cached: the next call (HA connected by then) tries again
      if (this.connected) this.log.warn(`Registry fetch failed: ${e.message}`);
      return { entities: new Map(), devices: new Map() };
    }
    return this.registryCache;
  }

  /** State history of a few entities (minimal response): [{ s, lu }] per entity, oldest first. */
  async history(entityIds: string[], hours: number): Promise<Record<string, { s: string; lu: number }[]>> {
    if (!entityIds.length) return {};
    try {
      const res = await this.send({
        type: 'history/history_during_period',
        start_time: new Date(Date.now() - hours * 3600_000).toISOString(),
        end_time: new Date().toISOString(),
        entity_ids: entityIds,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      return res ?? {};
    } catch (e: any) {
      if (this.connected) this.log.warn(`History fetch failed: ${e.message}`);
      return {};
    }
  }

  async getForecast(weatherEntity: string): Promise<any[]> {
    try {
      const res = await this.send({
        type: 'call_service',
        domain: 'weather',
        service: 'get_forecasts',
        target: { entity_id: weatherEntity },
        service_data: { type: 'daily' },
        return_response: true,
      });
      return res?.response?.[weatherEntity]?.forecast ?? [];
    } catch (e: any) {
      this.log.warn(`Forecast fetch failed: ${e.message}`);
      return [];
    }
  }
}
