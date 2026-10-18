import type { Attempt, Certification, ChecklistItem, PlanStatus, ResourceStatus } from '@/data/types';
import type { GlyphState } from '@/components/ui/primitives';
import { attemptPassed, attemptScore } from '@/domain/scoring';

/** Estados del plan en el orden en que se ofrecen en el menú (§5). */
export const PLAN_STATUSES: PlanStatus[] = [
  'no_iniciado',
  'estudiando',
  'listo',
  'agendado',
  'aprobado',
  'reprobado',
  'saltado',
];

export interface AttemptView {
  attempt: Attempt;
  score: number | null;
  passed: boolean | null;
  /** `true` cuando el puntaje es calculado y no reportado por la fuente. */
  estimated: boolean;
}

export function attemptView(attempt: Attempt, cert: Certification): AttemptView {
  return {
    attempt,
    score: attemptScore(attempt),
    passed: attemptPassed(attempt, cert.passingScore),
    estimated: attempt.score === null,
  };
}

export function resourceGlyph(status: ResourceStatus): GlyphState {
  switch (status) {
    case 'completado':
      return 'hecho';
    case 'en_curso':
      return 'enCurso';
    case 'descartado':
      return 'alerta';
    case 'pendiente':
    default:
      return 'pendiente';
  }
}

/** Semáforo de dominio (glifo siempre con texto, §9.6). */
export function lightGlyph(light: 'ok' | 'warn' | 'err' | null): GlyphState {
  switch (light) {
    case 'ok':
      return 'aprobado';
    case 'warn':
      return 'enCurso';
    case 'err':
      return 'alerta';
    default:
      return 'pendiente';
  }
}

/** Siguiente `order` para un ítem nuevo del checklist. */
export function nextOrder(items: ChecklistItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.order), 0) + 1;
}

export function byDateDesc<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
