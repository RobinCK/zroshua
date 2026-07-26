import { Badge, Card, Group, Select, Stack, Table, Text, Title } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useJournal, useResource } from '../hooks';
import { Group as ZGroup, Zone } from '../api';
import { t as T, locale } from '../i18n';

const KIND_COLORS: Record<string, string> = {
  run_start: 'teal',
  run_end: 'blue',
  skip: 'yellow',
  fault: 'red',
  info: 'gray',
  adjust: 'grape',
};

const KIND_LABELS: Record<string, string> = {
  run_start: 'Run started',
  run_end: 'Run ended',
  skip: 'Skipped',
  fault: 'Fault',
  info: 'Info',
  adjust: 'Adjustment',
};

export default function JournalPage({ tick }: { tick: number }) {
  const entries = useJournal(tick);
  const { data: zones } = useResource<Zone[]>('/zones');
  const { data: groups } = useResource<ZGroup[]>('/groups');
  const [kind, setKind] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);

  // friendly-name lookup for the Target column
  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const z of zones ?? []) m.set(`zone:${z.id}`, z.name);
    for (const g of groups ?? []) m.set(`group:${g.id}`, g.name);
    return m;
  }, [zones, groups]);

  // target options grouped into Zones / Groups so it is clear which is which
  const targetData = useMemo(
    () => [
      { group: T('Zones'), items: (zones ?? []).map((z) => ({ value: `zone:${z.id}`, label: z.name })) },
      { group: T('Groups'), items: (groups ?? []).map((g) => ({ value: `group:${g.id}`, label: g.name })) },
    ],
    [zones, groups],
  );

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        if (kind && e.kind !== kind) return false;
        if (target) {
          const [t, id] = target.split(':');
          if (t === 'zone' && e.zoneId !== id) return false;
          if (t === 'group' && e.groupId !== id) return false;
        }
        return true;
      }),
    [entries, kind, target],
  );

  const targetCell = (e: (typeof entries)[number]) => {
    if (e.zoneId) return { label: nameOf.get(`zone:${e.zoneId}`) ?? e.zoneId, tag: 'zone', color: 'blue' };
    if (e.groupId) return { label: nameOf.get(`group:${e.groupId}`) ?? e.groupId, tag: 'group', color: 'teal' };
    return null;
  };

  return (
    <Stack>
      <Title order={3}>{T('Journal')}</Title>
      <Group gap="xs" grow wrap="wrap">
        <Select
          label={T('Event')}
          placeholder={T('All events')}
          data={Object.keys(KIND_COLORS).map((k) => ({ value: k, label: T(KIND_LABELS[k] ?? k) }))}
          value={kind}
          onChange={setKind}
          clearable
        />
        <Select
          label={T('Zone or group')}
          placeholder={T('All targets')}
          data={targetData}
          value={target}
          onChange={setTarget}
          searchable
          clearable
        />
      </Group>

      {/* desktop: table */}
      <Card withBorder p={0} visibleFrom="sm">
        <Table.ScrollContainer minWidth={520}>
          <Table striped highlightOnHover stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{T('Time')}</Table.Th>
                <Table.Th>{T('Event')}</Table.Th>
                <Table.Th>{T('Target')}</Table.Th>
                <Table.Th>{T('Details')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((e) => {
                const tgt = targetCell(e);
                return (
                  <Table.Tr key={e.id}>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      <Text size="xs" c="dimmed">
                        {new Date(Number(e.ts)).toLocaleString(locale)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={KIND_COLORS[e.kind] ?? 'gray'}>
                        {T(KIND_LABELS[e.kind] ?? e.kind)}
                        {e.code ? `: ${e.code}` : ''}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {tgt ? (
                        <Group gap={6} wrap="nowrap">
                          <Badge size="xs" variant="dot" color={tgt.color}>
                            {T(tgt.tag)}
                          </Badge>
                          <Text size="sm">{tgt.label}</Text>
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 380 }}>
                      <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
                        {e.detail}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      {/* mobile: stacked cards */}
      <Stack gap="xs" hiddenFrom="sm">
        {filtered.map((e) => {
          const tgt = targetCell(e);
          return (
            <Card key={e.id} withBorder p="sm">
              <Group justify="space-between" wrap="nowrap" mb={4}>
                <Badge size="sm" variant="light" color={KIND_COLORS[e.kind] ?? 'gray'}>
                  {T(KIND_LABELS[e.kind] ?? e.kind)}
                  {e.code ? `: ${e.code}` : ''}
                </Badge>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(Number(e.ts)).toLocaleString(locale)}
                </Text>
              </Group>
              {tgt && (
                <Group gap={6} mb={2}>
                  <Badge size="xs" variant="dot" color={tgt.color}>
                    {T(tgt.tag)}
                  </Badge>
                  <Text size="sm" fw={500}>
                    {tgt.label}
                  </Text>
                </Group>
              )}
              {e.detail && (
                <Text size="sm" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
                  {e.detail}
                </Text>
              )}
            </Card>
          );
        })}
      </Stack>

      {!filtered.length && <Text c="dimmed">{T('No matching journal entries.')}</Text>}
    </Stack>
  );
}
