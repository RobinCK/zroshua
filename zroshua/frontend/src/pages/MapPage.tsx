import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Button, Card, FileButton, Group, Modal, Select, Stack, Text, Title, Badge } from '@mantine/core';
import { IconPlus, IconMinus, IconZoomReset } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, EngineState, Zone } from '../api';
import { fmtDur, fmtTime, useResource } from '../hooks';
import { SliderInput } from '../components/common';

const STATE_COLORS: Record<string, string> = {
  watering: '#12b886',
  queued: '#fab005',
  fault: '#fa5252',
  disabled: '#868e96',
  idle: '#4dabf7',
};

// Zones are filled by their watering TYPE; live state is shown by opacity/animation.
// Distinct hues (validated for dark + CVD with the legend icons as secondary encoding):
// water types stay clearly apart — sprinkler indigo vs drip mint — instead of two blues.
const TYPE_COLORS: Record<string, string> = {
  sprinkler: '#4c6ef5', // indigo
  drip: '#38d9a9', // mint / teal
  beds: '#f59f00', // amber (soil)
  lawn: '#82c91e', // lime green
  shrubs: '#e64980', // rose
};
const typeColor = (t: string) => TYPE_COLORS[t] ?? TYPE_COLORS.sprinkler;
const FAULT_COLOR = '#fa5252';
const ASSIGN_SELECTED = '#12b886'; // shape belongs to the zone being edited
const ASSIGN_OTHER = '#7048e8'; // shape belongs to a different zone
const ASSIGN_FREE = '#adb5bd'; // shape not assigned to any zone

// Monochrome 24×24 glyphs per zone type, drawn white on a chip at the zone centre.
const TYPE_ICON: Record<string, string> = {
  drip: '<path d="M12 4c3 4 5 6.9 5 9.6A5 5 0 0 1 7 13.6C7 10.9 9 8 12 4z" fill="#fff"/>',
  sprinkler:
    '<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="9.2" r="2.2" fill="#fff" stroke="none"/><path d="M12 11.4V19M7 20h10"/><path d="M6.5 6.8 8.2 8M17.5 6.8 15.8 8M12 3v2.4"/></g>',
  beds:
    '<path d="M12 21v-8M12 13c0-3.6-2.7-5.4-6.3-5.4 0 3.6 2.7 5.4 6.3 5.4zm0 0c0-3.6 2.7-5.4 6.3-5.4 0 3.6-2.7 5.4-6.3 5.4z" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>',
  lawn: '<g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M5 20c.8-4 1.6-6 2.6-7 .5 2 .5 4.2 0 7M11 20c.9-5 1.8-7.4 2.8-8.4M17 20c.8-4 1.6-6 2.6-7 .5 2 .5 4.2 0 7"/></g>',
  shrubs:
    '<g fill="#fff"><circle cx="8.5" cy="13" r="3.8"/><circle cx="14.5" cy="11" r="4.4"/></g><path d="M12 20v-6" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>',
};
const typeGlyph = (t: string) => TYPE_ICON[t] ?? TYPE_ICON.sprinkler;

/** Elements that make up a zone: new array field, falling back to the legacy single id. */
function elementsOf(z: Zone): string[] {
  if (z.svgElementIds && z.svgElementIds.length) return z.svgElementIds;
  return z.svgElementId ? [z.svgElementId] : [];
}

