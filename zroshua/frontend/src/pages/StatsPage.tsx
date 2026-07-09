import { useState } from 'react';
import { BarChart } from '@mantine/charts';
import { Button, Card, Group, SegmentedControl, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useResource } from '../hooks';

interface Daily {
  days: { day: string; minutes: number; litersMin: number; litersMax: number; energyKwh: number; tailKwh: number }[];
  totals: { minutes: number; litersMin: number; litersMax: number; energyKwh: number; tailKwh: number };
  tariff: number | null;
  currency: string | null;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={700}>
        {value}
      </Text>
    </Card>
  );
}

export default function StatsPage() {
  const [days, setDays] = useState('30');
  const { data } = useResource<Daily>(`/stats/daily?days=${days}`, [days]);

  const liters = (min: number, max: number) =>
    min === max ? `${Math.round(min)} L` : `${Math.round(min)}–${Math.round(max)} L`;

  const chartData = (data?.days ?? []).map((d) => ({
    day: d.day.slice(5),
    liters: Math.round((d.litersMin + d.litersMax) / 2),
    minutes: Math.round(d.minutes),
    kWh: Number((d.energyKwh + d.tailKwh).toFixed(2)),
  }));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Statistics</Title>
        <Group>
          <SegmentedControl
            data={[
              { value: '7', label: 'Week' },
              { value: '30', label: 'Month' },
              { value: '90', label: 'Season' },
            ]}
            value={days}
            onChange={setDays}
          />
          <Button component="a" href={`./api/stats/export.csv?days=${days}`} variant="light">
            Export CSV
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <StatTile label="Water (calculated)" value={data ? liters(data.totals.litersMin, data.totals.litersMax) : '—'} />
        <StatTile label="Watering time" value={data ? `${Math.round(data.totals.minutes)} min` : '—'} />
        <StatTile
          label="Pump energy"
          value={data ? `${(data.totals.energyKwh + data.totals.tailKwh).toFixed(1)} kWh` : '—'}
        />
        <StatTile
          label={data?.tariff ? 'Cost' : 'Refill tail energy'}
          value={
            data
              ? data.tariff
                ? `${((data.totals.energyKwh + data.totals.tailKwh) * data.tariff).toFixed(0)} ${data.currency ?? ''}`.trim()
                : `${data.totals.tailKwh.toFixed(1)} kWh`
              : '—'
          }
        />
      </SimpleGrid>

      <Card withBorder>
        <Title order={5} mb="sm">
          Liters per day (average of range)
        </Title>
        <BarChart h={220} data={chartData} dataKey="day" series={[{ name: 'liters', color: 'blue.6' }]} />
      </Card>
      <Card withBorder>
        <Title order={5} mb="sm">
          Minutes per day
        </Title>
        <BarChart h={220} data={chartData} dataKey="day" series={[{ name: 'minutes', color: 'teal.6' }]} />
      </Card>
      <Card withBorder>
        <Title order={5} mb="sm">
          Pump energy per day (incl. refill tail)
        </Title>
        <BarChart h={220} data={chartData} dataKey="day" series={[{ name: 'kWh', color: 'grape.6' }]} />
      </Card>
    </Stack>
  );
}
