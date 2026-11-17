import { useState } from 'react';
import { IconDownload } from '@tabler/icons-react';
import type { EngineState, WaterSource } from '../api';
import { useResource } from '../hooks';
import { t } from '../i18n';
import { CardGrid, ChoiceChips, UiButton } from '../ui/kit';
import { ChartCard, FindingsCard, UsageCard } from '../ui/garden';
import { TOKENS } from '../ui/tokens';
import { useComputedColorScheme } from '@mantine/core';
import { chartViews, findingView, lineChartView, type GardenData } from '../view/garden';
import { liters } from '../view/format';
import type { DayStat, Insights } from '../view/live';
import s from './layout.module.css';

const PERIODS = [
  { key: 7, label: 'Week' },
  { key: 30, label: 'Month' },
  { key: 90, label: 'Season' },
] as const;

/**
 * Statistics: one period control for the whole page, then the measures as chart cards (tap a
 * bar for its day), where the water went and what the period says. The same chart cards are
 * the Lovelace «chart» view.
 */
export default function StatsPage({ state }: { state: EngineState | null }) {
  const [n, setN] = useState<number>(7);
  const scheme = useComputedColorScheme('dark');
  const series = TOKENS[scheme].series;
  const { data: days } = useResource<DayStat[]>(`/stats/days?days=${n * 2}`, [n]);
  const { data: insights } = useResource<Insights>(`/insights?days=${n}`, [n]);
  const { data: sources } = useResource<WaterSource[]>('/sources');
  const pressureSrc = (sources ?? []).find((x) => x.pressureEntity);
  const { data: pressure } = useResource<{ ts: number; v: number }[]>(
    pressureSrc ? `/ha/history?entity=${encodeURIComponent(pressureSrc.pressureEntity!)}&hours=6` : '/health',
    [pressureSrc?.pressureEntity],
  );
  const now = state?.now ?? Date.now();
  const garden = { days: days ?? [], insights: insights ?? null } as GardenData;
  const charts = chartViews(garden, series, n);
  const usage = (insights?.usage ?? []).map((u) => ({
    key: u.groupId,
    name: u.name,
    value: u.liters ? liters(u.liters) : '—',
    share: u.liters && insights?.totalLiters ? `${Math.round((u.liters / insights.totalLiters) * 100)}%` : '',
    pct: (u.liters / Math.max(1, ...(insights?.usage ?? []).map((x) => x.liters))) * 100,
    note: u.liters ? t('{count} runs', { count: u.runs }) : t('not watered in this period'),
  }));
  const findings = (insights?.findings ?? []).map((f, i) => findingView(f, i, now));

  return (
    <div className={s.page}>
      <div className={s.head}>
        <h1 className={s.title}>{t('Statistics')}</h1>
        <div className={s.right} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ChoiceChips label={t('Period')} options={PERIODS.map((p) => ({ key: p.key, label: t(p.label) }))} value={n} onChange={setN} />
          <UiButton size="sm" variant="outline" icon={<IconDownload size={15} />} onClick={() => window.open(`./api/stats/export.csv?days=${Math.max(n, 30)}`, '_blank')}>
            {t('Export CSV')}
          </UiButton>
        </div>
      </div>

      <CardGrid min={340}>
        {charts.map((c) => (
          <ChartCard key={c.key} chart={c} />
        ))}
      </CardGrid>

      <CardGrid min={340}>
        <FindingsCard title={t('Insights')} sub={n === 7 ? t('Last 7 days') : t('Last {n} days', { n })} items={findings} empty={t('Nothing unusual in this period.')} />
        <UsageCard title={t('Water by group')} sub={insights ? `${n === 7 ? t('Last 7 days') : t('Last {n} days', { n })} · ${liters(insights.totalLiters)}` : undefined} rows={usage} />
        {pressureSrc && Array.isArray(pressure) && (
          <ChartCard
            chart={lineChartView({
              key: 'pressure',
              title: t('Pressure · {name}', { name: pressureSrc.name }),
              period: t('Last 6 hours · every 15 min'),
              unit: 'bar',
              color: 'var(--ui-text-neutral-strong)',
              points: pressure,
              hours: 6,
              now,
              target: pressureSrc.pressureTargetBar,
            })}
          />
        )}
      </CardGrid>
    </div>
  );
}
