/**
 * Zroshua Lovelace card.
 *
 * Reads the full irrigation snapshot from the hub sensor attributes (published
 * by the add-on over MQTT; entity auto-discovered by attribute shape) and sends
 * commands back through the `mqtt.publish` service on topic `zroshua/command`.
 * No build step, no dependencies &mdash; a plain custom element.
 *
 * Usage:
 *   type: custom:zroshua-card
 *   view: dashboard        # dashboard | groups | zones | upcoming | timeline
 *   title: Irrigation      # optional
 *   entity: sensor.zroshua_state   # optional override
 */
const VIEWS = ['dashboard', 'groups', 'zones', 'upcoming', 'timeline'];

const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>',
  drop: '<svg viewBox="0 0 24 24"><path d="M12 3c3.2 4.2 6 7.5 6 10.7A6 6 0 0 1 6 13.7C6 10.5 8.8 7.2 12 3z"/></svg>',
  sprinkler:
    '<svg viewBox="0 0 24 24"><path d="M11 13h2v8h-2zM7 21h10v1.6H7z"/><circle cx="12" cy="10" r="2.2"/><path d="M5.5 8.5l2.1 1.1M18.5 8.5l-2.1 1.1M12 4.4v2.4M7.6 5.4l1.5 1.9M16.4 5.4l-1.5 1.9" stroke-width="1.7" stroke-linecap="round" fill="none" stroke="currentColor"/></svg>',
  sprout:
    '<svg viewBox="0 0 24 24"><path d="M12 21v-8M12 13c0-4-3-6-7-6 0 4 3 6 7 6zm0 0c0-4 3-6 7-6 0 4-3 6-7 6z"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2" stroke-linecap="round"/></svg>',
  rain: '<svg viewBox="0 0 24 24"><path d="M7 15a5 5 0 0 1-.9-9.9 6 6 0 0 1 11.5 1.7A4 4 0 0 1 17 15H7z"/><path d="M8.5 17.5l-1.2 2.6M12.5 17.5l-1.2 2.6M16.5 17.5l-1.2 2.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>',
  zzz: '<svg viewBox="0 0 24 24"><path d="M5 8h6l-6 7h6M14 5h5l-5 6h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><rect x="11" y="9.5" width="2" height="5.5" fill="var(--card-background-color,#000)"/><rect x="11" y="16.6" width="2" height="2" fill="var(--card-background-color,#000)"/></svg>',
  queue:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h6"/></svg>',
  seq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h12m0 0-4-4m4 4-4 4"/></svg>',
  par: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 5v14M16 5v14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
const zoneIcon = (type) =>
  type === 'drip' ? I.drop : type === 'beds' ? I.sprout : I.sprinkler;

class ZroshuaCard extends HTMLElement {
  setConfig(config) {
    this._config = { view: 'dashboard', entity: 'sensor.zroshua_state', ...config };
    if (!VIEWS.includes(this._config.view)) throw new Error(`view must be one of ${VIEWS.join(', ')}`);
    this._built = false;
    this._sel = null;
    this._filter = 'all';
  }

  set hass(hass) {
    this._hass = hass;
    // hass fires on EVERY entity change in HA; re-render only when the hub
    // entity itself changed, otherwise taps die on rebuilt DOM mid-touch.
    const st = this._state();
    if (st === this._lastState && this._built) return;
    this._lastState = st;
    this._render();
  }

  getCardSize() {
    return this._config.view === 'timeline' ? 4 : 6;
  }

  static getConfigElement() {
    return document.createElement('zroshua-card-editor');
  }
  static getStubConfig() {
    return { view: 'dashboard' };
  }

  // ---- helpers -----------------------------------------------------------

