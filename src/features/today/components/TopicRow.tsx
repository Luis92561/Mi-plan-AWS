import { EllipsisVertical } from 'lucide-react';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Button, Chip, StatusGlyph } from '@/components/ui/primitives';
import { Checkbox } from '@/components/ui/toggle';
import { useT } from '@/lib/i18n/useT';
import type { Topic } from '@/data/types';
import { StudyInlineForm, type StudyFormValues } from './StudyInlineForm';

/** Días que ofrece el menú `⋯` al posponer (§7.9). */
const SNOOZE_DAYS = [1, 3, 7] as const;

export interface TopicRowProps {
  topic: Topic;
  certCode: string;
  certName: string;
  domainName: string | null;
  /** Minutos estimados del tema (`settings`, recurso o 30). */
  minutes: number;
  overdue: boolean;
  /** El mini-registro en línea está abierto en esta fila. */
  recording: boolean;
  busy: boolean;
  onStartStudy: () => void;
  onCancelStudy: () => void;
  onSaveStudy: (values: StudyFormValues) => void;
  onSnooze: (days: number) => void;
  onOpenNote: () => void;
  onArchive: () => void;
}

/**
 * §7.9 — fila del bloque 1: checkbox de estado, título, chips de certificación y
 * dominio, minutos estimados y menú `⋯`. El menú está **siempre visible** (nunca
 * solo al hover) y el disparador mide 44 px para el pulgar.
 */
export function TopicRow({
  topic,
  certCode,
  certName,
  domainName,
  minutes,
  overdue,
  recording,
  busy,
  onStartStudy,
  onCancelStudy,
  onSaveStudy,
  onSnooze,
  onOpenNote,
  onArchive,
}: TopicRowProps) {
  const { t, f } = useT();
  const menuLabel = t('today.menu.label', { title: topic.title });

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-3 sm:px-4">
        <Checkbox
          checked={recording}
          disabled={busy}
          onCheckedChange={(checked) => {
            if (checked) onStartStudy();
            else onCancelStudy();
          }}
          label={t('today.study.checkbox', { title: topic.title })}
          className="mt-1"
        />

        <div className="min-w-0 flex-1">
          <p className="break-words text-body leading-snug">{topic.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Chip title={certName} className="text-accent">
              {certCode}
            </Chip>
            {domainName ? <Chip className="max-w-full whitespace-normal">{domainName}</Chip> : null}
            <span className="tnum text-meta text-muted">{f.minutes(minutes)}</span>
            {overdue ? <StatusGlyph state="alerta" label={t('today.overdue')} /> : null}
          </div>
        </div>

        <Menu>
          <MenuTrigger asChild>
            <Button
              variant="ghost"
              size="md"
              aria-label={menuLabel}
              title={menuLabel}
              className="h-11 w-11 shrink-0 p-0 text-muted hover:text-text"
            >
              <EllipsisVertical size={18} aria-hidden="true" />
            </Button>
          </MenuTrigger>
          <MenuContent align="end" ariaLabel={menuLabel}>
            <MenuItem onSelect={onStartStudy}>{t('action.study')}</MenuItem>
            <MenuSeparator />
            <MenuLabel>{t('action.snooze')}</MenuLabel>
            {SNOOZE_DAYS.map((days) => (
              <MenuItem key={days} onSelect={() => onSnooze(days)}>
                {t(`action.snooze${days}` as 'action.snooze1')}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem onSelect={onOpenNote}>{t('action.openNote')}</MenuItem>
            <MenuItem onSelect={onArchive} danger>
              {t('action.archive')}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {recording ? (
        <div className="px-3 pb-3 sm:px-4">
          <StudyInlineForm
            id={`today-study-${topic.id}`}
            title={topic.title}
            defaultMinutes={minutes}
            busy={busy}
            onCancel={onCancelStudy}
            onSave={onSaveStudy}
          />
        </div>
      ) : null}
    </li>
  );
}
