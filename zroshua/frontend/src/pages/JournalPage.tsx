import { Badge, Card, Group, Select, Stack, Table, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useJournal } from '../hooks';

const KIND_COLORS: Record<string, string> = {
  run_start: 'teal',
  run_end: 'blue',
  skip: 'yellow',
  fault: 'red',
  info: 'gray',
  adjust: 'grape',
};

export default function JournalPage({ tick }: { tick: number }) {
  const entries = useJournal(tick);
  const [filter, setFilter] = useState<string | null>(null);
  const filtered = filter ? entries.filter((e) => e.kind === filter) : entries;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Journal</Title>
        <Select
          placeholder="All events"
          data={Object.keys(KIND_COLORS)}
          value={filter}
          onChange={setFilter}
          clearable
          w={180}
        />
      </Group>
      <Card withBorder p={0}>
        <Table.ScrollContainer minWidth={500}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Time</Table.Th>
                <Table.Th>Event</Table.Th>
                <Table.Th>Target</Table.Th>
                <Table.Th>Details</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((e) => (
                <Table.Tr key={e.id}>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {new Date(Number(e.ts)).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light" color={KIND_COLORS[e.kind] ?? 'gray'}>
                      {e.kind}
                      {e.code ? `: ${e.code}` : ''}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{e.zoneId ?? e.groupId ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td style={{ maxWidth: 380 }}>
                    <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
                      {e.detail}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
