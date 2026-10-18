/**
 * Modelo de la pantalla de Inicio (§7.1).
 *
 * Función pura: recibe el estado y devuelve TODO lo que la vista necesita, ya
 * derivado con la lógica de dominio (`readiness`, `stats`, `today`, `alerts`,
 * `budget`, `recommend`). No traduce: los textos viven en los componentes.
 */
import type { AppState, Certification, ChecklistItem, PlanItem, Topic } from '@/data/types';
import { daysBetween, localDate } from '@/lib/dates';
import { buildAlerts, type AppAlert } from '@/domain/alerts';
import { budgetTotals } from '@/domain/budget';
import { computeReadiness, type ReadinessResult } from '@/domain/readiness';
import { nextRecommended, sortRoute } from '@/domain/recommend';
import { heatmap, streakDays, weekMinutes, weeklyGoalRatio, type HeatmapCell } from '@/domain/stats';
import { buildTodayQueue } from '@/domain/today';
import { certById } from '@/data/store';

export type StepKind = 'topic' | 'checklist' | 'exam' | 'mock';

export interface DashboardStep {
  kind: StepKind;
  id: string;
  /** Dato escrito por el usuario (tema, ítem, recurso): nunca se traduce. */
  label: string | null;
  /** Código oficial de la certificación (`SAA-C03`): nunca se traduce. */
  certCode: string;
  href: string;
  /** Días hasta el examen (solo pasos de tipo `exam`). */
  daysLeft: number | null;
}

export interface DashboardKpis {
  weekMinutes: number;
  /** 0..1 respecto de la meta semanal. */
  weekRatio: number;
  weeklyGoalHours: number;
  streak: number;
  studyDays: number[];
  mocksPassed: number;
  mocksTotal: number;
  paidUsd: number;
  /** Planeado + pagado: el total del presupuesto registrado. */
  plannedUsd: number;
  /** paid / total (0..1). */
  burnRatio: number;
}

export interface DashboardModel {
  today: string;
  hasPlan: boolean;
  activeCert: Certification | null;
  activeItem: PlanItem | null;
  readiness: ReadinessResult | null;
  nextStep: DashboardStep | null;
  steps: DashboardStep[];
  alerts: AppAlert[];
  kpis: DashboardKpis;
  heat: HeatmapCell[];
}

const DONE_STATUSES = new Set<string>(['aprobado', 'saltado']);
/** El examen entra en "próximos pasos" cuando está a ≤30 días (§7.1, §7.9). */
const EXAM_HORIZON_DAYS = 30;
const MAX_STEPS = 3;

export function buildDashboardModel(state: AppState, now: Date = new Date()): DashboardModel {
  const today = localDate(now);
  const route = sortRoute(state.planItems, state.certifications);
  const activeItem = pickActiveItem(state, route, now);
  const activeCert = activeItem ? (certById(state, activeItem.certId) ?? null) : null;

  const queue = buildTodayQueue(state, now);
  const certIds = queue.activeCertIds.length > 0 ? queue.activeCertIds : activeCert ? [activeCert.id] : [];

  // Temas vencidos y checklist pendiente: primero lo que ya vence hoy.
  const topics = queue.topics;
  const checklist = queue.checklist.length > 0 ? queue.checklist : pendingChecklist(state, certIds);

  const readiness =
    activeCert && activeItem
      ? computeReadiness({
          cert: activeCert,
          planItem: activeItem,
          attempts: state.attempts.filter((attempt) => attempt.certId === activeCert.id),
          resources: state.resources,
          sessions: state.studySessions,
        })
      : null;

  const steps = collectSteps(state, topics, checklist, today);
  const nextStep =
    steps.find((step) => step.kind === 'topic') ??
    steps.find((step) => step.kind === 'checklist') ??
    mockStep(state, activeCert);

  const totals = budgetTotals(state.budgetItems);
  const sessions = state.studySessions;

  return {
    today,
    hasPlan: state.planItems.length > 0,
    activeCert,
    activeItem,
    readiness,
    nextStep,
    steps: steps.slice(0, MAX_STEPS),
    alerts: buildAlerts(state, now).slice(0, 3),
    kpis: {
      weekMinutes: weekMinutes(sessions, today),
      weekRatio: weeklyGoalRatio(sessions, state.settings, today),
      weeklyGoalHours: state.settings.weeklyHoursGoal,
      streak: streakDays(sessions, today, state.settings.studyDays),
      studyDays: [...state.settings.studyDays].sort((a, b) => a - b),
      mocksPassed: state.attempts.filter((attempt) => attempt.passed === true).length,
      mocksTotal: state.attempts.length,
      paidUsd: totals.paidUsd,
      plannedUsd: totals.paidUsd + totals.plannedUsd,
      burnRatio: totals.burnRatio,
    },
    heat: heatmap(sessions, today, 120),
  };
}

