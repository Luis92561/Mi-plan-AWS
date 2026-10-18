import { useCallback, useEffect, useRef, useState } from 'react';
import { getDb } from '@/data/db';
import { nowIso } from '@/data/store';
import type { Note } from '@/data/types';
import { draftOf, type NoteDraft } from './model';

/** §7.11: 600 ms desde la última tecla. */
export const AUTOSAVE_DELAY_MS = 600;

export interface NoteAutosave {
  draft: NoteDraft;
  /** Hay cambios que todavía no están en IndexedDB. */
  dirty: boolean;
  /** Hay una escritura en curso (independiente de `dirty`). */
  saving: boolean;
  /** ISO del último guardado correcto. */
  savedAt: string | null;
  /** Mensaje del último fallo de escritura; `null` si todo fue bien. */
  error: string | null;
  update: (patch: Partial<NoteDraft>) => void;
  /** Guarda ya, sin esperar el debounce (`Ctrl/Cmd+S` y salida de la vista). */
  flush: () => Promise<void>;
  /** Reintenta la última escritura fallida. */
  retry: () => void;
  /**
   * Cancela el pendiente y lo da por escrito. Se usa al borrar la nota: sin
   * esto, el volcado de salida la resucitaría justo después de eliminarla.
   */
  discard: () => void;
}

/**
 * Autosave de una nota (§7.11).
 *
 * - Cada edición reinicia el temporizador de 600 ms.
 * - Las escrituras se encadenan: nunca se pisan dos `put` fuera de orden y el
 *   aviso de "guardado" solo aparece cuando la última versión está en disco.
 * - `beforeunload` bloquea el cierre del navegador si quedan cambios sin
 *   guardar (el segundo aviso es la franja visible del editor).
 */
export function useNoteAutosave(note: Note): NoteAutosave {
  const [draft, setDraft] = useState<NoteDraft>(() => draftOf(note));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(note.updatedAt);
  const [error, setError] = useState<string | null>(null);

  const noteRef = useRef(note);
  noteRef.current = note;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const versionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const writesRef = useRef(0);
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  const persist = useCallback((next: NoteDraft): Promise<void> => {
    const version = versionRef.current;
    writesRef.current += 1;
    setSaving(true);
    chainRef.current = chainRef.current.then(async () => {
      try {
        const stamp = nowIso();
        await getDb().notes.put({ ...noteRef.current, ...next, updatedAt: stamp });
        if (version > savedVersionRef.current) savedVersionRef.current = version;
        if (versionRef.current <= version) setDirty(false);
        setSavedAt(stamp);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        writesRef.current = Math.max(0, writesRef.current - 1);
        if (writesRef.current === 0) setSaving(false);
      }
    });
    return chainRef.current;
  }, []);

  const update = useCallback(
    (patch: Partial<NoteDraft>) => {
      const next = { ...draftRef.current, ...patch };
      draftRef.current = next;
      versionRef.current += 1;
      setDraft(next);
      setDirty(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void persist(draftRef.current);
      }, AUTOSAVE_DELAY_MS);
    },
    [persist],
  );

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (versionRef.current === savedVersionRef.current) return;
    await persist(draftRef.current);
  }, [persist]);

  const retry = useCallback(() => {
    void flush();
  }, [flush]);

  const discard = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    savedVersionRef.current = versionRef.current;
    setDirty(false);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (versionRef.current === savedVersionRef.current) return;
      event.preventDefault();
      // Compatibilidad con navegadores que aún leen `returnValue`.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        if (versionRef.current !== savedVersionRef.current) void persist(draftRef.current);
      }
    };
  }, [persist]);

  return { draft, dirty, saving, savedAt, error, update, flush, retry, discard };
}
