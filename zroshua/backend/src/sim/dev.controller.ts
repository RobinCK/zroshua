import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '../env';

/** Where the card lives: next to the backend in the repo, /app/card in the image. */
function cardFile(): string | null {
  const candidates = [process.env.ZROSHUA_CARD_FILE, path.resolve('../card/zroshua-card.js'), '/app/card/zroshua-card.js'];
  return candidates.find((p) => p && fs.existsSync(p)) ?? null;
}

/** Every view of the card, in the order a garden dashboard would stack them. */
const DEFAULT_CARDS = [
  { view: 'badges' },
  { view: 'status' },
  { view: 'quick' },
  { view: 'groups' },
  { view: 'zones' },
  { view: 'upcoming' },
  { view: 'timeline' },
  { view: 'sources' },
  { view: 'sensors' },
  { view: 'chart', metric: 'water' },
  { view: 'chart', metric: 'energy' },
  { view: 'chart', metric: 'time' },
  { view: 'chart', entity: 'sensor.sirio_well_backyard_pressure', title: 'Pressure · well pump', hours: 6 },
  { view: 'insights' },
  { view: 'attention' },
];

/**
 * The stand's Lovelace page: the real card bundle on a page that plays Home Assistant's
 * frontend — a `hass` object fed by the fake HA over its WebSocket, theme and layout from the
 * query (`?layout=phone|desktop&theme=dark|light&views=status,zones`).
 */
@Controller('api/dev')
export class DevController {
  @Get('card.js')
  @Header('content-type', 'text/javascript; charset=utf-8')
  @Header('cache-control', 'no-store')
  card() {
    const file = cardFile();
    return file ? fs.readFileSync(file, 'utf8') : 'console.error("zroshua-card.js not found")';
  }

  @Get('cards')
  page(@Query('layout') layout = 'desktop', @Query('theme') theme = 'dark', @Query('views') views = '', @Res() res: any) {
    const wanted = views
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const cards = wanted.length ? DEFAULT_CARDS.filter((c) => wanted.includes(c.view)) : DEFAULT_CARDS;
    const phone = layout === 'phone';
    const dark = theme !== 'light';
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zroshua cards — stand</title>
<style>
  :root {
    --primary-background-color: ${dark ? '#111111' : '#fafafa'};
    --card-background-color: ${dark ? '#1c1c1c' : '#ffffff'};
    --ha-card-background: var(--card-background-color);
    --primary-text-color: ${dark ? '#e1e1e1' : '#212121'};
    --secondary-text-color: ${dark ? '#9b9b9b' : '#727272'};
    --divider-color: ${dark ? 'rgba(225,225,225,.12)' : 'rgba(0,0,0,.12)'};
    --ha-card-border-radius: 12px;
    color-scheme: ${dark ? 'dark' : 'light'};
  }
  body { margin: 0; background: var(--primary-background-color); color: var(--primary-text-color);
    font-family: Roboto, system-ui, sans-serif; }
  header { display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 16px;
    background: ${dark ? '#1c1c1c' : '#03a9f4'}; color: ${dark ? '#e1e1e1' : '#fff'}; font-size: 20px; }
  main { box-sizing: border-box; padding: ${phone ? '8px' : '16px'}; max-width: ${phone ? '100%' : '1500px'}; margin: 0 auto;
    ${phone ? 'display: flex; flex-direction: column; gap: 8px;' : 'columns: 3 440px; column-gap: 16px;'} }
  main > * { break-inside: avoid; display: block; margin-bottom: ${phone ? '0' : '16px'}; }
  ha-card { display: block; }
</style>
</head>
<body>
<header>Garden</header>
<main id="cards"></main>
<script>
  // ha-card is a Home Assistant element; a plain block stands in for it on the stand
  customElements.define('ha-card', class extends HTMLElement {
    connectedCallback() {
      this.style.display = 'block';
      this.style.background = 'var(--ha-card-background, var(--card-background-color))';
      this.style.borderRadius = 'var(--ha-card-border-radius, 12px)';
    }
  });
</script>
<script src="./card.js"></script>
<script>
(() => {
  const CARDS = ${JSON.stringify(cards)};
  const dark = ${dark};
  const ws = new WebSocket('ws://' + location.hostname + ':${env.sim.haPort}/api/websocket');
  let seq = 0;
  const pending = new Map();
  let states = {};
  let hass = null;
  const els = [];
  const send = (msg) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, ...msg }));
  });
  const build = () => {
    hass = {
      states,
      themes: { darkMode: dark, themes: {} },
      selectedTheme: null,
      language: 'en',
      locale: { language: 'en', number_format: 'language', time_format: '24' },
      user: { id: 'stand', name: 'Stand', is_admin: true },
      config: { time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone, unit_system: { temperature: '°C' } },
      callService: (domain, service, data, target) => send({ type: 'call_service', domain, service, service_data: data, target }),
      callWS: (msg) => send(msg),
      connection: { sendMessagePromise: (msg) => send(msg) },
    };
    for (const el of els) el.hass = hass;
  };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'auth_required') ws.send(JSON.stringify({ type: 'auth', access_token: 'stand' }));
    else if (msg.type === 'auth_ok') {
      send({ type: 'get_states' }).then((list) => {
        states = Object.fromEntries(list.map((s) => [s.entity_id, s]));
        const root = document.getElementById('cards');
        for (const cfg of CARDS) {
          const el = document.createElement('zroshua-card');
          el.setConfig({ type: 'custom:zroshua-card', ...cfg });
          root.appendChild(el);
          els.push(el);
        }
        build();
        document.body.dataset.ready = 'true';
      });
      send({ type: 'subscribe_events', event_type: 'state_changed' });
    } else if (msg.type === 'result') {
      const p = pending.get(msg.id);
      if (p) { pending.delete(msg.id); msg.success ? p.resolve(msg.result) : p.reject(new Error(msg.error && msg.error.message)); }
    } else if (msg.type === 'event' && msg.event && msg.event.event_type === 'state_changed') {
      const { entity_id, new_state } = msg.event.data;
      states = { ...states };
      if (new_state) states[entity_id] = new_state; else delete states[entity_id];
      build();
    }
  };
})();
</script>
</body>
</html>`);
  }
}