  _state() {
    if (!this._hass) return null;
    const direct = this._hass.states[this._config.entity];
    if (direct) return direct;
    if (this._foundId && this._hass.states[this._foundId]) return this._hass.states[this._foundId];
    for (const id of Object.keys(this._hass.states)) {
      if (!id.startsWith('sensor.') || !/zroshua/.test(id)) continue;
      const at = this._hass.states[id].attributes;
      if (at && Array.isArray(at.zones) && Array.isArray(at.groups) && Array.isArray(at.upcoming)) {
        this._foundId = id;
        return this._hass.states[id];
      }
    }
    return null;
  }
  _candidates() {
    if (!this._hass) return [];
    return Object.keys(this._hass.states).filter((id) => /^sensor\..*zroshua/.test(id));
  }
  _cmd(action, extra = {}) {
    if (!this._hass) return;
    this._hass.callService('mqtt', 'publish', {
      topic: 'zroshua/command',
      payload: JSON.stringify({ action, ...extra }),
    });
  }
  _fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  _countdown(ts) {
    const s = Math.max(0, Math.round((ts - Date.now()) / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `in ${d}d ${h}h`;
    if (h > 0) return `in ${h}h ${String(m).padStart(2, '0')}m`;
    return `in ${m}m`;
  }
  _left(ts) {
    const m = Math.max(0, Math.round((ts - Date.now()) / 60000));
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m}m left`;
  }
  _esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  _btn({ cls = '', data = '', icon = '', label = '', disabled = false, title = '' }) {
    return `<button class="btn ${cls}" ${data} ${disabled ? 'disabled' : ''} title="${this._esc(title)}">
      ${icon ? `<span class="i">${icon}</span>` : ''}${label ? `<span>${this._esc(label)}</span>` : ''}</button>`;
  }
  _status(z) {
    if (z.fault) return { key: 'fault', label: 'fault', cls: 'danger' };
    if (z.running) return { key: 'running', label: z.endsAt ? this._left(z.endsAt) : 'watering', cls: 'ok' };
    if (z.queued) return { key: 'queued', label: 'queued', cls: 'warn' };
    if (!z.enabled) return { key: 'off', label: 'off', cls: 'muted' };
    return { key: 'idle', label: `${Math.round(z.baseMin)}m`, cls: 'idle' };
  }

  // ---- render ------------------------------------------------------------

  _render() {
    const a = this._state() ? this._state().attributes : null;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (!this._built) {
      this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card></ha-card>`;
      this._built = true;
    }
    const card = this.shadowRoot.querySelector('ha-card');
    if (!a) {
      const cands = this._candidates();
      const hint = cands.length
        ? `Found ${cands.map((c) => `<code>${this._esc(c)}</code>`).join(', ')} but no hub state yet &mdash; waiting for data.`
        : `Is the Zroshua add-on running with MQTT? (The add-on Settings page shows the MQTT status.)`;
      card.innerHTML = `<div class="pad muted">Waiting for the Zroshua hub entity. ${hint}</div>`;
      return;
    }
    const title = this._config.title;
    const header = title ? `<div class="hdr">${this._esc(title)}</div>` : '';
    card.innerHTML = header + this['_view_' + this._config.view](a);
    this._wire(card, a);
  }

  _wire(card, a) {
    const on = (sel, fn) => card.querySelectorAll(sel).forEach((el) => (el.onclick = (e) => { e.stopPropagation(); fn(el); }));
    on('[data-run-group]', (el) => this._cmd('run_group', { groupId: el.dataset.runGroup }));
    on('[data-stop-group]', (el) => this._cmd('stop_group', { groupId: el.dataset.stopGroup }));
    on('[data-run-zone]', (el) => {
      this._cmd('run_zone', { zoneId: el.dataset.runZone, minutes: Number(el.dataset.min) || undefined });
      this._sel = null;
      this._render();
    });
    on('[data-stop-zone]', (el) => {
      this._cmd('stop_zone', { zoneId: el.dataset.stopZone });
      if (this._sel) { this._sel = null; this._render(); }
    });
    on('[data-stop-all]', () => this._cmd('stop_all'));
    on('[data-snooze]', () => this._cmd('snooze', { hours: 24 }));
    on('[data-rain]', () => this._cmd('rain_delay', { hours: 24 }));
    on('[data-zone-sel]', (el) => {
      const next = this._sel === el.dataset.zoneSel ? null : el.dataset.zoneSel;
      this._openAnim = next !== null && this._sel === null; // animate only on open, not re-render
      this._sel = next;
      this._render();
    });
    on('[data-close-sel]', () => {
      this._sel = null;
      this._render();
    });
    on('[data-filter]', (el) => {
      this._filter = el.dataset.filter;
      this._render();
    });
  }

