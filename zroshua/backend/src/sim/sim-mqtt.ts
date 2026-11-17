import { EventEmitter } from 'events';

/** `+` matches one level, a trailing `#` the rest (including nothing), as in MQTT 3.1.1. */
export function topicMatches(filter: string, topic: string): boolean {
  if (filter === topic) return true;
  const f = filter.split('/');
  const t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return i === f.length - 1;
    if (i >= t.length) return false;
    if (f[i] !== '+' && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
}

type Tap = (topic: string, payload: string) => void;

/**
 * The stand's in-process MQTT broker: retained topics, wildcard subscriptions and retained
 * delivery on subscribe. Zroshua's MqttService talks to it through `SimMqttClient` (the same
 * surface as an mqtt.js client); the fake Home Assistant watches everything Zroshua publishes
 * with `tap` and publishes as Home Assistant with `inject` (the card's `mqtt.publish` calls).
 */
class SimBroker {
  private readonly retained = new Map<string, string>();
  private readonly clients = new Set<SimMqttClient>();
  private readonly taps: Tap[] = [];

  attach(c: SimMqttClient) {
    this.clients.add(c);
  }
  detach(c: SimMqttClient) {
    this.clients.delete(c);
  }

  tap(cb: Tap) {
    this.taps.push(cb);
    for (const [topic, payload] of this.retained) cb(topic, payload);
  }

  publish(topic: string, payload: string, retain: boolean, from: SimMqttClient | null) {
    if (retain) {
      if (payload === '') this.retained.delete(topic);
      else this.retained.set(topic, payload);
    }
    // asynchronous like a network, so nobody re-enters a publisher
    setImmediate(() => {
      if (from) for (const tap of this.taps) tap(topic, payload);
      for (const c of this.clients) if (c !== from) c.deliver(topic, payload);
    });
  }

  /** Home Assistant publishing (mqtt.publish service, birth message). */
  inject(topic: string, payload: string, retain = false) {
    this.publish(topic, payload, retain, null);
  }

  retainedFor(filters: string[]): [string, string][] {
    return [...this.retained].filter(([topic]) => filters.some((f) => topicMatches(f, topic)));
  }
}

export const simBroker = new SimBroker();

/** The subset of an mqtt.js client that MqttService uses. */
export class SimMqttClient extends EventEmitter {
  connected = false;
  private readonly subs = new Set<string>();

  constructor() {
    super();
    simBroker.attach(this);
    setImmediate(() => {
      this.connected = true;
      this.emit('connect');
    });
  }

  publish(topic: string, payload: string | Buffer, opts?: { retain?: boolean }) {
    if (!this.connected) return this;
    simBroker.publish(topic, String(payload), !!opts?.retain, this);
    return this;
  }

  subscribe(topics: string | string[]) {
    const fresh = (Array.isArray(topics) ? topics : [topics]).filter((t) => !this.subs.has(t));
    for (const t of fresh) this.subs.add(t);
    for (const [topic, payload] of simBroker.retainedFor(fresh)) setImmediate(() => this.deliver(topic, payload));
    return this;
  }

  deliver(topic: string, payload: string) {
    if (!this.connected) return;
    if ([...this.subs].some((f) => topicMatches(f, topic))) this.emit('message', topic, Buffer.from(payload));
  }

  end() {
    this.connected = false;
    simBroker.detach(this);
    this.emit('close');
    return this;
  }
}
