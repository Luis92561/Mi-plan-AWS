import { Bold, Code, Heading2, Link2, List, ListChecks, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import type { MarkdownFormat } from '../model';

interface FormatAction {
  format: MarkdownFormat;
  labelKey: TKey;
  icon: LucideIcon;
}

/** Las seis marcas de la barra mínima (§7.11): sin toolbar gigante. */
const ACTIONS: FormatAction[] = [
  { format: 'bold', labelKey: 'notes.format.bold', icon: Bold },
  { format: 'code', labelKey: 'notes.format.code', icon: Code },
  { format: 'list', labelKey: 'notes.format.list', icon: List },
  { format: 'checklist', labelKey: 'notes.format.checklist', icon: ListChecks },
  { format: 'link', labelKey: 'notes.format.link', icon: Link2 },
  { format: 'heading2', labelKey: 'notes.format.heading', icon: Heading2 },
];

/**
 * Barra de formato: inserta sintaxis en la selección del `textarea`.
 * En móvil cada botón mide 44 px; en desktop vuelve a 32 px.
 */
export function FormatBar({ onFormat }: { onFormat: (format: MarkdownFormat) => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-1">
      <div role="toolbar" aria-label={t('notes.format.label')} className="flex flex-wrap items-center gap-1">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.format}
              variant="ghost"
              size="sm"
              onClick={() => onFormat(action.format)}
              aria-label={t(action.labelKey)}
              title={t(action.labelKey)}
              className="min-h-11 min-w-11 md:min-h-8 md:min-w-0"
            >
              <Icon size={15} aria-hidden="true" />
            </Button>
          );
        })}
      </div>
      <p className="text-meta text-muted">{t('notes.format.hint')}</p>
    </div>
  );
}
