import { Button, Chip } from '@/components/ui/primitives';
import { Checkbox } from '@/components/ui/toggle';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/cn';
import type { ChecklistItem } from '@/data/types';

export interface ChecklistRowProps {
  item: ChecklistItem;
  certCode: string;
  overdue: boolean;
  busy: boolean;
  onDone: () => void;
}

/**
 * §7.9 — fila del bloque 2: checkbox, título, chip de certificación, fecha
 * límite y acción rápida "hecho". El check y el botón llaman a `completeItem`
 * (§8.9), que además crea la siguiente instancia si el ítem es recurrente y no
 * existe ya una pendiente igual.
 */
export function ChecklistRow({ item, certCode, overdue, busy, onDone }: ChecklistRowProps) {
  const { t, f } = useT();
  const doneLabel = t('today.checklist.doneButton', { title: item.title });

  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-line px-3 py-3 last:border-b-0 sm:px-4">
      <Checkbox
        checked={item.done}
        disabled={busy}
        onCheckedChange={(checked) => {
          if (checked) onDone();
        }}
        label={t('today.checklist.checkbox', { title: item.title })}
        className="mt-1"
      />

      <div className="min-w-0 flex-1">
        <p className="break-words text-body leading-snug">{item.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Chip className="text-accent">{certCode}</Chip>
          {item.recurrence === 'ninguna' ? null : (
            <Chip>{t(`enum.recurrence.${item.recurrence}` as 'enum.recurrence.semanal')}</Chip>
          )}
          <span className={cn('text-meta', overdue ? 'text-warn' : 'text-muted')}>
            {overdue ? <span aria-hidden="true">▲ </span> : null}
            {item.dueDate === null
              ? t('today.checklist.noDate')
              : t('today.checklist.due', { date: f.date(item.dueDate) })}
          </span>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={onDone}
        disabled={busy}
        aria-label={doneLabel}
        title={doneLabel}
        className="min-h-[36px] max-[430px]:w-full"
      >
        <span aria-hidden="true" className="text-ok">
          ✓
        </span>
        {t('action.markDone')}
      </Button>
    </li>
  );
}
