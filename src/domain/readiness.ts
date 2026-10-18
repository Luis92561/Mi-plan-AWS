import type { Attempt, Certification, PlanItem, Resource, StudySession } from '@/data/types';

/** Porcentaje del examen que hay que acertar para aprobar (0..1). */
export function passingRatio(passingScore: number): number {
  return (passingScore - 100) / 900;
}

/** Acierto por dominio a partir del desglose de todos los intentos de la certificación. */
export function domainAccuracy(attempts: Attempt[]): Record<string, number | null> {
  const totals: Record<string, { correct: number; total: number }> = {};
  for (const attempt of attempts) {
    for (const row of attempt.breakdown ?? []) {
      const current = totals[row.domainId] ?? { correct: 0, total: 0 };
      current.correct += row.correct;
      current.total += row.total;
      totals[row.domainId] = current;
    }
  }
  const out: Record<string, number | null> = {};
  for (const [domainId, value] of Object.entries(totals)) {
    out[domainId] = value.total > 0 ? value.correct / value.total : null;
  }
  return out;
}

/** Porcentaje de acierto de un intento (0..1), priorizando el puntaje reportado. */
export function attemptRatio(attempt: Attempt): number | null {
  if (attempt.score !== null && attempt.score !== undefined) {
    const ratio = (attempt.score - 100) / 900;
    return Math.min(1, Math.max(0, ratio));
  }
  if (attempt.correct !== null && attempt.total) {
    return attempt.correct / attempt.total;
  }
  return null;
}

export interface ReadinessInput {
  cert: Certification;
  planItem: PlanItem | null;
  attempts: Attempt[];
  resources: Resource[];
  sessions: StudySession[];
}

export interface ReadinessBreakdown {
  /** 0..1 — 35 % */
  domainCoverage: number;
  /** 0..1 — 35 % */
  mockPerformance: number;
  /** 0..1 — 20 % */
  resourcesDone: number;
  /** 0..1 — 10 % */
  hoursVsPlan: number;
}

export interface ReadinessResult {
  /** 0..100, entero */
  score: number;
  /** true cuando no hay ninguna evidencia de simulacros: se muestra como estimación */
  preliminary: boolean;
  breakdown: ReadinessBreakdown;
  accuracyByDomain: Record<string, number | null>;
  attemptsCount: number;
}

/**
 * Readiness §8.1
 *   readiness = 0.35·coberturaDominios + 0.35·desempenoSimulacros + 0.20·recursos + 0.10·horasVsPlan
 * Los dominios sin intentos cuentan 0; los últimos 3 intentos pesan 3, 2, 1.
 */
export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const { cert, planItem, attempts, resources, sessions } = input;
  const accuracy = domainAccuracy(attempts);

  // Cobertura de dominios
  const domains = cert.domains ?? [];
  let coverageSum = 0;
  for (const domain of domains) {
    const acc = accuracy[domain.id];
    coverageSum += acc === null || acc === undefined ? 0 : Math.min(1, acc / 0.8);
  }
  const domainCoverage = domains.length > 0 ? coverageSum / domains.length : 0;

  // Desempeño en simulacros: últimos 3, pesos 3/2/1
  const target = passingRatio(cert.passingScore);
  const recent = [...attempts]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 3);
  let weighted = 0;
  let weightTotal = 0;
  recent.forEach((attempt, index) => {
    const weight = 3 - index;
    const ratio = attemptRatio(attempt);
    if (ratio === null || target <= 0) return;
    weighted += Math.min(1, ratio / target) * weight;
    weightTotal += weight;
  });
  const mockPerformance = weightTotal > 0 ? weighted / weightTotal : 0;

  // Recursos completados
  const certResources = resources.filter((r) => r.certId === cert.id && r.status !== 'descartado');
  const completed = certResources.filter((r) => r.status === 'completado').length;
  const resourcesDone = certResources.length > 0 ? completed / certResources.length : 0;

  // Horas registradas vs. planeadas
  const hoursDone = sessions
    .filter((s) => s.certId === cert.id)
    .reduce((sum, s) => sum + s.minutes, 0) / 60;
  const hoursPlanned = planItem?.hoursPlanned ?? 0;
  const hoursVsPlan = Math.min(1, hoursDone / Math.max(1, hoursPlanned));

  const raw =
    0.35 * domainCoverage + 0.35 * mockPerformance + 0.2 * resourcesDone + 0.1 * hoursVsPlan;

  return {
    score: Math.round(Math.max(0, Math.min(1, raw)) * 100),
    preliminary: attempts.length === 0,
    breakdown: { domainCoverage, mockPerformance, resourcesDone, hoursVsPlan },
    accuracyByDomain: accuracy,
    attemptsCount: attempts.length,
  };
}
