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

export default function MapPage({ state }: { state: EngineState | null }) {
  const { data: map, reload } = useResource<{ svg: string | null; ids: { id: string; label: string | null }[] }>('/map');
  const { data: zones, reload: reloadZones } = useResource<Zone[]>('/zones');
  const containerRef = useRef<HTMLDivElement>(null);
  const [assignMode, setAssignMode] = useState(false);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [popupZone, setPopupZone] = useState<Zone | null>(null);
  const [runMinutes, setRunMinutes] = useState(15);
  const [nextRun, setNextRun] = useState<string | null>(null);

  const zoneBySvgId = useMemo(() => {
    const m = new Map<string, Zone>();
    for (const z of zones ?? []) if (z.svgElementId) m.set(z.svgElementId, z);
    return m;
  }, [zones]);

  const stateOfZone = (z: Zone): keyof typeof STATE_COLORS => {
    if (!z.enabled) return 'disabled';
    if (state?.faults.includes(z.id)) return 'fault';
    if (state?.active.some((a) => a.zoneId === z.id)) return 'watering';
    if (state?.queue.some((q) => q.zoneId === z.id)) return 'queued';
    return 'idle';
  };

  // paint + wire clicks whenever svg/zones/state change
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
      const zone = zoneBySvgId.get(id);
      node.style.cursor = 'pointer';
      node.style.transition = 'fill-opacity 0.3s';
      if (zone) {
        const st = stateOfZone(zone);
        node.style.fill = STATE_COLORS[st];
        node.style.fillOpacity = st === 'watering' ? '0.85' : '0.5';
        if (st === 'watering') node.style.animation = 'zroshua-pulse 1.5s ease-in-out infinite';
        else node.style.animation = '';
      } else {
        node.style.fillOpacity = assignMode ? '0.35' : '';
        node.style.fill = assignMode ? '#adb5bd' : '';
      }
      node.onclick = (e) => {
        e.stopPropagation();
        if (assignMode) setClickedId(id);
        else if (zone) {
          setPopupZone(zone);
          setRunMinutes(Math.round(zone.baseDurationMin));
        }
      };
    }
  }, [map, zoneBySvgId, state, assignMode]);

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

  const assign = async (zoneId: string | null) => {
    if (!clickedId) return;
    try {
      const prev = (zones ?? []).find((z) => z.svgElementId === clickedId);
      if (prev && prev.id !== zoneId) await api.put(`/zones/${prev.id}`, { ...prev, svgElementId: null });
      if (zoneId) {
        const zone = (zones ?? []).find((z) => z.id === zoneId)!;
        await api.put(`/zones/${zoneId}`, { ...zone, svgElementId: clickedId });
      }
      setClickedId(null);
      reloadZones();
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' });
    }
  };

  const popupState = popupZone ? stateOfZone(popupZone) : 'idle';

  return (
    <Stack>
      <style>{`@keyframes zroshua-pulse { 0%,100% { fill-opacity: 0.85; } 50% { fill-opacity: 0.35; } }`}</style>
      <Group justify="space-between">
        <Title order={3}>Site map</Title>
        <Group>
          <Button variant={assignMode ? 'filled' : 'light'} onClick={() => setAssignMode((v) => !v)} disabled={!map?.svg}>
            {assignMode ? 'Done assigning' : 'Assign zones'}
          </Button>
          <FileButton onChange={upload} accept="image/svg+xml">
            {(props) => <Button {...props}>Upload SVG plan</Button>}
          </FileButton>
        </Group>
      </Group>

      {map?.svg ? (
        <Card withBorder>
          {assignMode && (
            <Text size="sm" c="dimmed" mb="xs">
              Tap a polygon on the plan, then pick the zone it represents.
            </Text>
          )}
          <div ref={containerRef} />
          <Group mt="sm" gap="xs">
            {Object.entries(STATE_COLORS).map(([k, c]) => (
              <Badge key={k} variant="light" style={{ backgroundColor: `${c}33`, color: c }}>
                {k}
              </Badge>
            ))}
          </Group>
        </Card>
      ) : (
        <Card withBorder>
          <Text c="dimmed">
            Upload an SVG plan of your property. Draw it in Inkscape or Figma — every irrigation zone should be a
            separate path/polygon. Then use “Assign zones” to link polygons to zones by tapping them; Zroshua will
            color them by live state.
          </Text>
        </Card>
      )}

      <Modal opened={!!clickedId} onClose={() => setClickedId(null)} title={`Polygon: ${clickedId}`}>
        <Stack>
          <Select
            label="Zone for this polygon"
            data={(zones ?? []).map((z) => ({ value: z.id, label: z.name }))}
            defaultValue={zoneBySvgId.get(clickedId ?? '')?.id ?? null}
            onChange={(v) => assign(v)}
            clearable
            searchable
          />
          <Button variant="light" color="red" onClick={() => assign(null)}>
            Unassign
          </Button>
        </Stack>
      </Modal>

      <Modal opened={!!popupZone} onClose={() => setPopupZone(null)} title={popupZone?.name}>
        {popupZone && (
          <Stack>
            <Group gap="xs">
              <Badge style={{ backgroundColor: STATE_COLORS[popupState] }}>{popupState}</Badge>
              {nextRun && <Text size="sm" c="dimmed">next: {nextRun}</Text>}
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
