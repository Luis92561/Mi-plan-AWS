import { Command, Monitor, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Button } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { usePrefs } from './prefs';
import type { Theme } from '@/data/types';
import { cn } from '@/lib/cn';

function ThemeIcon({ theme }: { theme: Theme }) {
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  return <Icon size={16} aria-hidden="true" />;
}

/**
 * Cabecera global: conmutador ES | EN, botón de tema (claro/oscuro/sistema)
 * y acceso a la paleta de comandos. Visible también en móvil (§7.14).
 */
export function Header({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { t } = useT();
  const { prefs, setLocale, setTheme, toggleTheme } = usePrefs();
  const themeLabel = t(`common.theme.${prefs.theme}` as 'common.theme.dark');

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-header backdrop-blur-[8px]">
      <div className="mx-auto flex max-w-shell items-center gap-2 px-4 py-2 md:px-8">
        <Link to="/" className="group flex min-w-0 items-baseline gap-2">
          <span aria-hidden="true" className="text-accent">
            ❯
          </span>
          <span className="truncate text-ui font-bold">{t('common.app.name')}</span>
          <span className="label-mono hidden text-muted lg:inline">{t('common.app.tagline')}</span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Idioma: control segmentado ES | EN */}
          <div
            role="group"
            aria-label={t('common.langLabel')}
            className="flex items-center rounded-input border border-control p-0.5"
          >
            {(['es', 'en'] as const).map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => setLocale(locale)}
                aria-pressed={prefs.locale === locale}
                className={cn(
                  'min-h-8 rounded-[4px] px-2 text-label uppercase tracking-label transition-colors duration-hover',
                  prefs.locale === locale ? 'bg-accent text-accent-ink font-bold' : 'text-muted hover:text-text',
                )}
              >
                {locale}
              </button>
            ))}
          </div>

          {/* Tema: tres estados en un menú pequeño */}
          <Menu>
            <MenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${t('common.themeLabel')}: ${themeLabel}`}
                title={t('common.theme.now', { theme: themeLabel })}
                className="min-w-8 px-2"
              >
                <ThemeIcon theme={prefs.theme} />
              </Button>
            </MenuTrigger>
            <MenuContent align="end" ariaLabel={t('common.themeLabel')}>
              <MenuLabel>{t('common.themeLabel')}</MenuLabel>
              {(['dark', 'light', 'system'] as const).map((theme) => (
                <MenuItem key={theme} onSelect={() => setTheme(theme)}>
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className={prefs.theme === theme ? 'text-accent' : 'text-muted'}>
                      {prefs.theme === theme ? '●' : '○'}
                    </span>
                    {t(`common.theme.${theme}` as 'common.theme.dark')}
                  </span>
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem onSelect={toggleTheme}>
                <span className="flex items-center justify-between gap-3">
                  <span>{t('common.theme.now', { theme: themeLabel })}</span>
                  <kbd className="chip-mono">Alt+T</kbd>
                </span>
              </MenuItem>
            </MenuContent>
          </Menu>

          {/* Paleta de comandos */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenPalette}
            aria-label={t('common.openPalette')}
            title={t('common.commandPalette')}
            className="gap-1.5 px-2"
          >
            <Command size={16} aria-hidden="true" />
            <kbd className="hidden text-label text-muted lg:inline">Ctrl K</kbd>
          </Button>
        </div>
      </div>
    </header>
  );
}
