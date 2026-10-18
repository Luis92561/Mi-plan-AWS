import type { AppState, CertLevel, Certification, PlanItem, PlanStatus } from '@/data/types';
import { computeReadiness, type ReadinessResult } from '@/domain/readiness';
import { unlockState } from '@/domain/recommend';
import type { GlyphState } from '@/components/ui/primitives';

/** Preferencia de vista de la ruta (§7.2): solo UI, nunca datos de negocio. */
export type RoadmapView = 'compacta' | 'detallada';

export const VIEW_STORAGE_KEY = 'miplan-aws:roadmap-view';

export function readStoredView(): RoadmapView {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return raw === 'compacta' ? 'compacta' : 'detallada';
  } catch {
    return 'detallada';
  }
}

export function storeView(view: RoadmapView): void {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* la preferencia no es crítica: si el navegador la bloquea, se usa la vista por defecto */
  }
}

/** Glifo de estado del plan; siempre se acompaña de su texto (§9.6). */
export function planGlyph(status: PlanStatus): GlyphState {
  switch (status) {
    case 'aprobado':
      return 'aprobado';
    case 'saltado':
      return 'hecho';
    case 'estudiando':
    case 'listo':
    case 'agendado':
      return 'enCurso';
    case 'reprobado':
      return 'alerta';
    case 'no_iniciado':
    default:
      return 'pendiente';
  }
}

/** Glifo del estado de un recurso de la fase 0. */
export function resourceGlyph(status: AppState['resources'][number]['status']): GlyphState {
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

/** Readiness de una certificación con los datos del estado completo. */
export function readinessOf(state: AppState, cert: Certification, planItem: PlanItem | null): ReadinessResult {
  return computeReadiness({
    cert,
    planItem,
    attempts: state.attempts.filter((attempt) => attempt.certId === cert.id),
    resources: state.resources.filter((resource) => resource.certId === cert.id),
    sessions: state.studySessions.filter((session) => session.certId === cert.id),
  });
}

/** ¿Está bloqueada por prerrequisitos sin aprobar? (§6.1.2) */
export function isLocked(state: AppState, cert: Certification): boolean {
  const item = state.planItems.find((planItem) => planItem.certId === cert.id);
  if (item?.status === 'aprobado' || item?.status === 'saltado') return false;
  return unlockState(cert.id, state.planItems, state.certifications) === 'locked';
}

/** Color por nivel, siempre con tokens del tema (cero hex en componentes). */
export const LEVEL_TONE: Record<CertLevel, string> = {
  foundational: 'text-ok',
  associate: 'text-accent',
  professional: 'text-warn',
  specialty: 'text-err',
  business: 'text-muted',
};

/** Marcas de borde por nivel, para la cabecera de fase. */
export const LEVEL_RULE: Record<CertLevel, string> = {
  foundational: 'border-ok/50',
  associate: 'border-accent/60',
  professional: 'border-warn/50',
  specialty: 'border-err/50',
  business: 'border-line',
};

/** Tono de una fase a partir del nivel de sus certificaciones. */
export function phaseTone(certs: Certification[]): string {
  const first = certs.find((cert) => cert.phase > 0);
  return first ? LEVEL_TONE[first.level] : 'text-muted';
}

export function phaseRule(certs: Certification[]): string {
  const first = certs.find((cert) => cert.phase > 0);
  return first ? LEVEL_RULE[first.level] : 'border-line';
}