  _chip(txt, cls = '', icon = '') {
    return `<span class="chip ${cls}">${icon ? `<span class="ci">${icon}</span>` : ''}${this._esc(txt)}</span>`;
  }

  // ---- views -------------------------------------------------------------

  _view_dashboard(a) {
    const active = (a.active || [])
      .map((r) => {
        const pct = Math.round((r.progress || 0) * 100);
        return `<div class="row tap" data-zone-sel="${this._esc(r.zoneId)}"><div class="grow"><b>${this._esc(r.zoneName)}</b> ${this._chip(r.triggeredBy)}
          <div class="bar"><div style="width:${pct}%"></div></div></div>
          <span class="muted small">${this._left(r.endsAt)}</span>
          ${this._btn({ cls: 'danger icon', data: `data-stop-zone="${this._esc(r.zoneId)}"`, icon: I.stop, title: 'Stop' })}</div>`;
      })
      .join('');
    const queue = (a.queue || [])
      .map((q) => `<div class="row small tap" data-zone-sel="${this._esc(q.zoneId)}"><span class="grow">${this._esc(q.zoneName)} &mdash; ${Math.round(q.durationMin)} min</span>${this._chip(q.waitReason, 'muted')}</div>`)
      .join('');
    const next = (a.upcoming || []).filter((u) => u.ts > Date.now())[0];
    const tile = (label, value, icon, cls = '') =>
      `<div class="tile"><span class="ti ${cls}">${icon}</span><div><span class="muted small">${label}</span><b>${value}</b></div></div>`;
    return `
      <div class="pad">
        <div class="tiles">
          ${tile('Watering', String((a.active || []).length), I.drop, 'ok')}
          ${tile('Queued', String((a.queue || []).length), I.queue, 'warn')}
          ${tile('Today', `${a.litersToday ?? 0} L`, I.sprinkler, 'idle')}
          ${tile('Next', next ? this._countdown(next.ts) : '—', I.clock, 'accent')}
        </div>
        <div class="sec">Now</div>
        ${active || '<div class="muted">Nothing is watering.</div>'}
        ${queue ? `<div class="sec">Queue</div>${queue}` : ''}
        <div class="actions">
          ${this._btn({ cls: 'danger', data: 'data-stop-all', icon: I.stop, label: 'Stop all' })}
          ${this._btn({ cls: 'ghost', data: 'data-rain', icon: I.rain, label: a.rainDelayUntil ? 'Rain delay ✓' : 'Rain delay 24h' })}
          ${this._btn({ cls: 'ghost', data: 'data-snooze', icon: I.zzz, label: a.snoozeUntil ? 'Snoozed ✓' : 'Snooze 24h' })}
        </div>
        ${this._sheet(a)}
      </div>`;
  }

