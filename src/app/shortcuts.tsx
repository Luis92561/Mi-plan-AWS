import { Modal } from '@/components/ui/modal';
import { useT } from '@/lib/i18n/useT';

interface Row {
  keys: string[];
  labelKey:
    | 'common.shortcuts.openPalette'
    | 'common.shortcuts.openHelp'
    | 'common.shortcuts.theme'
    | 'common.shortcuts.locale'
    | 'common.shortcuts.saveNote'
    | 'common.shortcuts.bold';
}

const ROWS: Row[] = [
  { keys: ['Ctrl', 'K'], labelKey: 'common.shortcuts.openPalette' },
  { keys: ['?'], labelKey: 'common.shortcuts.openHelp' },
  { keys: ['Alt', 'T'], labelKey: 'common.shortcuts.theme' },
  { keys: ['Alt', 'L'], labelKey: 'common.shortcuts.locale' },
  { keys: ['Ctrl', 'S'], labelKey: 'common.shortcuts.saveNote' },
  { keys: ['Ctrl', 'B'], labelKey: 'common.shortcuts.bold' },
];

/** Hoja de atajos (Â§9.5): se abre con `?` o desde la paleta de comandos. */
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useT();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('common.shortcuts.title')}
      description={t('common.shortcuts.intro')}
      closeLabel={t('common.close')}
    >
      <table className="ledger w-full">
        <caption className="sr-only">{t('common.shortcuts.title')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('common.shortcuts.keysColumn')}</th>
            <th scope="col">{t('common.shortcuts.actionColumn')}</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.labelKey}>
              <td className="whitespace-nowrap">
                <span className="flex flex-wrap items-center gap-1">
                  {row.keys.map((key) => (
                    <kbd
                      key={key}
                      className="rounded-input border border-control bg-panel-2 px-1.5 py-0.5 text-meta text-text"
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
              </td>
              <td className="text-ui text-muted">{t(row.labelKey)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-meta text-muted">{t('common.shortcuts.hintInPalette')}</p>
    </Modal>
  );
}

