import { Ellipsis } from 'lucide-react';
import { Badge, Button, Chip } from '@/components/ui/primitives';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import type { ReminderView } from '../model';
import { productStamp } from '../model';

export interface ReminderRowProps {
  view: ReminderView;
  /** Hay una escritura en curso para esta fila. */
  busy: boolean;
  onDone: () => void;
  onSnooze: (days: number) => void;
  onDiscard: () => void;
}

const STATUS_TONES: Record<string, 'neutral' | 'ok' | 'warn' | 'accent'> = {
  pendiente: 'neutral',
  enviado: 'accent',
  pospuesto: 'warn',
};

const SNOOZE_DAYS = [1, 3, 7];
const SNOOZE_KEYS: Record<number, TKey> = {
  1: 'action.snooze1',
  3: 'action.snooze3',
  7: 'action.snooze7',
};

/** Una fila de la bandeja (§7.13): tipo, fecha, origen y acciones. */
export function ReminderRow({ view, busy, onDone, onSnooze, onDiscard }: ReminderRowProps) {
  const { t, f } = useT();
  const { reminder, persisted } = view;
  const snoozed = reminder.status === 'pospuesto' ? reminder.snoozedUntil : null;
  const due = productStamp(reminder.dueAt);
  const snoozedAt = productStamp(snoozed);
  const stamp = (value: { date: string; time: string } | null, fallback: string): string =>
    value === null ? fallback : `${f.date(value.date)} ${value.time}`;

  return (
    <li className="rounded-card border border-line bg-panel px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-ui font-medium text-text">{reminder.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-muted">
            <Chip>{t(`enum.reminder.${reminder.type}` as TKey)}</Chip>
            <Badge tone={STATUS_TONES[reminder.status] ?? 'neutral'}>
              {t(`enum.reminderStatus.${reminder.status}` as TKey)}
            </Badge>
            <span className="tnum">{t('reminders.due', { date: stamp(due, reminder.dueAt) })}</span>
            {snoozed ? (
              <span className="tnum text-warn">
                <span aria-hidden="true">▲ </span>
                {t('reminders.snoozedUntil', { date: stamp(snoozedAt, snoozed) })}
              </span>
            ) : null}
            <span className="text-muted">
              {persisted ? t('reminders.origin.stored') : t('reminders.origin.generated')}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onDone}
            disabled={busy}
            aria-label={t('reminders.done.done', { title: reminder.title })}
            className="min-h-11 md:min-h-8"
          >
            {t('reminders.action.done')}
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                disabled={busy}
                aria-label={t('reminders.menu.label', { title: reminder.title })}
                className="flex h-11 w-11 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text disabled:opacity-45"
              >
                <Ellipsis size={16} aria-hidden="true" />
              </button>
            </MenuTrigger>
            <MenuContent ariaLabel={t('reminders.menu.label', { title: reminder.title })}>
              <MenuLabel>{t('reminders.action.snooze')}</MenuLabel>
              {SNOOZE_DAYS.map((days) => (
                <MenuItem key={days} onSelect={() => onSnooze(days)}>
                  {t(SNOOZE_KEYS[days] ?? 'action.snooze')}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem danger onSelect={onDiscard}>
                {t('reminders.action.discard')}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </li>
  );
}
