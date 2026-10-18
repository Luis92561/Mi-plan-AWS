import type { Attempt, Certification } from '@/data/types';

/** Rango de puntaje AWS: 100..1000. */
export const MIN_SCORE = 100;
export const MAX_SCORE = 1000;

/**
 * Puntaje estimado a partir de aciertos: `round(100 + 900 * (correct/total))`.
 * Siempre se etiqueta como **estimado** en la UI.
 */
export function estimatedScore(correct: number, total: number): number {
  if (!total || total <= 0) return MIN_SCORE;
  const ratio = Math.max(0, Math.min(1, correct / total));
  return Math.round(MIN_SCORE + (MAX_SCORE - MIN_SCORE) * ratio);
}

/** El mejor puntaje disponible de un intento: reportado o estimado. */
export function attemptScore(attempt: Attempt): number | null {
  if (attempt.score !== null && attempt.score !== undefined) return attempt.score;
  if (attempt.estimatedScore !== null && attempt.estimatedScore !== undefined) return attempt.estimatedScore;
  if (attempt.correct !== null && attempt.total) return estimatedScore(attempt.correct, attempt.total);
  return null;
}

/** ¿Aprobado? Usa el puntaje si existe; si no, el porcentaje contra el mínimo. */
export function attemptPassed(attempt: Attempt, passingScore: number): boolean | null {
  const score = attemptScore(attempt);
  if (score !== null) return score >= passingScore;
  return null;
}

/** Completa y normaliza un intento antes de guardarlo. */
export function normalizeAttempt(attempt: Attempt, cert: Certification): Attempt {
  const est =
    attempt.correct !== null && attempt.total ? estimatedScore(attempt.correct, attempt.total) : attempt.estimatedScore;
  const withScore: Attempt = { ...attempt, estimatedScore: est ?? null };
  const passed = attemptPassed(withScore, cert.passingScore);
  return { ...withScore, passed: passed ?? null };
}

/** Promedio de los últimos `n` intentos con puntaje. */
export function averageOfLast(attempts: Attempt[], n = 3): number | null {
  const scores = [...attempts]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map(attemptScore)
    .filter((s): s is number => s !== null)
    .slice(0, n);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

export interface DomainProgress {
  domainId: string;
  correct: number;
  total: number;
  ratio: number | null;
  /** Semáforo: ok ≥ 80 %, warn ≥ 60 %, err por debajo, null sin datos. */
  light: 'ok' | 'warn' | 'err' | null;
}

export function domainProgress(attempts: Attempt[]): DomainProgress[] {
  const totals: Record<string, { correct: number; total: number }> = {};
  for (const attempt of attempts) {
    for (const row of attempt.breakdown ?? []) {
      const current = totals[row.domainId] ?? { correct: 0, total: 0 };
      current.correct += row.correct;
      current.total += row.total;
      totals[row.domainId] = current;
    }
  }
  return Object.entries(totals).map(([domainId, value]) => {
    const ratio = value.total > 0 ? value.correct / value.total : null;
    const light = ratio === null ? null : ratio >= 0.8 ? 'ok' : ratio >= 0.6 ? 'warn' : 'err';
    return { domainId, correct: value.correct, total: value.total, ratio, light };
  });
}
