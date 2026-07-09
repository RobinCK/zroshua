import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, FileButton, Group, Modal, Select, Stack, Text, Title, Badge } from '@mantine/core';
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
const ASSIGN_SELECTED = '#12b886'; // shape belongs to the zone being edited
const ASSIGN_OTHER = '#7048e8'; // shape belongs to a different zone
const ASSIGN_FREE = '#adb5bd'; // shape not assigned to any zone

/** Elements that make up a zone: new array field, falling back to the legacy single id. */
function elementsOf(z: Zone): string[] {
  if (z.svgElementIds && z.svgElementIds.length) return z.svgElementIds;
  return z.svgElementId ? [z.svgElementId] : [];
}

export default function MapPage({ state }: { state: EngineState | null }) {
  const { data: map, reload } = useResource<{ svg: string | null; ids: { id: string; label: string | null }[] }>('/map');
  const { data: zones, reload: reloadZones } = useResource<Zone[]>('/zones');
  const containerRef = useRef<HTMLDivElement>(null);
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
      svg.style.maxHeight = '75vh';
    }
    for (const { id } of map.ids) {
      const node = el.querySelector<SVGElement>(`#${CSS.escape(id)}`);
      if (!node) continue;
      const zone = zoneByElement.get(id);
      node.style.cursor = 'pointer';
      node.style.transition = 'fill-opacity 0.3s';
      node.style.outline = '';
      node.style.animation = '';

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
        const st = stateOfZone(zone);
        node.style.fill = STATE_COLORS[st];
        node.style.fillOpacity = st === 'watering' ? '0.85' : '0.5';
        if (st === 'watering') node.style.animation = 'zroshua-pulse 1.5s ease-in-out infinite';
      } else {
        // unassigned shape in view mode: keep the plan's original look
        node.style.fill = '';
        node.style.fillOpacity = '';
      }

      node.onclick = (e) => {
        e.stopPropagation();
        if (assignMode) void toggleElement(id);
        else if (zone) {
          setPopupZone(zone);
          setRunMinutes(Math.round(zone.baseDurationMin));
        }
      };
    }
  }, [map, zoneByElement, assignSet, state, assignMode]);

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
      <style>{`@keyframes zroshua-pulse { 0%,100% { fill-opacity: 0.85; } 50% { fill-opacity: 0.35; } }`}</style>
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
          <div ref={containerRef} />
          {!assignMode && (
            <Group mt="sm" gap="xs">
              {Object.entries(STATE_COLORS).map(([k, c]) => (
                <Badge key={k} variant="light" style={{ backgroundColor: `${c}33`, color: c }}>
                  {k}
                </Badge>
              ))}
            </Group>
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
