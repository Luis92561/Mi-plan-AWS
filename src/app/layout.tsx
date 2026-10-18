import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Ellipsis } from 'lucide-react';
import { Header } from './header';
import { CommandPalette } from './palette';
import { ShortcutsDialog } from './shortcuts';
import { BOTTOM_ITEMS, MORE_ITEMS, NAV_ITEMS, type NavItem } from './routes';
import { useT } from '@/lib/i18n/useT';
import { useAppState } from '@/data/store';
import { buildTodayQueue } from '@/domain/today';
import { cn } from '@/lib/cn';
import { Modal } from '@/components/ui/modal';
import { QuickSessionHost } from '@/features/studylog/QuickSession';
import { usePrefsSync } from './prefsSync';

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="tnum ml-auto min-w-5 rounded-chip bg-accent px-1.5 text-center text-label font-bold text-accent-ink">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function SideLink({ item, badge }: { item: NavItem; badge: number }) {
  const { t } = useT();
  const Icon = item.icon;
  const showBadge = item.to === '/hoy' ? badge : 0;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-input px-2.5 py-2 text-ui transition-colors duration-hover',
          isActive ? 'bg-hover text-text' : 'text-muted hover:bg-hover hover:text-text',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span aria-hidden="true" className={cn('section-no w-6 shrink-0', isActive && 'text-accent')}>
            {item.no}
          </span>
          <Icon size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{t(item.labelKey)}</span>
          <NavBadge count={showBadge} />
        </>
      )}
    </NavLink>
  );
}

/** Estructura de la app: cabecera, navegación lateral, barra inferior y contenido. */
export function Layout() {
  const { t } = useT();
  const { state } = useAppState();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  usePrefsSync();

  const badge = useMemo(() => buildTodayQueue(state, new Date()).badge, [state]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      // `?` abre la hoja de atajos, salvo que se esté escribiendo.
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-input focus:bg-panel focus:px-3 focus:py-2 focus:text-ui"
      >
        {t('common.skipToContent')}
      </a>

      <Header onOpenPalette={() => setPaletteOpen(true)} />

      <div className="mx-auto flex max-w-shell items-start">
        <nav
          aria-label={t('nav.principal')}
          className="sticky top-[57px] hidden h-[calc(100dvh-57px)] w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-line px-2.5 py-4 md:flex"
        >
          {NAV_ITEMS.filter((item) => item.zone === 'main').map((item) => (
            <SideLink key={item.to} item={item} badge={badge} />
          ))}
          <p className="label-mono mt-4 px-2.5 pb-1">{t('nav.mas')}</p>
          {MORE_ITEMS.map((item) => (
            <SideLink key={item.to} item={item} badge={badge} />
          ))}
          <p className="mt-auto px-2.5 pt-6 text-meta leading-relaxed text-muted">{t('common.disclaimer')}</p>
        </nav>

        <main id="main" className="min-w-0 flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior móvil: 4 secciones + "Más" */}
      <nav
        aria-label={t('nav.principal')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-header backdrop-blur-[8px] md:hidden"
      >
        <ul className="mx-auto flex max-w-shell items-stretch justify-around px-1 py-1">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-input px-1 py-1 text-[10px]',
                      isActive ? 'text-accent' : 'text-muted',
                    )
                  }
                >
                  <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  <span className="truncate">{t(item.labelKey)}</span>
                  {item.to === '/hoy' && badge > 0 ? (
                    <span className="absolute right-2 top-1 min-w-4 rounded-chip bg-accent px-1 text-[9px] font-bold text-accent-ink">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-input px-1 py-1 text-[10px] text-muted"
            >
              <Ellipsis size={20} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('nav.mas')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={moreOpen} onOpenChange={setMoreOpen} title={t('nav.mas')} closeLabel={t('common.close')}>
        <ul className="flex flex-col gap-0.5">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-[44px] items-center gap-2.5 rounded-input px-2 py-2 text-ui text-text hover:bg-hover"
                >
                  <span aria-hidden="true" className="section-no w-6">
                    {item.no}
                  </span>
                  <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  {t(item.labelKey)}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </Modal>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <QuickSessionHost />
    </div>
  );
}
