import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { PREFS_KEY, PrefsProvider, applyPrefs, readPrefs, resolveTheme, usePrefs } from '@/app/prefs';

interface MediaMock {
  state: { matches: boolean };
  fire: (matches: boolean) => void;
}

function installMatchMedia(matches: boolean): MediaMock {
  const state = { matches };
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mock = {
    get matches() {
      return state.matches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  };
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => mock });
  return {
    state,
    fire(next: boolean) {
      state.matches = next;
      listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
    },
  };
}

function Probe() {
  const { prefs, setTheme, toggleLocale } = usePrefs();
  return (
    <div>
      <span data-testid="theme">{prefs.theme}</span>
      <span data-testid="locale">{prefs.locale}</span>
      <button type="button" onClick={() => setTheme('light')}>
        light
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        system
      </button>
      <button type="button" onClick={toggleLocale}>
        locale
      </button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-theme-pref');
  document.documentElement.setAttribute('lang', 'es');
});

afterEach(() => {
  window.localStorage.clear();
});

describe('resolveTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('devuelve el tema explícito tal cual', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });

  it('`system` sigue la preferencia del SO', () => {
    installMatchMedia(true);
    expect(resolveTheme('system')).toBe('dark');
    installMatchMedia(false);
    expect(resolveTheme('system')).toBe('light');
  });
});

describe('applyPrefs', () => {
  it('escribe data-theme, data-font, lang y la escala de fuente', () => {
    applyPrefs({ theme: 'light', locale: 'en', fontMode: 'lectura', fontScale: 1.15 });
    const root = document.documentElement;
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(root.getAttribute('data-theme-pref')).toBe('light');
    expect(root.getAttribute('data-font')).toBe('lectura');
    expect(root.getAttribute('lang')).toBe('en');
    expect(root.style.getPropertyValue('--fs-base')).toBe('1.15');
  });
});

describe('PrefsProvider', () => {
  it('por defecto: tema oscuro y español', () => {
    render(
      <PrefsProvider>
        <Probe />
      </PrefsProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('locale').textContent).toBe('es');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('persiste el cambio y lo recupera tras "recargar"', () => {
    const first = render(
      <PrefsProvider>
        <Probe />
      </PrefsProvider>,
    );
    act(() => screen.getByText('light').click());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(readPrefs().theme).toBe('light');

    first.unmount();
    document.documentElement.removeAttribute('data-theme');
    render(
      <PrefsProvider>
        <Probe />
      </PrefsProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('con `system` escucha cambios del SO en vivo, sin recargar', () => {
    const media = installMatchMedia(true);
    render(
      <PrefsProvider>
        <Probe />
      </PrefsProvider>,
    );
    act(() => screen.getByText('system').click());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => media.fire(false));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    act(() => media.fire(true));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('el idioma se persiste y actualiza <html lang> al instante', () => {
    render(
      <PrefsProvider>
        <Probe />
      </PrefsProvider>,
    );
    act(() => screen.getByText('locale').click());
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    const stored = window.localStorage.getItem(PREFS_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored as string).locale).toBe('en');
  });

  it('ignora preferencias corruptas en localStorage', () => {
    window.localStorage.setItem(PREFS_KEY, 'no-json');
    render(
      <PrefsProvider>
        <Probe />
      </PrefsProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });
});