  _view_groups(a) {
    const tiles = (a.groups || [])
      .map((g) => {
        const state = g.running ? 'run' : g.enabled ? 'idle' : 'off';
        const modeIcon = g.mode === 'sequential' ? I.seq : I.par;
        const nextRow = g.running
          ? `<div class="gnext ok"><span class="ci">${I.drop}</span>${g.activeZones != null ? `${g.activeZones} watering` : 'watering'}${g.queuedZones ? ` &middot; ${g.queuedZones} queued` : ''}</div>
             <div class="shimmer"></div>`
          : g.nextTs
            ? `<div class="gnext"><span class="ci">${I.clock}</span>${this._countdown(g.nextTs)} &middot; ${this._fmtTime(g.nextTs)}${g.nextMinutes ? ` &middot; ${g.nextMinutes}m` : ''}</div>`
            : `<div class="gnext muted"><span class="ci">${I.clock}</span>no schedule</div>`;
        const btn = g.running
          ? this._btn({ cls: 'danger block', data: `data-stop-group="${this._esc(g.id)}"`, icon: I.stop, label: 'Stop group' })
          : this._btn({ cls: 'primary block', data: `data-run-group="${this._esc(g.id)}"`, icon: I.play, label: 'Run', disabled: !g.enabled });
        return `<div class="gtile ${state}">
          <div class="ghead">
            <span class="gname" title="${this._esc(g.name)}">${this._esc(g.name)}</span>
            <span class="gmode" title="${g.mode}">${modeIcon}</span>
          </div>
          <div class="gmeta muted small">${g.zoneCount} zones &middot; ${g.schedules} schedule${g.schedules === 1 ? '' : 's'}${g.enabled ? '' : ' &middot; disabled'}</div>
          ${nextRow}
          ${btn}
        </div>`;
      })
      .join('');
    return `<div class="pad"><div class="ggrid">${tiles || '<div class="muted">No groups.</div>'}</div></div>`;
  }

  _view_zones(a) {
    const zones = a.zones || [];
    const groups = a.groups || [];
    const counts = {
      all: zones.length,
      running: zones.filter((z) => z.running || z.queued).length,
      idle: zones.filter((z) => z.enabled && !z.running && !z.queued).length,
      off: zones.filter((z) => !z.enabled).length,
    };
    const show = (z) =>
      this._filter === 'all'
        ? true
        : this._filter === 'running'
          ? z.running || z.queued
          : this._filter === 'idle'
            ? z.enabled && !z.running && !z.queued
            : !z.enabled;

    const filters = [
      ['all', `All ${counts.all}`],
      ['running', `Active ${counts.running}`],
      ['idle', `Idle ${counts.idle}`],
      ['off', `Off ${counts.off}`],
    ]
      .map(([k, l]) => `<button class="fchip ${this._filter === k ? 'on' : ''}" data-filter="${k}">${l}</button>`)
      .join('');

    const chipFor = (z) => {
      const st = this._status(z);
      const sel = this._sel === z.id ? 'sel' : '';
      return `<button class="zchip ${st.key} ${sel}" data-zone-sel="${this._esc(z.id)}" title="${this._esc(z.name)}">
        <span class="zi">${zoneIcon(z.type)}</span>
        <span class="zn">${this._esc(z.name)}</span>
        <span class="zs ${st.cls}"><span class="dot"></span>${st.label}</span>
      </button>`;
    };

    const seen = new Set();
    const sections = groups
      .map((g) => {
        const list = zones.filter((z) => (z.groupIds || []).includes(g.id) && show(z));
        list.forEach((z) => seen.add(z.id));
        if (!list.length) return '';
        const runningN = list.filter((z) => z.running).length;
        return `<div class="zsec">
          <div class="zhead"><span>${this._esc(g.name)}</span><span class="muted small">${list.length}${runningN ? ` &middot; ${runningN} watering` : ''}</span></div>
          <div class="zgrid">${list.map(chipFor).join('')}</div>
        </div>`;
      })
      .join('');
    const rest = zones.filter((z) => !seen.has(z.id) && !(z.groupIds || []).length && show(z));
    const restSec = rest.length
      ? `<div class="zsec"><div class="zhead"><span>Ungrouped</span><span class="muted small">${rest.length}</span></div>
         <div class="zgrid">${rest.map(chipFor).join('')}</div></div>`
      : '';

    return `<div class="pad">
      <div class="fbar">${filters}</div>
      ${sections + restSec || '<div class="muted">No zones match this filter.</div>'}
      ${this._sheet(a)}
    </div>`;
  }

