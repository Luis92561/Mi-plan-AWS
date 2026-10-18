import type { Flashcard } from '@/data/types';
import { addDaysToDate, localDate } from '@/lib/dates';

export type Grade = 'again' | 'good' | 'easy';

/** Escalera de intervalos en días (SM-2 recortado, §7.7). */
export const LADDER = [1, 3, 7, 16, 35, 75] as const;
export const MIN_EASE = 1.3;
export const BASE_EASE = 2.5;

export function nextLadderInterval(reps: number): number {
  const index = Math.min(Math.max(reps, 0), LADDER.length - 1);
  return LADDER[index];
}

/**
 * SM-2 recortado:
 *  - `again` ⇒ ease −0.20 (mín 1.3), intervalo 1 día, +1 lapso.
 *  - `good`  ⇒ ease estable, siguiente escalón de la escalera.
 *  - `easy`  ⇒ ease +0.15, escalón siguiente al que tocaría.
 * `reps` cuenta repasos exitosos; el intervalo se recalcula siempre.
 */
export function sm2(card: Flashcard, grade: Grade, now: Date): Flashcard {
  const today = localDate(now);
  const reps = card.reps ?? 0;

  if (grade === 'again') {
    return {
      ...card,
      ease: Math.max(MIN_EASE, round2((card.ease || BASE_EASE) - 0.2)),
      intervalDays: 1,
      dueDate: addDaysToDate(today, 1),
      reps: reps + 1,
      lapses: (card.lapses ?? 0) + 1,
    };
  }

  const step = grade === 'easy' ? reps + 1 : reps;
  const interval = nextLadderInterval(step);
  return {
    ...card,
    ease: grade === 'easy' ? Math.min(3.0, round2((card.ease || BASE_EASE) + 0.15)) : card.ease || BASE_EASE,
    intervalDays: interval,
    dueDate: addDaysToDate(today, interval),
    reps: reps + 1,
    lapses: card.lapses ?? 0,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function newFlashcard(
  input: Pick<Flashcard, 'certId' | 'front' | 'back'> & { domainId?: string | null },
  now: Date,
): Flashcard {
  return {
    id: `card-${now.getTime()}-${Math.abs(hash(input.front + input.back))}`,
    certId: input.certId,
    domainId: input.domainId ?? null,
    front: input.front,
    back: input.back,
    ease: BASE_EASE,
    intervalDays: 0,
    dueDate: localDate(now),
    reps: 0,
    lapses: 0,
    createdAt: now.toISOString(),
  };
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/** Tarjetas vencidas hoy (cola "para hoy"). */
export function dueCards(cards: Flashcard[], today: string): Flashcard[] {
  return cards
    .filter((card) => card.dueDate <= today)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
}
