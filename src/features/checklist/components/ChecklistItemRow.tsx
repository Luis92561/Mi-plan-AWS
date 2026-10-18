import { ArchiveRestore, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Chip } from '@/components/ui/primitives';
import { Checkbox } from '@/components/ui/toggle';
import type { ChecklistItem } from '@/data/types';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/useT';
import { isOverdue } from '../model';

export interface ChecklistItemRowProps {
  item: ChecklistItem;
  /** `YYYY-MM-DD` local, para marcar vencidos. */
  today: string;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  onUnarchive: () => void;
}

function RowButton({
  label,
  title,
  disabled,
  onClick,
  children,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-11 w-11 place-items-center rounded-input text-muted',
        'transition-colors duration-hover hover:bg-hover hover:text-text',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}

/**
 * §7.10 — fila del checklist: checkbox accesible, título, chip de repetición,
 * fecha `📅 YYYY-MM-DD` (compatible con Tasks de Obsidian) y acciones de fila.
 * En móvil las acciones bajan a su propia línea: nada se corta a 360 px.
 */
export function ChecklistItemRow({
  item,
  today,
  busy,
  canMoveUp,
  canMoveDown,
  onToggle,
  onMove,
  onEdit,
  onDelete,
  onUnarchive,
}: ChecklistItemRowProps) {
  const { t, f } = useT();
  const overdue = isOverdue(item, today);

  return (
    <li className="flex flex-col gap-1 border-b border-line px-3 py-2.5 last:border-b-0 sm:flex-row sm:items-start sm:gap-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Checkbox
          checked={item.done}
          disabled={busy}
          onCheckedChange={(checked) => {
            if (checked !== item.done) onToggle();
          }}
          label={t('checklist.checkbox', { title: item.title })}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <p className={cn('break-words text-ui text-text', item.done && 'text-muted line-through')}>
            {item.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta">
            {item.dueDate ? (
              <span
                className={cn('tnum', overdue ? 'text-warn' : 'text-muted')}
                title={t('checklist.dueTitle', { date: item.dueDate })}
              >
                {overdue ? (
                  <span aria-hidden="true">▲ </span>
                ) : null}
                {t('checklist.dueTasks', { date: item.dueDate })}
                {overdue ? <span className="ml-1.5">{t('checklist.overdue')}</span> : null}
              </span>
            ) : null}
            {item.recurrence === 'ninguna' ? null : (
              <Chip>{t(`enum.recurrence.${item.recurrence}`)}</Chip>
            )}
            {item.archived ? <Chip>{t('checklist.archived')}</Chip> : null}
            {item.done && item.doneAt ? (
              <span className="text-muted">{t('checklist.doneAt', { date: f.date(item.doneAt) })}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-0.5 self-end sm:self-start">
        {item.archived ? (
          <>
            <RowButton
              label={t('checklist.unarchive', { title: item.title })}
              title={t('action.unarchive')}
              disabled={busy}
              onClick={onUnarchive}
            >
              <ArchiveRestore size={16} aria-hidden="true" />
            </RowButton>
            <RowButton
              label={t('checklist.delete', { title: item.title })}
              title={t('common.delete')}
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 size={16} aria-hidden="true" />
            </RowButton>
          </>
        ) : (
          <>
            <RowButton
              label={t('checklist.moveUp', { title: item.title })}
              title={t('checklist.moveUp', { title: item.title })}
              disabled={busy || !canMoveUp}
              onClick={() => onMove(-1)}
            >
              <ChevronUp size={16} aria-hidden="true" />
            </RowButton>
            <RowButton
              label={t('checklist.moveDown', { title: item.title })}
              title={t('checklist.moveDown', { title: item.title })}
              disabled={busy || !canMoveDown}
              onClick={() => onMove(1)}
            >
              <ChevronDown size={16} aria-hidden="true" />
            </RowButton>
            <RowButton
              label={t('checklist.edit', { title: item.title })}
              title={t('common.edit')}
              disabled={busy}
              onClick={onEdit}
            >
              <Pencil size={16} aria-hidden="true" />
            </RowButton>
            <RowButton
              label={t('checklist.delete', { title: item.title })}
              title={t('common.delete')}
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 size={16} aria-hidden="true" />
            </RowButton>
          </>
        )}
      </div>
    </li>
  );
}