  /** Action sheet for the selected zone: a fixed overlay above the viewport,
   *  so on a long list nothing scrolls or shifts — it pops over where you are.
   *  Shared by the zones and dashboard views. */
  _sheet(a) {
    const z = (a.zones || []).find((x) => x.id === this._sel);
    if (!z) return '';
    const st = this._status(z);
    const base = Math.round(z.baseMin) || 10;
    const presets = [...new Set([5, 10, 15, base])].sort((x, y) => x - y).filter((m) => m <= (z.maxMin || 999));
    const anim = this._openAnim ? ' anim' : '';
    this._openAnim = false;
    return `<div class="ovl" data-close-sel></div><div class="sheet${anim}">
      <div class="shead">
        <span class="zi big">${zoneIcon(z.type)}</span>
        <div class="grow"><b>${this._esc(z.name)}</b><div class="zs ${st.cls} small"><span class="dot"></span>${st.label}</div></div>
        ${this._btn({ cls: 'ghost icon', data: 'data-close-sel', icon: I.x, title: 'Close' })}
      </div>
      ${
        z.running
          ? `<div class="srow">${this._btn({ cls: 'danger block', data: `data-stop-zone="${this._esc(z.id)}"`, icon: I.stop, label: 'Stop watering' })}</div>`
          : `<div class="srow">
              ${presets
                .map((m) =>
                  this._btn({
                    cls: m === base ? 'primary' : 'ghost',
                    data: `data-run-zone="${this._esc(z.id)}" data-min="${m}"`,
                    icon: I.play,
                    label: `${m}m`,
                    disabled: !z.enabled,
                  }),
                )
                .join('')}
            </div>`
      }
    </div>`;
  }

  _view_upcoming(a) {
    const rows = (a.upcoming || [])
      .filter((u) => u.ts > Date.now())
      .map(
        (u) => `<div class="row"><span class="ci accent">${I.clock}</span><div class="grow"><b>${this._esc(u.groupName)}</b>
          <div class="muted small">${this._esc((u.zones || []).join(', '))}</div></div>
          <span class="muted small">${u.minutes}m</span>${this._chip(this._countdown(u.ts), 'accent')}<span class="muted small">${this._fmtTime(u.ts)}</span></div>`,
      )
      .join('');
    return `<div class="pad">${rows || '<div class="muted">Nothing scheduled in the next 7 days.</div>'}</div>`;
  }

  _view_timeline(a) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const from = dayStart.getTime();
    const to = from + 86400000;
    const segs = (a.timeline || []).filter((s) => s.s < to && s.e > from);
    const byGroup = new Map();
    for (const s of segs) byGroup.set(s.g, [...(byGroup.get(s.g) || []), s]);
    const pct = (ts) => Math.max(0, Math.min(100, ((ts - from) / 86400000) * 100));
    const nowPct = pct(Date.now());
    const rows = [...byGroup.entries()]
      .map(([g, list]) => {
        const bars = list
          .map(
            (s) =>
              `<div class="tlbar ${s.c ? 'conflict' : s.k === 'z' ? 'zone' : ''}" title="${this._esc(s.z)} ${this._fmtTime(s.s)}–${this._fmtTime(s.e)}" style="left:${pct(s.s)}%;width:${Math.max(0.6, pct(s.e) - pct(s.s))}%"></div>`,
          )
          .join('');
        return `<div class="tlrow"><span class="tllabel" title="${this._esc(g)}">${this._esc(g)}</span><div class="tltrack">${bars}<div class="tlnow" style="left:${nowPct}%"></div></div></div>`;
      })
      .join('');
    const scale = [0, 4, 8, 12, 16, 20, 24].map((h) => `<span>${String(h).padStart(2, '0')}</span>`).join('');
    return `<div class="pad">
      <div class="tlscale"><span class="tllabel"></span><div class="tlticks">${scale}</div></div>
      ${rows || '<div class="muted">Nothing scheduled today.</div>'}
      <div class="tllegend">${this._chip('group', 'ok')}${this._chip('zone', 'accent')}${this._chip('conflict', 'danger')}</div>
    </div>`;
  }
}

