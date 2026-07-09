import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { env } from '../env';

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
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

  /** Register a Lovelace module resource (storage mode only); idempotent. */
  async ensureLovelaceResource(url: string): Promise<'created' | 'exists' | 'unsupported'> {
    try {
      const list: any[] = await this.send({ type: 'lovelace/resources' });
      if (list.some((r) => (r.url ?? '').split('?')[0] === url.split('?')[0])) return 'exists';
      await this.send({ type: 'lovelace/resources/create', res_type: 'module', url });
      return 'created';
    } catch {
      return 'unsupported'; // YAML-mode dashboards manage resources in configuration.yaml
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
