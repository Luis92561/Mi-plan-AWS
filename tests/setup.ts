import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

/* jsdom no implementa ResizeObserver: lo usan los hooks de medición de
   radix-ui (`react-use-size`) al renderizar modales en tests de componentes. */
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
  }
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

/* jsdom no implementa matchMedia: la app lo necesita para `theme: 'system'`. */
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
