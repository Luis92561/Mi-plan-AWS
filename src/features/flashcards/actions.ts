import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import type { Flashcard } from '@/data/types';
import { newFlashcard, sm2, type Grade } from '@/domain/sm2';
import { useT } from '@/lib/i18n/useT';

/** Campos editables de una tarjeta (el resto lo calcula SM-2). */
export interface CardInput {
  certId: string;
  domainId: string | null;
  front: string;
  back: string;
}

export interface ReviewActions {
  /** §7.7 — aplica `sm2(card, grade, now)` y guarda la tarjeta. */
  grade: (card: Flashcard, grade: Grade) => Promise<Flashcard | null>;
  /** Crea con `newFlashcard()` o actualiza una existente. */
  save: (input: CardInput, existing: Flashcard | null) => Promise<boolean>;
  remove: (card: Flashcard) => Promise<boolean>;
  /** Último resultado de escritura; lo anuncia la región `aria-live` de la página. */
  status: string;
  busyId: string | null;
}

const GRADE_KEYS = {
  again: 'review.grade.again',
  good: 'review.grade.good',
  easy: 'review.grade.easy',
} as const;

/** Recorta el frente para que quepa en un toast o en una etiqueta. */
export function shortFront(front: string, max = 48): string {
  const clean = front.trim().replace(/\s+/g, ' ');
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Escrituras de Repaso. Ninguna usa la red ni navega: la vista se entera de los
 * cambios por `useAppState()` (LiveQuery sobre IndexedDB).
 */
export function useReviewActions(): ReviewActions {
  const { t, f } = useT();
  const { notify } = useToast();
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fail = useCallback(
    (cause: unknown) => {
      const reason = cause instanceof Error ? cause.message : String(cause);
      const message = t('review.error', { message: reason });
      setStatus(message);
      notify(message, 'err');
    },
    [notify, t],
  );

  const grade = useCallback(
    async (card: Flashcard, value: Grade): Promise<Flashcard | null> => {
      setBusyId(card.id);
      try {
        const now = new Date();
        const next = sm2(card, value, now);
        await getDb().flashcards.put(next);
        const message = t('review.graded', {
          front: shortFront(card.front),
          grade: t(GRADE_KEYS[value]),
          date: f.date(next.dueDate),
        });
        setStatus(message);
        return next;
      } catch (cause) {
        fail(cause);
        return null;
      } finally {
        setBusyId(null);
      }
    },
    [f, fail, t],
  );

  const save = useCallback(
    async (input: CardInput, existing: Flashcard | null): Promise<boolean> => {
      setBusyId(existing?.id ?? 'new');
      try {
        const db = getDb();
        const now = new Date();
        if (existing) {
          await db.flashcards.put({
            ...existing,
            certId: input.certId,
            domainId: input.domainId,
            front: input.front,
            back: input.back,
          });
          const message = t('review.updated');
          setStatus(message);
          notify(message, 'ok');
        } else {
          const card = newFlashcard(
            { certId: input.certId, domainId: input.domainId, front: input.front, back: input.back },
            now,
          );
          await db.flashcards.put(card);
          const message = t('review.created');
          setStatus(message);
          notify(message, 'ok');
        }
        return true;
      } catch (cause) {
        fail(cause);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [fail, notify, t],
  );

  const remove = useCallback(
    async (card: Flashcard): Promise<boolean> => {
      setBusyId(card.id);
      try {
        await getDb().flashcards.delete(card.id);
        const message = t('review.deleted');
        setStatus(message);
        notify(message, 'ok');
        return true;
      } catch (cause) {
        fail(cause);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [fail, notify, t],
  );

  return { grade, save, remove, status, busyId };
}
