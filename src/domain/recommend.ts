import type { Certification, PlanItem } from '@/data/types';
import { daysBetween, localDate } from '@/lib/dates';

/** Estados que cuentan como "prerrequisito satisfecho". */
const SATISFIED = new Set(['aprobado', 'saltado']);

export type UnlockState = 'unlocked' | 'locked' | 'approved' | 'skipped' | 'unknown';

function isSatisfied(prereq: string, planItems: PlanItem[]): boolean {
  const pre = planItems.find((p) => p.certId === prereq);
  return pre !== undefined && SATISFIED.has(pre.status);
}

/**
 * §6.1 — Una certificación está desbloqueada si sus prerrequisitos están
 * `aprobado` o `saltado` explícitamente. Sin prerrequisitos ⇒ desbloqueada.
 * `prerequisiteMode: 'any'` (DOP-C02: «DVA-C02 o SOA-C03») se conforma con uno.
 */
export function unlockState(
  certId: string,
  planItems: PlanItem[],
  certifications: Certification[],
): UnlockState {
  const cert = certifications.find((c) => c.id === certId);
  if (!cert) return 'unknown';
  const item = planItems.find((p) => p.certId === certId);
  if (item?.status === 'aprobado') return 'approved';
  if (item?.status === 'saltado') return 'skipped';
  const missing = blockingPrerequisites(certId, planItems, certifications);
  return missing.length === 0 ? 'unlocked' : 'locked';
}

/** Prerrequisitos que faltan por satisfacer (para el candado con nombre). */
export function blockingPrerequisites(
  certId: string,
  planItems: PlanItem[],
  certifications: Certification[],
): string[] {
  const cert = certifications.find((c) => c.id === certId);
  if (!cert) return [];
  const missing = cert.prerequisites.filter((prereq) => !isSatisfied(prereq, planItems));
  if (missing.length === 0) return [];
  // En modo `any` la certificación se desbloquea en cuanto uno esté aprobado.
  if (cert.prerequisiteMode === 'any' && missing.length < cert.prerequisites.length) return [];
  return missing;
}

/** ¿Se retira dentro de `days` días? (§6.1.4) */
export function retiringSoon(cert: Certification, now: Date, days = 120): boolean {
  if (cert.lifecycle !== 'retiring' || !cert.retirementDate) return false;
  const remaining = daysBetween(localDate(now), cert.retirementDate);
  return remaining >= 0 && remaining <= days;
}

/** Días que faltan para el retiro (negativos si ya pasó). */
export function daysToRetirement(cert: Certification, now: Date): number | null {
  if (!cert.retirementDate) return null;
  return daysBetween(localDate(now), cert.retirementDate);
}

function certOf(item: PlanItem, certifications: Certification[]): Certification | undefined {
  return certifications.find((c) => c.id === item.certId);
}

/** Orden estable de la ruta: fase, luego `order`, luego código. (§8.2) */
export function sortRoute(planItems: PlanItem[], certifications: Certification[]): PlanItem[] {
  return [...planItems].sort((a, b) => {
    const ca = certOf(a, certifications);
    const cb = certOf(b, certifications);
    const phaseA = ca?.phase ?? 9;
    const phaseB = cb?.phase ?? 9;
    if (phaseA !== phaseB) return phaseA - phaseB;
    if (a.order !== b.order) return a.order - b.order;
    return (ca?.code ?? '').localeCompare(cb?.code ?? '');
  });
}

export interface NextRecommendedInput {
  planItems: PlanItem[];
  certifications: Certification[];
  now: Date;
}

/**
 * §6.1 / §8.2 — `nextRecommended`: primera certificación desbloqueada, no aprobada,
 * no saltada y con `lifecycle !== 'retired'`. Las `retiring` a ≤120 días no se
 * recomiendan salvo que ya estén en el plan (§6.1.4): al recibir `planItems`,
 * toda entrada ya está "en el plan", así que se excluyen de la recomendación.
 */
export function nextRecommended({ planItems, certifications, now }: NextRecommendedInput): PlanItem | null {
  const ordered = sortRoute(planItems, certifications);
  for (const item of ordered) {
    const cert = certOf(item, certifications);
    if (!cert) continue;
    if (item.status === 'aprobado' || item.status === 'saltado') continue;
    if (cert.lifecycle === 'retired') continue;
    if (retiringSoon(cert, now, 120)) continue;
    if (unlockState(cert.id, planItems, certifications) !== 'unlocked') continue;
    return item;
  }
  return null;
}

/** Todas las certificaciones desbloqueadas y pendientes, en orden de ruta. */
export function unlockedPending(
  planItems: PlanItem[],
  certifications: Certification[],
): PlanItem[] {
  return sortRoute(planItems, certifications).filter(
    (item) =>
      item.status !== 'aprobado' &&
      item.status !== 'saltado' &&
      unlockState(item.certId, planItems, certifications) === 'unlocked',
  );
}

/** Agrupa la ruta por fase para el timeline (§7.2). */
export function groupByPhase(
  planItems: PlanItem[],
  certifications: Certification[],
): { phase: number; items: PlanItem[] }[] {
  const sorted = sortRoute(planItems, certifications);
  const phases = new Map<number, PlanItem[]>();
  for (const item of sorted) {
    const phase = certOf(item, certifications)?.phase ?? 9;
    const bucket = phases.get(phase) ?? [];
    bucket.push(item);
    phases.set(phase, bucket);
  }
  return [...phases.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([phase, items]) => ({ phase, items }));
}
