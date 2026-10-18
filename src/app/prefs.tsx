import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale, Theme } from '@/data/types';
import { I18nContext, type I18nApi } from '@/lib/i18n/useT';
import { translate } from '@/lib/i18n/translate';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatHours,
  formatMinutes,
  formatNumber,
  formatPercent,
  formatScore,
  formatWeekday,
} from '@/lib/format';

export const PREFS_KEY = 'miplan-aws:prefs';

export interface Prefs {
  theme: Theme;
  locale: Locale;
  fontMode: 'terminal' | 'lectura';
  fontScale: number;
}

export const defaultPrefs: Prefs = {
  theme: 'dark',
  locale: 'es',
  fontMode: 'terminal',
  fontScale: 1,
};

/** Lee las preferencias de UI de `localStorage` (con defaults y saneado). */
export function readPrefs(): Prefs {
  if (typeof window === 'undefined') return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      theme: parsed.theme === 'light' || parsed.theme === 'system' ? parsed.theme : 'dark',
      locale: parsed.locale === 'en' ? 'en' : 'es',
      fontMode: parsed.fontMode === 'lectura' ? 'lectura' : 'terminal',
      fontScale:
        typeof parsed.fontScale === 'number' && parsed.fontScale >= 0.9 && parsed.fontScale <= 1.3
          ? parsed.fontScale
          : 1,
    };
  } catch {
    return defaultPrefs;
  }
}

export function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function applyPrefs(prefs: Prefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', resolveTheme(prefs.theme));
  root.setAttribute('data-theme-pref', prefs.theme);
  root.setAttribute('data-font', prefs.fontMode);
  root.setAttribute('lang', prefs.locale);
  root.style.setProperty('--fs-base', String(prefs.fontScale));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolveTheme(prefs.theme) === 'dark' ? '#0A0B0D' : '#F6F3EC');
}

interface PrefsContextValue {
  prefs: Prefs;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setFontMode: (mode: 'terminal' | 'lectura') => void;
  setFontScale: (scale: number) => void;
  toggleTheme: () => void;
  toggleLocale: () => void;
}

const PrefsContext = createContext<PrefsContextValue>({
  prefs: defaultPrefs,
  setTheme: () => undefined,
  setLocale: () => undefined,
  setFontMode: () => undefined,
  setFontScale: () => undefined,
  toggleTheme: () => undefined,
  toggleLocale: () => undefined,
});

const THEME_CYCLE: Theme[] = ['dark', 'light', 'system'];

export function PrefsProvider({ children, initial }: { children: ReactNode; initial?: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(() => initial ?? readPrefs());

  useEffect(() => {
    applyPrefs(prefs);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* almacenamiento de preferencias bloqueado: la app sigue funcionando */
    }
  }, [prefs]);

  // `system`: escucha cambios del sistema operativo en vivo, sin recargar.
  useEffect(() => {
    if (prefs.theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyPrefs({ ...prefs, theme: 'system' });
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [prefs]);

  const setTheme = useCallback((theme: Theme) => setPrefs((p) => ({ ...p, theme })), []);
  const setLocale = useCallback((locale: Locale) => setPrefs((p) => ({ ...p, locale })), []);
  const setFontMode = useCallback(
    (fontMode: 'terminal' | 'lectura') => setPrefs((p) => ({ ...p, fontMode })),
    [],
  );
  const setFontScale = useCallback((fontScale: number) => setPrefs((p) => ({ ...p, fontScale })), []);
  const toggleTheme = useCallback(
    () => setPrefs((p) => ({ ...p, theme: THEME_CYCLE[(THEME_CYCLE.indexOf(p.theme) + 1) % THEME_CYCLE.length] })),
    [],
  );
  const toggleLocale = useCallback(() => setPrefs((p) => ({ ...p, locale: p.locale === 'es' ? 'en' : 'es' })), []);

  const value = useMemo<PrefsContextValue>(
    () => ({ prefs, setTheme, setLocale, setFontMode, setFontScale, toggleTheme, toggleLocale }),
    [prefs, setTheme, setLocale, setFontMode, setFontScale, toggleTheme, toggleLocale],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  return useContext(PrefsContext);
}

/** Provee el diccionario y los formatos regionales del idioma activo. */
export function I18nBridge({ locale, setLocale, toggleLocale, children }: {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  children: ReactNode;
}) {
  const api = useMemo<I18nApi>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t: (key, vars) => translate(locale, key, vars),
      f: {
        date: (v) => formatDate(v, locale),
        dateShort: (v) => formatDateShort(v, locale),
        dateTime: (v) => formatDateTime(v, locale),
        weekday: (v) => formatWeekday(v, locale),
        number: (v) => formatNumber(v, locale),
        currency: (v) => formatCurrency(v, locale),
        hours: (v) => formatHours(v, locale),
        minutes: (v) => formatMinutes(v, locale),
        percent: (v, d) => formatPercent(v, locale, d),
        score: (v, m) => formatScore(v, m),
      },
    }),
    [locale, setLocale, toggleLocale],
  );

  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>;
}
