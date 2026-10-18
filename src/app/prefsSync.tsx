import { useEffect, useRef } from 'react';
import { useAppState, saveSettings } from '@/data/store';
import { usePrefs } from './prefs';

/**
 * Las preferencias de UI viven en `localStorage` (no son datos de negocio), pero se
 * reflejan en `settings` para que el respaldo JSON y el export las conserven (§3).
 */
export function usePrefsSync(): void {
  const { prefs } = usePrefs();
  const { state, ready } = useAppState();
  const lastWritten = useRef<string>('');

  useEffect(() => {
    if (!ready) return;
    const settings = state.settings;
    if (!settings) return;
    if (settings.locale === prefs.locale && settings.theme === prefs.theme) return;
    const signature = `${prefs.locale}:${prefs.theme}`;
    if (lastWritten.current === signature) return;
    lastWritten.current = signature;
    void saveSettings({ ...settings, locale: prefs.locale, theme: prefs.theme });
  }, [prefs.locale, prefs.theme, ready, state.settings]);
}