const STYLE = `
  :host { --z-ok:#12b886; --z-warn:#f0a105; --z-danger:#fa5252; --z-accent:#9775fa; --z-info:#4dabf7;
    -webkit-tap-highlight-color: transparent; }
  button { -webkit-tap-highlight-color: transparent; }
  ha-card { overflow: hidden; }
  .pad { padding: 12px 16px 16px; }
  .hdr { padding: 14px 16px 0; font-size: 1.15rem; font-weight: 600; }
  .muted { color: var(--secondary-text-color); }
  .small { font-size: .82rem; }
  .grow { flex: 1; min-width: 0; }
  .sec { margin: 12px 0 6px; font-weight: 600; }
  .row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--divider-color); }
  .row.tap { cursor: pointer; border-radius: 10px; margin: 0 -6px; padding: 8px 6px; transition: background .12s; }
  @media (hover: hover) { .row.tap:hover { background: color-mix(in srgb, var(--secondary-background-color) 55%, transparent); } }
  .row.tap:active { background: color-mix(in srgb, var(--secondary-background-color) 75%, transparent); }
  .row:last-of-type { border-bottom: 0; }
  code { background: var(--secondary-background-color); padding: 1px 5px; border-radius: 4px; }

  /* icons */
  .i, .ci, .zi, .ti { display: inline-flex; }
  .i svg, .ci svg { width: 15px; height: 15px; fill: currentColor; }
  .ci { margin-right: 6px; vertical-align: -2px; }
  .ci.accent { color: var(--z-accent); }

  /* buttons */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    border: none; border-radius: 12px; padding: 9px 15px; font-weight: 600; font-size: .88rem;
    cursor: pointer; color: var(--primary-text-color); background: var(--secondary-background-color);
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease; }
  @media (hover: hover) {
    .btn:hover:not([disabled]) { transform: translateY(-1px); filter: brightness(1.12); box-shadow: 0 3px 10px rgba(0,0,0,.35); }
  }
  .btn:active:not([disabled]) { transform: translateY(0) scale(.97); }
  .btn:focus { outline: none; }
  .btn:focus-visible { outline: 2px solid var(--z-info); outline-offset: 2px; }
  .btn[disabled] { opacity: .38; cursor: default; }
  .btn.primary { background: linear-gradient(140deg, #14c08c, #0b9e74); color: #fff; box-shadow: 0 2px 8px rgba(18,184,134,.35); }
  .btn.danger { background: linear-gradient(140deg, #f75b5b, #d63c3c); color: #fff; }
  .btn.ghost { background: color-mix(in srgb, var(--secondary-background-color) 80%, transparent);
    border: 1px solid var(--divider-color); }
  .btn.icon { padding: 8px; border-radius: 50%; }
  .btn.block { width: 100%; }

  /* chips */
  .chip { display: inline-flex; align-items: center; font-size: .72rem; padding: 2px 9px; border-radius: 999px; margin-left: 4px;
    background: var(--secondary-background-color); color: var(--secondary-text-color); }
  .chip .ci svg { width: 12px; height: 12px; }
  .chip.ok { background: color-mix(in srgb, var(--z-ok) 18%, transparent); color: var(--z-ok); }
  .chip.warn { background: color-mix(in srgb, var(--z-warn) 18%, transparent); color: var(--z-warn); }
  .chip.danger { background: color-mix(in srgb, var(--z-danger) 18%, transparent); color: var(--z-danger); }
  .chip.accent { background: color-mix(in srgb, var(--z-accent) 18%, transparent); color: var(--z-accent); }

  .bar { height: 6px; border-radius: 4px; background: var(--divider-color); margin-top: 6px; overflow: hidden; }
  .bar div { height: 100%; background: linear-gradient(90deg, #14c08c, #0b9e74); }

  /* dashboard tiles */
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 10px; }
  .tile { display: flex; align-items: center; gap: 10px; background: var(--secondary-background-color);
    border-radius: 14px; padding: 10px 12px; }
  .tile b { display: block; font-size: 1.15rem; line-height: 1.15; }
  .ti { width: 34px; height: 34px; border-radius: 10px; align-items: center; justify-content: center; flex-shrink: 0; }
  .ti svg { width: 18px; height: 18px; fill: currentColor; }
  .ti.ok { background: color-mix(in srgb, var(--z-ok) 16%, transparent); color: var(--z-ok); }
  .ti.warn { background: color-mix(in srgb, var(--z-warn) 16%, transparent); color: var(--z-warn); }
  .ti.idle { background: color-mix(in srgb, var(--z-info) 16%, transparent); color: var(--z-info); }
  .ti.accent { background: color-mix(in srgb, var(--z-accent) 16%, transparent); color: var(--z-accent); }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }

  /* group tiles */
  .ggrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(215px, 1fr)); gap: 10px; }
  .gtile { position: relative; border: 1px solid var(--divider-color); border-radius: 16px; padding: 12px 14px 14px;
    background: color-mix(in srgb, var(--secondary-background-color) 55%, transparent);
    display: flex; flex-direction: column; gap: 7px; overflow: hidden; }
  .gtile.run { border-color: color-mix(in srgb, var(--z-ok) 55%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--z-ok) 40%, transparent); }
  .gtile.off { opacity: .55; }
  .ghead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .gname { font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gmode { color: var(--secondary-text-color); }
  .gmode svg { width: 16px; height: 16px; }
  .gnext { font-size: .82rem; color: var(--secondary-text-color); display: flex; align-items: center; }
  .gnext.ok { color: var(--z-ok); font-weight: 600; }
  .gnext .ci svg { width: 14px; height: 14px; }
  .shimmer { height: 4px; border-radius: 3px; overflow: hidden; position: relative; background: color-mix(in srgb, var(--z-ok) 22%, transparent); }
  .shimmer::after { content: ''; position: absolute; inset: 0; width: 45%; border-radius: 3px;
    background: var(--z-ok); animation: zsh 1.6s ease-in-out infinite; }
  @keyframes zsh { 0% { transform: translateX(-110%);} 100% { transform: translateX(260%);} }

  /* zones */
  .fbar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .fchip { border: 1px solid var(--divider-color); background: transparent; color: var(--secondary-text-color);
    padding: 5px 12px; border-radius: 999px; font-size: .8rem; font-weight: 600; cursor: pointer; transition: all .12s; }
  .fchip.on { background: var(--primary-text-color); color: var(--card-background-color); border-color: transparent; }
  .zsec { margin-bottom: 10px; }
  .zhead { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 2px;
    font-weight: 650; font-size: .86rem; letter-spacing: .01em; }
  .zgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 7px; }
  .zchip { display: flex; align-items: center; gap: 8px; text-align: left; border: 1px solid var(--divider-color);
    background: color-mix(in srgb, var(--secondary-background-color) 55%, transparent);
    border-radius: 12px; padding: 8px 10px; cursor: pointer; color: var(--primary-text-color);
    transition: transform .1s, border-color .12s, box-shadow .12s; min-width: 0; }
  @media (hover: hover) {
    .zchip:hover { transform: translateY(-1px); border-color: var(--secondary-text-color); }
  }
  .zchip:active { transform: scale(.985); }
  .zchip:focus, .fchip:focus { outline: none; }
  .zchip:focus-visible, .fchip:focus-visible { outline: 2px solid var(--z-info); outline-offset: 2px; }
  .zchip.sel { border-color: var(--z-info); box-shadow: 0 0 0 1px var(--z-info); }
  .zchip.running { border-color: color-mix(in srgb, var(--z-ok) 60%, transparent); }
  .zchip.fault { border-color: color-mix(in srgb, var(--z-danger) 60%, transparent); }
  .zchip.off { opacity: .5; }
  .zi { width: 28px; height: 28px; border-radius: 9px; align-items: center; justify-content: center; flex-shrink: 0;
    background: var(--secondary-background-color); color: var(--secondary-text-color); }
  .zi svg { width: 15px; height: 15px; fill: currentColor; }
  .zi.big { width: 36px; height: 36px; }
  .zchip.running .zi { background: color-mix(in srgb, var(--z-ok) 18%, transparent); color: var(--z-ok); }
  .zchip.queued .zi { background: color-mix(in srgb, var(--z-warn) 18%, transparent); color: var(--z-warn); }
  .zchip.fault .zi { background: color-mix(in srgb, var(--z-danger) 18%, transparent); color: var(--z-danger); }
  .zchip > div, .zn { min-width: 0; }
  .zn { flex: 1; font-size: .84rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .zs { display: inline-flex; align-items: center; gap: 4px; font-size: .72rem; color: var(--secondary-text-color); white-space: nowrap; }
  .zs .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .zs.ok { color: var(--z-ok); } .zs.warn { color: var(--z-warn); } .zs.danger { color: var(--z-danger); }
  .zs.idle { color: var(--secondary-text-color); } .zs.muted { color: var(--secondary-text-color); opacity: .7; }
  .zchip.running .zs .dot { animation: zpulse 1.4s ease-in-out infinite; }
  @keyframes zpulse { 0%,100% { opacity: 1; } 50% { opacity: .25; } }

  /* zone action sheet: fixed overlay over the viewport (no scroll, no layout shift) */
  .ovl { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 6; }
  .sheet { position: fixed; left: 50%; transform: translateX(-50%);
    bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    width: min(430px, calc(100vw - 20px)); box-sizing: border-box; z-index: 7; padding: 12px;
    background: var(--card-background-color); border: 1px solid var(--divider-color);
    border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,.5); }
  .sheet.anim { animation: zup .18s ease-out; }
  @keyframes zup { from { transform: translate(-50%, 16px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
  .shead { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .shead .zs { display: flex; margin-top: 2px; }
  .srow { display: flex; gap: 7px; flex-wrap: wrap; }
  .srow .btn { flex: 1 1 auto; }

  /* timeline */
  .tlscale, .tlrow { display: flex; align-items: center; gap: 8px; }
  .tlrow { height: 30px; }
  .tllabel { width: 96px; flex-shrink: 0; font-size: .8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tltrack { position: relative; flex: 1; height: 22px; background: var(--secondary-background-color); border-radius: 6px; }
  .tlticks { position: relative; flex: 1; display: flex; justify-content: space-between; font-size: .7rem; color: var(--secondary-text-color); }
  .tlbar { position: absolute; top: 3px; height: 16px; border-radius: 4px; background: var(--z-ok); opacity: .92; }
  .tlbar.zone { background: var(--z-accent); }
  .tlbar.conflict { background: var(--z-danger); }
  .tlnow { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--z-info); border-radius: 2px; }
  .tllegend { margin-top: 8px; }
`;

