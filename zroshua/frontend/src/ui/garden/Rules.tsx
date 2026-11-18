import type { ReactNode } from 'react';
import { IconBan, IconX } from '@tabler/icons-react';
import { CountBadge, EmptyNote, LinedList, LinedRow, Panel, PanelHeader } from '../kit';
import { t } from '../../i18n';
import { ModeIcon } from './icons';
import type { RuleKind, RuleSectionView } from './types';
import s from './garden.module.css';

function KindIcon({ kind }: { kind: RuleKind }) {
  if (kind === 'mutex') return <IconBan size={16} stroke={2} aria-hidden="true" />;
  return <ModeIcon mode={kind === 'order' ? 'sequential' : 'parallel'} size={16} />;
}

/**
 * Rules between groups, one section per kind. A row is a group and the groups it is bound to,
 * so ten «never overlap» pairs read as two lines; every binding is a chip you can delete.
 */
export function RulesCard({
  sections,
  onDelete,
  children,
}: {
  sections: RuleSectionView[];
  onDelete: (ruleId: string) => void;
  /** the form that adds a rule */
  children?: ReactNode;
}) {
  return (
    <Panel pad="lg" aria-label={t('Rules between groups')}>
      <PanelHeader large level={2} title={t('Rules between groups')} />
      {sections.length === 0 && <EmptyNote>{t('No rules yet.')}</EmptyNote>}
      {sections.map((sec) => (
        <section key={sec.kind} className={s.ruleSec}>
          <div className={s.ruleHead}>
            <KindIcon kind={sec.kind} />
            <span className={s.ruleTitle}>{sec.title}</span>
            <CountBadge value={sec.count} />
          </div>
          <LinedList label={sec.title}>
            {sec.rows.map((r) => (
              <LinedRow key={r.key}>
                <div className={s.ruleRow}>
                  {r.lead && (
                    <span className={s.ruleLead}>
                      {r.lead}
                      {sec.kind === 'order' && <ModeIcon mode="sequential" size={16} />}
                    </span>
                  )}
                  <div className={s.ruleChips}>
                  {r.items.map((it) => (
                    <span key={it.ruleId} className={s.ruleChip}>
                      <span className={s.ruleChipText}>{it.label}</span>
                      <button
                        type="button"
                        className={s.ruleChipX}
                        aria-label={`${t('Delete')}: ${r.lead ? `${r.lead} · ` : ''}${it.label}`}
                        title={t('Delete')}
                        onClick={() => onDelete(it.ruleId)}
                      >
                        <IconX size={14} stroke={2} />
                      </button>
                    </span>
                  ))}
                  </div>
                </div>
              </LinedRow>
            ))}
          </LinedList>
        </section>
      ))}
      {children}
    </Panel>
  );
}
