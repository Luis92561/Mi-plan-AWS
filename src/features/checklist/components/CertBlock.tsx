import { Button, Card, CardBody, CardHead, Progress } from '@/components/ui/primitives';
import type { Certification, ChecklistItem } from '@/data/types';
import { checklistProgress, groupChecklist } from '@/domain/checklist';
import { useT } from '@/lib/i18n/useT';
import { ChecklistItemRow } from './ChecklistItemRow';
import { compareRows } from '../model';

export interface CertBlockProps {
  cert: Certification;
  /** Ítems visibles de esta certificación (archivados incluidos si se pidieron). */
  items: ChecklistItem[];
  today: string;
  busyId: string | null;
  onToggle: (item: ChecklistItem) => void;
  onMove: (item: ChecklistItem, direction: -1 | 1, visibleIds: string[]) => void;
  onEdit: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem) => void;
  onUnarchive: (item: ChecklistItem) => void;
  onRestore: (cert: Certification) => void;
  onDuplicate: (cert: Certification) => void;
}

/**
 * §7.10 — bloque de una certificación: progreso global (barra de 4 px y
 * "hechos/total", archivados excluidos) y sub-grupos fijos por `groupId`.
 */
export function CertBlock({
  cert,
  items,
  today,
  busyId,
  onToggle,
  onMove,
  onEdit,
  onDelete,
  onUnarchive,
  onRestore,
  onDuplicate,
}: CertBlockProps) {
  const { t } = useT();
  const progress = checklistProgress(items);
  const groups = groupChecklist(items);
  const archived = items.filter((item) => item.archived).sort(compareRows);
  const restoreBusy = busyId === `restore-${cert.id}`;
  const duplicateBusy = busyId === `duplicate-${cert.id}`;

  return (
    <Card>
      <CardHead className="flex-wrap">
        <div className="min-w-0">
          <h2 className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {cert.code}
          </h2>
          <p className="truncate text-meta text-muted">{cert.name}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="min-h-[44px]"
            disabled={restoreBusy}
            aria-label={t('checklist.restore.aria', { cert: cert.code })}
            onClick={() => onRestore(cert)}
          >
            {t('checklist.restore.action')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="min-h-[44px]"
            disabled={duplicateBusy}
            aria-label={t('checklist.duplicate.aria', { cert: cert.code })}
            onClick={() => onDuplicate(cert)}
          >
            {t('checklist.duplicate.action')}
          </Button>
        </div>
      </CardHead>

      <CardBody className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="label-mono">{t('common.progress')}</span>
          <span className="tnum text-meta text-text">
            {t('checklist.progress', { done: progress.done, total: progress.total })}
          </span>
        </div>
        <Progress
          value={progress.done}
          max={Math.max(1, progress.total)}
          label={t('checklist.progress.aria', {
            cert: cert.code,
            done: progress.done,
            total: progress.total,
          })}
        />
      </CardBody>

      {groups.map((group) => {
        const done = group.items.filter((item) => item.done).length;
        const visibleIds = group.items.map((item) => item.id);
        return (
          <section
            key={group.groupId}
            aria-label={`${cert.code} · ${t(`enum.group.${group.groupId}`)}`}
            className="border-t border-line"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 pt-2.5 sm:px-4">
              <h3 className="label-mono">{t(`enum.group.${group.groupId}`)}</h3>
              <span className="tnum text-meta text-muted">
                {t('checklist.group.progress', { done, total: group.items.length })}
              </span>
            </div>
            <ul className="mt-1">
              {group.items.map((item, index) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  today={today}
                  busy={busyId === item.id}
                  canMoveUp={index > 0}
                  canMoveDown={index < group.items.length - 1}
                  onToggle={() => onToggle(item)}
                  onMove={(direction) => onMove(item, direction, visibleIds)}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                  onUnarchive={() => onUnarchive(item)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {archived.length > 0 ? (
        <section
          aria-label={`${cert.code} · ${t('checklist.archivedHeading')}`}
          className="border-t border-line"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 pt-2.5 sm:px-4">
            <h3 className="label-mono">{t('checklist.archivedHeading')}</h3>
            <span className="tnum text-meta text-muted">
              {t('checklist.count', { count: archived.length })}
            </span>
          </div>
          <ul className="mt-1">
            {archived.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                today={today}
                busy={busyId === item.id}
                canMoveUp={false}
                canMoveDown={false}
                onToggle={() => onToggle(item)}
                onMove={() => undefined}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
                onUnarchive={() => onUnarchive(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </Card>
  );
}