/** Certificación activa: la elegida en ajustes; si no, la siguiente recomendada. */
function pickActiveItem(state: AppState, route: PlanItem[], now: Date): PlanItem | null {
  const configured = state.settings.activeCertId;
  if (configured) {
    const planned = route.find((item) => item.certId === configured);
    if (planned) return planned;
  }
  return nextRecommended({ planItems: state.planItems, certifications: state.certifications, now });
}

/** Próximos pasos: examen a ≤30 días, temas vencidos y checklist pendiente. */
function collectSteps(
  state: AppState,
  topics: Topic[],
  checklist: ChecklistItem[],
  today: string,
): DashboardStep[] {
  const steps: DashboardStep[] = [];
  const exam = examStep(state, today);
  if (exam) steps.push(exam);

  for (const topic of topics) {
    if (steps.length >= MAX_STEPS) break;
    steps.push({
      kind: 'topic',
      id: `step-topic-${topic.id}`,
      label: topic.title,
      certCode: certById(state, topic.certId)?.code ?? topic.certId,
      href: '/hoy',
      daysLeft: null,
    });
  }

  for (const item of checklist) {
    if (steps.length >= MAX_STEPS) break;
    steps.push({
      kind: 'checklist',
      id: `step-checklist-${item.id}`,
      label: item.title,
      certCode: certById(state, item.certId)?.code ?? item.certId,
      href: '/checklist',
      daysLeft: null,
    });
  }

  return steps;
}

/** Examen agendado más próximo dentro de la ventana de 30 días. */
function examStep(state: AppState, today: string): DashboardStep | null {
  let best: DashboardStep | null = null;
  for (const item of state.planItems) {
    if (!item.targetDate || DONE_STATUSES.has(item.status)) continue;
    const daysLeft = daysBetween(today, item.targetDate);
    if (daysLeft < 0 || daysLeft > EXAM_HORIZON_DAYS) continue;
    if (best && (best.daysLeft ?? EXAM_HORIZON_DAYS) <= daysLeft) continue;
    const cert = certById(state, item.certId);
    if (!cert) continue;
    best = {
      kind: 'exam',
      id: `step-exam-${cert.id}`,
      label: cert.name,
      certCode: cert.code,
      href: `/ruta/${cert.id}`,
      daysLeft,
    };
  }
  return best;
}

/** Checklist pendiente de las certificaciones activas (vencido primero). */
function pendingChecklist(state: AppState, certIds: string[]) {
  return state.checklistItems
    .filter(
      (item) =>
        !item.done &&
        !item.archived &&
        (certIds.length === 0 || certIds.includes(item.certId)),
    )
    .sort((a, b) => {
      if (a.dueDate === null && b.dueDate !== null) return 1;
      if (a.dueDate !== null && b.dueDate === null) return -1;
      if (a.dueDate !== b.dueDate) return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
      return a.order - b.order;
    });
}

/**
 * Siguiente intento de simulacro: primer recurso de práctica del certificado
 * activo que siga pendiente (simulacro completo antes que set de preguntas).
 */
function mockStep(state: AppState, activeCert: Certification | null): DashboardStep | null {
  if (!activeCert) return null;
  const pending = state.resources.filter(
    (resource) =>
      resource.certId === activeCert.id &&
      (resource.type === 'practice_exam' || resource.type === 'practice_questions') &&
      resource.status !== 'completado' &&
      resource.status !== 'descartado',
  );
  const mock = pending.find((resource) => resource.type === 'practice_exam');
  const resource = mock ?? pending[0];
  if (!resource) return null;
  return {
    kind: 'mock',
    id: `step-mock-${resource.id}`,
    // El set oficial de preguntas se nombra por código (`dashboard.step.readiness`).
    label: resource.type === 'practice_exam' ? resource.title : null,
    certCode: activeCert.code,
    href: '/practica',
    daysLeft: null,
  };
}