// simple config editor: a view selector + title
class ZroshuaCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { view: 'dashboard', ...config };
    this._render();
  }
  set hass(h) {
    this._hass = h;
  }
  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .f { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
        label { font-size: .85rem; color: var(--secondary-text-color); }
        select, input { padding: 8px; border-radius: 8px; border: 1px solid var(--divider-color);
          background: var(--card-background-color); color: var(--primary-text-color); }
      </style>
      <div class="f">
        <label>View</label>
        <select id="view">${VIEWS.map((v) => `<option value="${v}" ${v === this._config.view ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <label>Title (optional)</label>
        <input id="title" value="${this._config.title || ''}" />
      </div>`;
    const emit = () => {
      this._config = {
        ...this._config,
        view: this.shadowRoot.getElementById('view').value,
        title: this.shadowRoot.getElementById('title').value || undefined,
      };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
    };
    this.shadowRoot.getElementById('view').onchange = emit;
    this.shadowRoot.getElementById('title').oninput = emit;
  }
}

customElements.define('zroshua-card', ZroshuaCard);
customElements.define('zroshua-card-editor', ZroshuaCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'zroshua-card',
  name: 'Zroshua',
  description: 'Irrigation dashboard, groups, zones, upcoming and timeline cards.',
  preview: false,
});
console.info('%c ZROSHUA-CARD ', 'background:#12b886;color:#fff;border-radius:3px', 'loaded');
