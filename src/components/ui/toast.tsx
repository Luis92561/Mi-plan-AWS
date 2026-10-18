import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'neutral' | 'ok' | 'err';
}

interface ToastApi {
  notify: (text: string, tone?: ToastMessage['tone']) => void;
}

const ToastContext = createContext<ToastApi>({ notify: () => undefined });

const DURATION = 4000;

/** Toasts abajo a la derecha, 4 s, anunciados con `aria-live="polite"` (§9.5, §9.8). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'neutral') => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current, { id, text, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, DURATION);
    timers.current.push(timer);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-20 right-3 z-[80] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2 md:bottom-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto rounded-card border bg-panel px-3 py-2 text-ui shadow-overlay',
              toast.tone === 'ok' && 'border-ok/45',
              toast.tone === 'err' && 'border-err/45',
              toast.tone === 'neutral' && 'border-line',
            )}
          >
            <span aria-hidden="true" className="mr-1.5 text-muted">
              [
            </span>
            {toast.text}
            <span aria-hidden="true" className="ml-1.5 text-muted">
              ]
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
