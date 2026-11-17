import { useState } from 'react';
import {
  IconAlertTriangle,
  IconBattery1,
  IconBulb,
  IconCircleCheck,
  IconCloudRain,
  IconWifiOff,
} from '@tabler/icons-react';
import {
  BarChart,
  CountBadge,
  EmptyChart,
  EmptyNote,
  IconChip,
  LineChart,
  ListRow,
  Metric,
  Panel,
  PanelHeader,
  Readout,
  RowList,
  StatRow,
} from '../kit';
import { t } from '../../i18n';
import { MeasureIcon } from './icons';
import type { ChartView, FindingView, UsageRowView } from './types';
import s from './garden.module.css';

/**
 * A measure over a period. The card says the total, the change against the previous period,
 * then lets you touch a bar (or the line) for its exact value; under it average, peak and
 * lowest instead of «Min 0 L 12:00 AM». Nothing measured yet is said in words.
 */
export function ChartCard({ chart }: { chart: ChartView }) {
  const [sel, setSel] = useState<number | null>(null);
  const c = chart;
  const readout = sel != null && c.readout ? c.readout(sel) : c.hint;
  return (
    <Panel fill aria-label={c.title}>
      <PanelHeader
        icon={
          <IconChip size={40} calm>
            <span style={{ color: c.color, display: 'flex' }}>
              <MeasureIcon kind={c.icon} />
            </span>
          </IconChip>
        }
        title={c.title}
        sub={c.period}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Metric value={c.total} unit={c.unit} aside={c.delta} />
        {c.kind !== 'empty' && <Readout active={sel != null}>{readout}</Readout>}
      </div>
      {c.kind === 'bars' && c.bars && (
        <BarChart
          data={c.bars}
          color={c.color}
          axisMax={c.axisMax ?? Math.max(1, ...c.bars.map((b) => b.value))}
          axisLabel={c.axisLabel}
          average={c.average}
          averageLabel={c.averageLabel}
          selected={sel}
          onSelect={setSel}
        />
      )}
      {c.kind === 'line' && c.points && (
        <LineChart
          points={c.points}
          color={c.color}
          max={c.lineMax ?? Math.max(1, ...c.points.map((p) => p.value ?? 0))}
          band={c.band}
          bandLabel={c.bandLabel}
          ticks={c.ticks}
          selected={sel}
          onSelect={setSel}
        />
      )}
      {c.kind === 'empty' && <EmptyChart title={c.empty?.title ?? t('No data yet')} text={c.empty?.text} />}
      <StatRow items={c.stats} cols={3} footer />
    </Panel>
  );
}

/** Where the water went: one bar per group (or zone), the share of the total next to it. */
export function UsageCard({ title, sub, rows }: { title: string; sub?: string; rows: UsageRowView[] }) {
  return (
    <Panel fill aria-label={title}>
      <PanelHeader title={title} sub={sub} />
      {rows.length === 0 ? (
        <EmptyNote>{t('No watering in this period.')}</EmptyNote>
      ) : (
        <div className={s.usage} role="list">
          {rows.map((r) => (
            <div key={r.key} className={s.usageRow} role="listitem">
              <div className={s.usageTop}>
                <span className={s.usageName}>{r.name}</span>
                <span>{r.value}</span>
                <span className={s.usageShare}>{r.share}</span>
              </div>
              <div className={s.usageTrack}>
                <div className={s.usageFill} style={{ width: `${Math.max(0, Math.min(100, r.pct))}%`, minWidth: r.pct > 0 ? 4 : 0 }} />
              </div>
              {r.note && <span className={s.detail}>{r.note}</span>}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const FINDING_ICONS = {
  warn: IconAlertTriangle,
  rain: IconCloudRain,
  idea: IconBulb,
  battery: IconBattery1,
  offline: IconWifiOff,
  ok: IconCircleCheck,
};

/**
 * Findings as rows: «Needs attention» (things Zroshua cannot fix itself) and «Insights»
 * (what the week says). Each row: what, why, what to do.
 */
export function FindingsCard({
  title,
  sub,
  items,
  counted,
  empty,
  onOpen,
}: {
  title: string;
  sub?: string;
  items: FindingView[];
  /** show the item count as a red badge (attention) */
  counted?: boolean;
  empty: string;
  onOpen?: (key: string) => void;
}) {
  return (
    <Panel fill aria-label={title}>
      <PanelHeader title={title} sub={sub} aside={counted && items.length > 0 ? <CountBadge value={items.length} state="fault" /> : undefined} />
      {items.length === 0 ? (
        <EmptyNote>{empty}</EmptyNote>
      ) : (
        <RowList label={title}>
          {items.map((f) => {
            const I = FINDING_ICONS[f.icon];
            return (
              <ListRow
                key={f.key}
                state={f.state}
                icon={
                  <IconChip state={f.state} size={32} calm={f.state === 'next'}>
                    <I size={18} stroke={1.9} />
                  </IconChip>
                }
                title={f.title}
                sub={f.sub}
                action={f.action}
                onClick={onOpen ? () => onOpen(f.key) : undefined}
              />
            );
          })}
        </RowList>
      )}
    </Panel>
  );
}