export default function MapPage({ state }: { state: EngineState | null }) {
  const { data: map, reload } = useResource<{ svg: string | null; ids: { id: string; label: string | null }[] }>('/map');
  const { data: zones, reload: reloadZones } = useResource<Zone[]>('/zones');
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false); // set while dragging so a pan doesn't trigger a shape click
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const [assignMode, setAssignMode] = useState(false);
  const [assignZoneId, setAssignZoneId] = useState<string | null>(null);
  const [popupZone, setPopupZone] = useState<Zone | null>(null);
  const [runMinutes, setRunMinutes] = useState(15);
  const [nextRun, setNextRun] = useState<string | null>(null);

  // reverse map: svg element id -> owning zone
  const zoneByElement = useMemo(() => {
    const m = new Map<string, Zone>();
    for (const z of zones ?? []) for (const el of elementsOf(z)) m.set(el, z);
    return m;
  }, [zones]);

  const assignZone = (zones ?? []).find((z) => z.id === assignZoneId) ?? null;
  const assignSet = useMemo(() => new Set(assignZone ? elementsOf(assignZone) : []), [assignZone]);

  const stateOfZone = (z: Zone): keyof typeof STATE_COLORS => {
    if (!z.enabled) return 'disabled';
    if (state?.faults.includes(z.id)) return 'fault';
    if (state?.active.some((a) => a.zoneId === z.id)) return 'watering';
    if (state?.queue.some((q) => q.zoneId === z.id)) return 'queued';
    return 'idle';
  };

  const saveElements = async (zone: Zone, ids: string[]) => {
    await api.put(`/zones/${zone.id}`, { ...zone, svgElementIds: ids, svgElementId: null });
  };

  // toggle one shape in/out of the zone currently being edited
  const toggleElement = async (elId: string) => {
    if (!assignZone) {
      notifications.show({ message: 'Pick a zone to assign first', color: 'yellow' });
      return;
    }
    try {
      const current = elementsOf(assignZone);
      const has = current.includes(elId);
      if (!has) {
        // a shape belongs to a single zone — take it away from any other owner first
        for (const z of zones ?? []) {
          if (z.id !== assignZone.id && elementsOf(z).includes(elId)) {
            await saveElements(z, elementsOf(z).filter((x) => x !== elId));
          }
        }
      }
      await saveElements(assignZone, has ? current.filter((x) => x !== elId) : [...current, elId]);
      await reloadZones();
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' });
    }
  };

  // paint + wire clicks whenever svg/zones/state/mode change
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !map?.svg) return;
    el.innerHTML = map.svg;
    const svg = el.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '100%');
      svg.removeAttribute('height');
      svg.style.height = 'auto';
      svg.style.display = 'block';
    }
    for (const { id } of map.ids) {
      const node = el.querySelector<SVGElement>(`#${CSS.escape(id)}`);
      if (!node) continue;
      const zone = zoneByElement.get(id);
      node.style.cursor = 'pointer';
      node.style.transition = 'fill-opacity 0.3s';
      node.style.outline = '';
      node.style.animation = '';
      node.style.stroke = '';
      node.style.strokeWidth = '';
      node.style.strokeDasharray = '';
      node.style.vectorEffect = '';

      if (assignMode) {
        if (assignSet.has(id)) {
          node.style.fill = ASSIGN_SELECTED;
          node.style.fillOpacity = '0.7';
          node.style.outline = `2px solid ${ASSIGN_SELECTED}`;
        } else if (zone) {
          node.style.fill = ASSIGN_OTHER;
          node.style.fillOpacity = '0.35';
        } else {
          node.style.fill = ASSIGN_FREE;
          node.style.fillOpacity = '0.28';
        }
      } else if (zone) {
        // fill = watering TYPE color; live state = opacity + animation
        const st = stateOfZone(zone);
        const tc = typeColor(zone.type);
        if (st === 'fault') {
          node.style.fill = FAULT_COLOR;
          node.style.fillOpacity = '0.8';
          node.style.animation = 'zroshua-pulse 1.1s ease-in-out infinite';
        } else if (st === 'disabled') {
          node.style.fill = tc;
          node.style.fillOpacity = '0.14';
        } else if (st === 'watering') {
          node.style.fill = tc;
          node.style.fillOpacity = '0.85';
          node.style.animation = 'zroshua-pulse 1.6s ease-in-out infinite';
        } else if (st === 'queued') {
          node.style.fill = tc;
          node.style.fillOpacity = '0.5';
          // constant-width dashed outline regardless of the plan's scale
          node.style.stroke = STATE_COLORS.queued;
          node.style.strokeWidth = '2';
          node.style.strokeDasharray = '6 4';
          node.style.vectorEffect = 'non-scaling-stroke';
          node.style.animation = 'zroshua-dash 0.8s linear infinite';
        } else {
          node.style.fill = tc; // idle
          node.style.fillOpacity = '0.5';
        }
      } else {
        // unassigned shape in view mode: keep the plan's original look
        node.style.fill = '';
        node.style.fillOpacity = '';
      }

      node.onclick = (e) => {
        e.stopPropagation();
        if (movedRef.current) return; // a pan drag, not a tap
        if (assignMode) void toggleElement(id);
        else if (zone) {
          setPopupZone(zone);
          setRunMinutes(Math.round(zone.baseDurationMin));
        }
      };
    }

    // Remaining-minute labels live in a separate HTML layer (see the layout
    // effect below) so their size is fixed in pixels and independent of the
    // plan's scale — SVG <text> would grow/shrink with each different map.
  }, [map, zoneByElement, assignSet, state, assignMode, zones]);

  // Position the pixel-sized remaining-time labels over the SVG, and keep them
  // aligned when the map is resized (responsive / different plan aspect ratios).
  useEffect(() => {
    const host = containerRef.current;
    const ov = overlayRef.current;
    const stage = stageRef.current;
    if (!host || !ov || !stage) return;

    const layout = () => {
      ov.innerHTML = '';
      if (assignMode || !map?.svg) return;
      const hostRect = stage.getBoundingClientRect(); // overlay is inside the (scrolled/zoomed) stage
      const now = Date.now();
      for (const z of zones ?? []) {
        const run = state?.active.find((a) => a.zoneId === z.id);
        if (!run) continue;
        const nodes = elementsOf(z)
          .map((id) => host.querySelector<SVGGraphicsElement>(`#${CSS.escape(id)}`))
          .filter((n): n is SVGGraphicsElement => !!n);
        if (!nodes.length) continue;
        let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        for (const n of nodes) {
          const rc = n.getBoundingClientRect();
          l = Math.min(l, rc.left); t = Math.min(t, rc.top);
          r = Math.max(r, rc.right); b = Math.max(b, rc.bottom);
        }
        const mins = Math.max(0, Math.round((run.endsAt - now) / 60000));
        const lab = document.createElement('div');
        lab.textContent = `${mins}m`;
        lab.style.cssText =
          `position:absolute;left:${(l + r) / 2 - hostRect.left}px;top:${(t + b) / 2 - hostRect.top}px;` +
          `transform:translate(-50%,-50%);font:800 13px/1 system-ui,sans-serif;color:#fff;` +
          `text-shadow:0 1px 3px rgba(0,0,0,.85),0 0 2px rgba(0,0,0,.85);white-space:nowrap`;
        ov.appendChild(lab);
      }
    };

    const raf = requestAnimationFrame(layout);
    const ro = new ResizeObserver(() => layout());
    ro.observe(host);
    window.addEventListener('resize', layout);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', layout);
    };
  }, [map, state, assignMode, zones, scale]);

  // ---- pan & zoom: buttons + mouse drag on desktop; one-finger pan and
  //      two-finger pinch on touch. No wheel-zoom (it hijacks desktop scroll). --
  const clampScale = (s: number) => Math.min(6, Math.max(1, s));
  // apply a scale imperatively (no React re-render) and keep the point (ax,ay in
  // viewport px) anchored; returns nothing, updates scaleRef + DOM directly.
  const applyScale = (ns: number, ax: number, ay: number) => {
    const vp = viewportRef.current;
    const stage = stageRef.current;
    if (!vp || !stage) return;
    ns = clampScale(ns);
    const fx = vp.scrollWidth ? (vp.scrollLeft + ax) / vp.scrollWidth : 0.5;
    const fy = vp.scrollHeight ? (vp.scrollTop + ay) / vp.scrollHeight : 0.5;
    scaleRef.current = ns;
    stage.style.width = `${ns * 100}%`;
    vp.scrollLeft = fx * vp.scrollWidth - ax;
    vp.scrollTop = fy * vp.scrollHeight - ay;
  };
  const commitScale = () => setScale(scaleRef.current); // sync React (labels, buttons)
  const zoomButton = (factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    applyScale(scaleRef.current * factor, vp.clientWidth / 2, vp.clientHeight / 2);
    commitScale();
  };
  const resetZoom = () => {
    const vp = viewportRef.current;
    const stage = stageRef.current;
    scaleRef.current = 1;
    if (stage) stage.style.width = '100%';
    if (vp) vp.scrollLeft = vp.scrollTop = 0;
    setScale(1);
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const pts = new Map<number, { x: number; y: number }>();
    let pan: { x: number; y: number; sl: number; st: number; mouse: boolean } | null = null;
    let pinch: { dist: number; scale: number } | null = null;
    const distOf = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        if (scaleRef.current <= 1) return; // nothing to pan
        pan = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop, mouse: true };
        movedRef.current = false;
        vp.style.cursor = 'grabbing';
        return;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      movedRef.current = false;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { dist: distOf(a, b) || 1, scale: scaleRef.current };
        pan = null;
      } else if (pts.size === 1) {
        pan = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop, mouse: false };
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        if (!pan?.mouse) return;
        const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
        vp.scrollLeft = pan.sl - dx;
        vp.scrollTop = pan.st - dy;
        return;
      }
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const rect = vp.getBoundingClientRect();
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const nd = distOf(a, b);
        movedRef.current = true;
        applyScale(pinch.scale * (nd / pinch.dist), (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      } else if (pan && pts.size === 1) {
        const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
        vp.scrollLeft = pan.sl - dx;
        vp.scrollTop = pan.st - dy;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        if (pan?.mouse) vp.style.cursor = scaleRef.current > 1 ? 'grab' : '';
        pan = null;
        setTimeout(() => (movedRef.current = false), 0);
        return;
      }
      pts.delete(e.pointerId);
      if (pts.size < 2 && pinch) {
        pinch = null;
        commitScale(); // re-render once the pinch ends (repositions labels)
      }
      if (pts.size === 1) {
        const p = [...pts.values()][0];
        pan = { x: p.x, y: p.y, sl: vp.scrollLeft, st: vp.scrollTop, mouse: false };
      } else if (pts.size === 0) {
        pan = null;
        setTimeout(() => (movedRef.current = false), 0);
      }
    };

    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', onUp);
    return () => {
      vp.removeEventListener('pointerdown', onDown);
      vp.removeEventListener('pointermove', onMove);
      vp.removeEventListener('pointerup', onUp);
      vp.removeEventListener('pointercancel', onUp);
    };
  }, [map]);

  useEffect(() => {
    if (!popupZone) return;
    setNextRun(null);
    api
      .get<{ ts: number | null }>(`/zones/${popupZone.id}/next`)
      .then((r) => setNextRun(r?.ts ? fmtTime(r.ts) : null))
      .catch(() => setNextRun(null));
  }, [popupZone]);

  const upload = async (file: File | null) => {
    if (!file) return;
    const svg = await file.text();
    try {
      await api.post('/map', { svg });
      notifications.show({ message: 'Map uploaded', color: 'teal' });
      reload();
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' });
    }
  };

  const startAssign = () => {
    setAssignZoneId((prev) => prev ?? (zones ?? [])[0]?.id ?? null);
    setAssignMode(true);
  };

  const popupState = popupZone ? stateOfZone(popupZone) : 'idle';
  const zoneOpts = (zones ?? []).map((z) => {
    const n = elementsOf(z).length;
    return { value: z.id, label: n ? `${z.name} (${n})` : z.name };
  });

  return (
    <Stack>
      <style>{`
        @keyframes zroshua-pulse { 0%,100% { fill-opacity: 0.9; } 50% { fill-opacity: 0.32; } }
        @keyframes zroshua-dash { to { stroke-dashoffset: -10; } }
        .zr-map-vp { scrollbar-width: none; -ms-overflow-style: none; overscroll-behavior: contain; }
        .zr-map-vp::-webkit-scrollbar { display: none; }
      `}</style>
      <Group justify="space-between">
        <Title order={3}>Site map</Title>
        <Group>
          {assignMode ? (
            <Button variant="filled" onClick={() => setAssignMode(false)} disabled={!map?.svg}>
              Done assigning
            </Button>
          ) : (
            <Button variant="light" onClick={startAssign} disabled={!map?.svg || !(zones ?? []).length}>
              Assign zones
            </Button>
          )}
          <FileButton onChange={upload} accept="image/svg+xml">
            {(props) => <Button {...props}>Upload SVG plan</Button>}
          </FileButton>
        </Group>
      </Group>

      {map?.svg ? (
        <Card withBorder>
          {assignMode && (
            <Stack gap="xs" mb="sm">
              <Select
                label="Assign shapes to zone"
                description="Tap shapes on the plan to add or remove them. A zone can be made of several shapes."
                data={zoneOpts}
                value={assignZoneId}
                onChange={setAssignZoneId}
                searchable
                maxDropdownHeight={280}
              />
              <Group gap="xs">
                <Badge variant="light" style={{ backgroundColor: `${ASSIGN_SELECTED}33`, color: ASSIGN_SELECTED }}>
                  this zone
                </Badge>
                <Badge variant="light" style={{ backgroundColor: `${ASSIGN_OTHER}33`, color: ASSIGN_OTHER }}>
                  other zone
                </Badge>
                <Badge variant="light" style={{ backgroundColor: `${ASSIGN_FREE}33`, color: ASSIGN_FREE }}>
                  unassigned
                </Badge>
                {assignZone && (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="red"
                    disabled={!elementsOf(assignZone).length}
                    onClick={() => saveElements(assignZone, []).then(reloadZones)}
                  >
                    Clear this zone
                  </Button>
                )}
              </Group>
            </Stack>
          )}
          <div style={{ position: 'relative' }}>
            <div
              ref={viewportRef}
              className="zr-map-vp"
              style={{
                position: 'relative',
                overflow: 'auto',
                maxHeight: '78vh',
                touchAction: 'none',
                cursor: scale > 1 ? 'grab' : 'default',
                borderRadius: 8,
              }}
            >
              {/* right padding keeps the SVG clear of the floating zoom buttons so
                  top-right shapes stay clickable */}
              <div ref={stageRef} style={{ position: 'relative', width: `${scale * 100}%`, paddingRight: 52 }}>
                <div ref={containerRef} />
                <div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
              </div>
            </div>
            <Stack gap={6} style={{ position: 'absolute', top: 8, right: 8 }}>
              <ActionIcon variant="default" size="lg" onClick={() => zoomButton(1.5)} title="Zoom in">
                <IconPlus size={18} />
              </ActionIcon>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => zoomButton(1 / 1.5)}
                disabled={scale <= 1}
                title="Zoom out"
              >
                <IconMinus size={18} />
              </ActionIcon>
              <ActionIcon variant="default" size="lg" onClick={resetZoom} disabled={scale <= 1} title="Reset zoom">
                <IconZoomReset size={18} />
              </ActionIcon>
            </Stack>
          </div>
          {!assignMode && (
            <Stack gap={8} mt="sm">
              <Group gap="sm">
                <Text size="xs" c="dimmed" w={40}>
                  type
                </Text>
                {['sprinkler', 'drip', 'beds', 'lawn', 'shrubs'].map((t) => (
                  <Group key={t} gap={6} wrap="nowrap">
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: typeColor(t),
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                      dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" width="13" height="13">${typeGlyph(t)}</svg>` }}
                    />
                    <Text size="xs" c="dimmed">
                      {t}
                    </Text>
                  </Group>
                ))}
              </Group>
              <Group gap="sm">
                <Text size="xs" c="dimmed" w={40}>
                  state
                </Text>
                <Text size="xs" c="dimmed">
                  <b style={{ color: 'var(--mantine-color-text)' }}>watering</b> pulses ·{' '}
                  <b style={{ color: 'var(--mantine-color-text)' }}>idle</b> steady ·{' '}
                  <b style={{ color: STATE_COLORS.queued }}>queued</b> dashed outline ·{' '}
                  <b style={{ color: STATE_COLORS.fault }}>fault</b> red ·{' '}
                  <b>disabled</b> faded
                </Text>
              </Group>
            </Stack>
          )}
        </Card>
      ) : (
        <Card withBorder>
          <Text c="dimmed">
            Upload an SVG plan of your property (Inkscape, Figma, Illustrator — any shapes: rectangles, paths,
            polygons, circles…). Shapes don't need ids; Zroshua adds them automatically. Then use “Assign zones” to
            link shapes to zones by tapping them — a single zone can be made of several shapes — and the plan is
            colored by live state.
          </Text>
        </Card>
      )}

      <Modal opened={!!popupZone} onClose={() => setPopupZone(null)} title={popupZone?.name}>
        {popupZone && (
          <Stack>
            <Group gap="xs">
              <Badge style={{ backgroundColor: STATE_COLORS[popupState] }}>{popupState}</Badge>
              {nextRun && (
                <Text size="sm" c="dimmed">
                  next: {nextRun}
                </Text>
              )}
            </Group>
            {popupState === 'watering' ? (
              <Button color="red" onClick={() => api.post(`/zones/${popupZone.id}/stop`).then(() => setPopupZone(null))}>
                Stop watering
              </Button>
            ) : (
              <>
                <SliderInput label="Duration" value={runMinutes} onChange={setRunMinutes} min={1} max={popupZone.maxRuntimeMin || 120} />
                <Button
                  onClick={() =>
                    api
                      .post(`/zones/${popupZone.id}/run`, { minutes: runMinutes })
                      .then(() => setPopupZone(null))
                      .catch((e) => notifications.show({ message: e.message, color: 'red' }))
                  }
                >
                  Water now ({fmtDur(runMinutes)})
                </Button>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
