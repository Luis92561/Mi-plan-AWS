import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useT } from '@/lib/i18n/useT';
import { useAppState } from '@/data/store';
import { NAV_ITEMS } from './routes';
import { useQuickSession } from '@/features/studylog/QuickSession';
import { usePrefs } from './prefs';
import { useToast } from '@/components/ui/toast';
import { copyText } from '@/lib/clipboard';
import { renderRouteNote } from '@/domain/obsidian';
import { cn } from '@/lib/cn';

interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

/**
 * Paleta de comandos (§9.5): navegar, crear nota, registrar sesión,
 * copiar para Obsidian y exportar.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onOpenShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenShortcuts: () => void;
}) {
  const { t, locale } = useT();
  const navigate = useNavigate();
  const { state } = useAppState();
  const { openQuickSession } = useQuickSession();
  const { toggleTheme, toggleLocale } = usePrefs();
  const { notify } = useToast();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = NAV_ITEMS.map((item) => ({
      id: `nav:${item.to}`,
      label: t(item.labelKey),
      hint: item.to,
      run: () => navigate(item.to),
    }));
    return [
      {
        id: 'session',
        label: t('action.logSession'),
        hint: 'S',
        run: () => openQuickSession(),
      },
      {
        id: 'note',
        label: t('action.newNote'),
        hint: '/notas',
        run: () => navigate('/notas?new=1'),
      },
      {
        id: 'attempt',
        label: t('nav.practica'),
        hint: '/practica',
        run: () => navigate('/practica?new=1'),
      },
      {
        id: 'copy-route',
        label: t('action.copyRoute'),
        hint: 'Markdown',
        run: () => {
          void (async () => {
            const ok = await copyText(renderRouteNote(state, locale, new Date()));
            notify(ok ? t('common.copied', { n: renderRouteNote(state, locale, new Date()).length }) : t('common.copyFailed'), ok ? 'ok' : 'err');
          })();
        },
      },
      {
        id: 'export-vault',
        label: t('action.exportVault'),
        hint: '/exportar',
        run: () => navigate('/exportar'),
      },
      { id: 'theme', label: t('common.themeLabel'), hint: 'Alt+T', run: () => toggleTheme() },
      { id: 'locale', label: t('common.langLabel'), hint: 'Alt+L', run: () => toggleLocale() },
      { id: 'shortcuts', label: t('common.shortcuts'), hint: '?', run: onOpenShortcuts },
      ...nav,
    ];
  }, [locale, navigate, notify, onOpenShortcuts, openQuickSession, state, t, toggleLocale, toggleTheme]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) => command.label.toLowerCase().includes(needle));
  }, [commands, query]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onOpenChange(false);
    command.run();
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('common.commandPalette')}
      description={t('common.shortcutHint')}
      closeLabel={t('common.close')}
      className="top-[12%] translate-y-0"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-input border border-control bg-panel-2 px-2.5">
          <Search size={14} aria-hidden="true" className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setIndex((current) => Math.min(current + 1, filtered.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setIndex((current) => Math.max(current - 1, 0));
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                run(filtered[index]);
              }
            }}
            placeholder={t('common.palettePlaceholder')}
            aria-label={t('common.commandPalette')}
            className="h-9 w-full bg-transparent text-ui outline-none"
            autoComplete="off"
          />
        </div>

        <ul role="listbox" aria-label={t('common.commandPalette')} className="max-h-[46dvh] overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-2.5 py-3 text-ui text-muted">{t('common.paletteEmpty')}</li>
          ) : null}
          {filtered.map((command, position) => (
            <li key={command.id} role="option" aria-selected={position === index}>
              <button
                type="button"
                onMouseEnter={() => setIndex(position)}
                onClick={() => run(command)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-input px-2.5 py-2 text-left text-ui',
                  position === index ? 'bg-hover text-text' : 'text-muted',
                )}
              >
                <span className="truncate">{command.label}</span>
                {command.hint ? <span className="shrink-0 text-label text-muted">{command.hint}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
