/* =============================================================================
   Reportes Markdown legibles — §7.12 y §11.1.
   Tres salidas: resumen semanal, reporte completo y reporte de presupuesto.
   Funciones puras: reciben `now`; nunca usan `Date.now()`.
   ========================================================================== */

import type {
  AppState,
  Attempt,
  AttemptKind,
  BudgetItem,
  BudgetKind,
  BudgetStatus,
  CertLevel,
  Certification,
  ChecklistGroup,
  ChecklistItem,
  Locale,
  Note,
  PlanItem,
  PlanStatus,
  StudySession,
  StudyType,
  Topic,
  TopicStatus,
  Voucher,
  VoucherStatus,
} from '@/data/types';
import { addDaysToDate, daysBetween, localDate, startOfWeekMonday } from '@/lib/dates';
import { formatCurrency, formatHours, formatPercent } from '@/lib/format';
import { budgetTotals, cumulativeSpend } from './budget';
import { computeReadiness, type ReadinessResult } from './readiness';
import { attemptPassed, attemptScore } from './scoring';

/* =============================================================================
   Textos
   ========================================================================== */

interface ReportCopy {
  appName: string;
  weeklyTitle: string;
  week: string;
  hours: string;
  sessions: string;
  weeklyGoal: string;
  byCert: string;
  certification: string;
  topicsMastered: string;
  upcoming: string;
  fullTitle: string;
  report: string;
  date: string;
  summary: string;
  metric: string;
  value: string;
  plannedCerts: string;
  approved: string;
  totalHours: string;
  averageReadiness: string;
  route: string;
  level: string;
  status: string;
  readiness: string;
  exam: string;
  noData: string;
  examFacts: string;
  phase: string;
  price: string;
  guide: string;
  domains: string;
  domain: string;
  weight: string;
  practice: string;
  checklist: string;
  progress: string;
  pending: string;
  topics: string;
  mockExams: string;
  source: string;
  correct: string;
  estimated: string;
  duration: string;
  passed: string;
  failed: string;
  notes: string;
  review: string;
  nextReview: string;
  budgetTitle: string;
  budget: string;
  totals: string;
  totalBudget: string;
  paid: string;
  remaining: string;
  consumed: string;
  remainingRoute: string;
  voucher: string;
  effective: string;
  withoutVouchers: string;
  withVouchers: string;
  savings: string;
  items: string;
  concept: string;
  kind: string;
  amount: string;
  vouchers: string;
  label: string;
  percent: string;
  expires: string;
  monthlySpend: string;
  month: string;
  cumulative: string;
  preparation: string;
  practiceGroup: string;
  examGroup: string;
  personalGroup: string;
  studyTypes: Record<StudyType, string>;
  topicStatuses: Record<TopicStatus, string>;
  planStatuses: Record<PlanStatus, string>;
  attemptKinds: Record<AttemptKind, string>;
  budgetKinds: Record<BudgetKind, string>;
  budgetStatuses: Record<BudgetStatus, string>;
  voucherStatuses: Record<VoucherStatus, string>;
}

const ES: ReportCopy = {
  appName: 'Mi Plan AWS',
  weeklyTitle: 'Resumen semanal',
  week: 'Semana',
  hours: 'Horas',
  sessions: 'Sesiones',
  weeklyGoal: 'Meta semanal',
  byCert: 'Por certificación',
  certification: 'Certificación',
  topicsMastered: 'Temas dominados',
  upcoming: 'Próximos hitos',
  fullTitle: 'Reporte completo',
  report: 'Reporte',
  date: 'Fecha',
  summary: 'Resumen',
  metric: 'Métrica',
  value: 'Valor',
  plannedCerts: 'Certificaciones planeadas',
  approved: 'Aprobadas',
  totalHours: 'Horas registradas',
  averageReadiness: 'Readiness media',
  route: 'Ruta',
  level: 'Nivel',
  status: 'Estado',
  readiness: 'Readiness',
  exam: 'Examen',
  noData: '—',
  examFacts: 'Datos del examen',
  phase: 'Fase',
  price: 'Precio',
  guide: 'Guía oficial',
  domains: 'Dominios',
  domain: 'Dominio',
  weight: 'Peso',
  practice: 'Práctica',
  checklist: 'Checklist',
  progress: 'Progreso',
  pending: 'Pendientes',
  topics: 'Temas',
  mockExams: 'Simulacros',
  source: 'Fuente',
  correct: 'Aciertos',
  estimated: 'Estimado',
  duration: 'Duración',
  passed: 'Aprobado',
  failed: 'Reprobado',
  notes: 'Notas',
  review: 'Repaso',
  nextReview: 'Próxima revisión',
  budgetTitle: 'Presupuesto',
  budget: 'Presupuesto',
  totals: 'Totales',
  totalBudget: 'Presupuesto total',
  paid: 'Pagado',
  remaining: 'Pendiente',
  consumed: 'Consumido',
  remainingRoute: 'Ruta restante',
  voucher: 'Voucher',
  effective: 'Efectivo',
  withoutVouchers: 'Sin vouchers',
  withVouchers: 'Con vouchers',
  savings: 'Ahorro',
  items: 'Partidas',
  concept: 'Concepto',
  kind: 'Tipo',
  amount: 'Monto',
  vouchers: 'Vouchers',
  label: 'Etiqueta',
  percent: '%',
  expires: 'Vence',
  monthlySpend: 'Gasto por mes',
  month: 'Mes',
  cumulative: 'Acumulado',
  preparation: 'Preparación',
  practiceGroup: 'Práctica',
  examGroup: 'Examen',
  personalGroup: 'Personal',
  studyTypes: {
    lectura: 'lectura',
    video: 'video',
    lab: 'laboratorio',
    practica: 'práctica',
    repaso: 'repaso',
    proyecto: 'proyecto',
  },
  topicStatuses: {
    pendiente: 'pendiente',
    estudiando: 'en curso',
    repasando: 'repaso',
    dominado: 'dominado',
    archivado: 'archivado',
  },
  planStatuses: {
    no_iniciado: 'no iniciado',
    estudiando: 'estudiando',
    listo: 'listo',
    agendado: 'agendado',
    aprobado: 'aprobado',
    reprobado: 'reprobado',
    saltado: 'saltado',
  },
  attemptKinds: {
    practice_set: 'set de práctica',
    practice_exam: 'simulacro oficial',
    mock: 'simulacro',
    real: 'examen real',
  },
  budgetKinds: {
    examen: 'examen',
    suscripcion: 'suscripción',
    curso: 'curso',
    lab: 'lab',
    otro: 'otro',
  },
  budgetStatuses: {
    planeado: 'planeado',
    pagado: 'pagado',
  },
  voucherStatuses: {
    disponible: 'disponible',
    usado: 'usado',
    vencido: 'vencido',
  },
};

const EN: ReportCopy = {
  appName: 'Mi Plan AWS',
  weeklyTitle: 'Weekly summary',
  week: 'Week',
  hours: 'Hours',
  sessions: 'Sessions',
  weeklyGoal: 'Weekly goal',
  byCert: 'By certification',
  certification: 'Certification',
  topicsMastered: 'Mastered topics',
  upcoming: 'Upcoming milestones',
  fullTitle: 'Full report',
  report: 'Report',
  date: 'Date',
  summary: 'Summary',
  metric: 'Metric',
  value: 'Value',
  plannedCerts: 'Planned certifications',
  approved: 'Approved',
  totalHours: 'Logged hours',
  averageReadiness: 'Average readiness',
  route: 'Route',
  level: 'Level',
  status: 'Status',
  readiness: 'Readiness',
  exam: 'Exam',
  noData: '—',
  examFacts: 'Exam facts',
  phase: 'Phase',
  price: 'Price',
  guide: 'Official guide',
  domains: 'Domains',
  domain: 'Domain',
  weight: 'Weight',
  practice: 'Practice',
  checklist: 'Checklist',
  progress: 'Progress',
  pending: 'Pending',
  topics: 'Topics',
  mockExams: 'Mock exams',
  source: 'Source',
  correct: 'Correct',
  estimated: 'Estimated',
  duration: 'Duration',
  passed: 'Passed',
  failed: 'Failed',
  notes: 'Notes',
  review: 'Review',
  nextReview: 'Next review',
  budgetTitle: 'Budget',
  budget: 'Budget',
  totals: 'Totals',
  totalBudget: 'Total budget',
  paid: 'Paid',
  remaining: 'Remaining',
  consumed: 'Consumed',
  remainingRoute: 'Remaining route',
  voucher: 'Voucher',
  effective: 'Effective',
  withoutVouchers: 'Without vouchers',
  withVouchers: 'With vouchers',
  savings: 'Savings',
  items: 'Items',
  concept: 'Concept',
  kind: 'Type',
  amount: 'Amount',
  vouchers: 'Vouchers',
  label: 'Label',
  percent: '%',
  expires: 'Expires',
  monthlySpend: 'Monthly spend',
  month: 'Month',
  cumulative: 'Cumulative',
  preparation: 'Preparation',
  practiceGroup: 'Practice',
  examGroup: 'Exam',
  personalGroup: 'Personal',
  studyTypes: {
    lectura: 'reading',
    video: 'video',
    lab: 'lab',
    practica: 'practice',
    repaso: 'review',
    proyecto: 'project',
  },
  topicStatuses: {
    pendiente: 'pending',
    estudiando: 'in progress',
    repasando: 'review',
    dominado: 'mastered',
    archivado: 'archived',
  },
  planStatuses: {
    no_iniciado: 'not started',
    estudiando: 'studying',
    listo: 'ready',
    agendado: 'scheduled',
    aprobado: 'approved',
    reprobado: 'failed',
    saltado: 'skipped',
  },
  attemptKinds: {
    practice_set: 'practice set',
    practice_exam: 'official practice exam',
    mock: 'mock exam',
    real: 'real exam',
  },
  budgetKinds: {
    examen: 'exam',
    suscripcion: 'subscription',
    curso: 'course',
    lab: 'lab',
    otro: 'other',
  },
  budgetStatuses: {
    planeado: 'planned',
    pagado: 'paid',
  },
  voucherStatuses: {
    disponible: 'available',
    usado: 'used',
    vencido: 'expired',
  },
};

function copyFor(locale: Locale): ReportCopy {
  return locale === 'en' ? EN : ES;
}

const LEVEL_LABELS: Record<CertLevel, string> = {
  foundational: 'Foundational',
  associate: 'Associate',
  professional: 'Professional',
  specialty: 'Specialty',
  business: 'Business',
};

const PLAN_GLYPHS: Record<PlanStatus, string> = {
  no_iniciado: '○',
  estudiando: '◐',
  listo: '◐',
  agendado: '◐',
  aprobado: '●',
  reprobado: '▲',
  saltado: '›',
};

/* =============================================================================
   Utilidades
   ========================================================================== */

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function oneLine(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cell(text: string): string {
  return oneLine(text).replace(/\|/g, '\\|');
}

function sanitizeMarkdown(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function formatDuration(minutes: number, locale: Locale): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return formatHours(total, locale);
  return locale === 'en' ? `${hours}h ${rest}m` : `${hours} h ${rest} min`;
}

function heading(level: number, text: string): string {
  return `${'#'.repeat(level)} ${text}`;
}

function dateOnly(value: string | null): string | null {
  if (!value) return null;
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  return match ? match[0] : null;
}

const GROUP_ORDER: ChecklistGroup[] = ['preparacion', 'practica', 'examen', 'personal'];

function sortedChecklist(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => {
    const groupA = GROUP_ORDER.indexOf(a.groupId);
    const groupB = GROUP_ORDER.indexOf(b.groupId);
    if (groupA !== groupB) return groupA - groupB;
    if (a.order !== b.order) return a.order - b.order;
    const byTitle = compareText(a.title, b.title);
    return byTitle !== 0 ? byTitle : compareText(a.id, b.id);
  });
}

/* =============================================================================
   Consultas
   ========================================================================== */

interface PlannedCert {
  cert: Certification;
  item: PlanItem;
  readiness: ReadinessResult;
}

function plannedCerts(state: AppState): PlannedCert[] {
  const certById = new Map(state.certifications.map((cert) => [cert.id, cert]));
  const planByCert = new Map<string, PlanItem>();
  for (const item of state.planItems) {
    if (!planByCert.has(item.certId)) planByCert.set(item.certId, item);
  }
  const pairs: { item: PlanItem; cert: Certification }[] = [];
  for (const item of planByCert.values()) {
    const cert = certById.get(item.certId);
    if (cert) pairs.push({ item, cert });
  }
  pairs.sort((a, b) => {
    if (a.cert.phase !== b.cert.phase) return a.cert.phase - b.cert.phase;
    if (a.item.order !== b.item.order) return a.item.order - b.item.order;
    const byCode = compareText(a.cert.code, b.cert.code);
    return byCode !== 0 ? byCode : compareText(a.item.id, b.item.id);
  });
  return pairs.map(({ cert, item }) => ({
    cert,
    item,
    readiness: computeReadiness({
      cert,
      planItem: item,
      attempts: state.attempts.filter((attempt) => attempt.certId === cert.id),
      resources: state.resources,
      sessions: state.studySessions,
    }),
  }));
}

function certShortName(cert: Certification): string {
  let name = cert.name.replace(/^\uFEFF/, '').trim();
  name = name.replace(/^AWS Certified\s+/i, '');
  for (const prefix of [`${cert.code} — `, `${cert.code} - `, `${cert.code}: `]) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length);
      break;
    }
  }
  return name
    .replace(/[–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function certTitle(cert: Certification): string {
  const short = certShortName(cert);
  return short.length > 0 && short !== cert.code ? `${cert.code} — ${short}` : cert.code;
}

function attemptsOf(state: AppState, certId: string): Attempt[] {
  return [...state.attempts]
    .filter((attempt) => attempt.certId === certId)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return compareText(a.id, b.id);
    });
}

function topicsOf(state: AppState, certId: string): Topic[] {
  return [...state.topics]
    .filter((topic) => topic.certId === certId)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const byTitle = compareText(a.title, b.title);
      return byTitle !== 0 ? byTitle : compareText(a.id, b.id);
    });
}

function checklistOf(state: AppState, certId: string): ChecklistItem[] {
  return sortedChecklist(state.checklistItems.filter((item) => item.certId === certId));
}

function sessionsOf(state: AppState, certId: string): StudySession[] {
  return [...state.studySessions]
    .filter((session) => session.certId === certId)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return compareText(a.id, b.id);
    });
}

function notesOf(state: AppState, certId: string): Note[] {
  return [...state.notes]
    .filter((note) => note.certId === certId)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
      return compareText(a.id, b.id);
    });
}

function progressOf(items: ChecklistItem[]): { done: number; total: number } {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return { done, total };
}

function certOf(state: AppState, certId: string | null): Certification | null {
  if (!certId) return null;
  return state.certifications.find((cert) => cert.id === certId) ?? null;
}

/* =============================================================================
   Hitos
   ========================================================================== */

interface Milestone {
  date: string;
  text: string;
}

function milestones(state: AppState, copy: ReportCopy, today: string): Milestone[] {
  const out: Milestone[] = [];

  for (const { cert, item } of plannedCerts(state)) {
    if (item.targetDate && item.targetDate >= today) {
      out.push({ date: item.targetDate, text: `${copy.exam} ${cert.code}` });
    }
  }

  for (const voucher of state.vouchers) {
    if (voucher.status !== 'disponible' || !voucher.expiresAt) continue;
    if (voucher.expiresAt >= today) {
      out.push({ date: voucher.expiresAt, text: `${copy.voucher} ${oneLine(voucher.label)}` });
    }
  }

  for (const topic of state.topics) {
    if (topic.status === 'archivado') continue;
    const date = dateOnly(topic.nextReviewAt);
    if (!date || date < today || date > addDaysToDate(today, 14)) continue;
    const cert = certOf(state, topic.certId);
    out.push({
      date,
      text: `${copy.review} ${oneLine(topic.title)}${cert ? ` · ${cert.code}` : ''}`,
    });
  }

  out.sort((a, b) => {
    if (a.date !== b.date) return compareText(a.date, b.date);
    return compareText(a.text, b.text);
  });
  return out;
}

function milestoneLines(entries: Milestone[]): string {
  if (entries.length === 0) return '';
  return entries.map((entry) => `- ${entry.date} · ${entry.text}`).join('\n');
}

/* =============================================================================
   Resumen semanal
   ========================================================================== */

/**
 * «Copiar resumen semanal»: horas y sesiones de la semana en curso,
 * temas dominados y próximos hitos.
 */
export function renderWeeklySummary(state: AppState, locale: Locale, now: Date): string {
  const copy = copyFor(locale);
  const today = localDate(now);
  const weekStart = startOfWeekMonday(today);
  const weekEnd = addDaysToDate(weekStart, 6);
  const sessions = state.studySessions.filter(
    (session) => session.date >= weekStart && session.date <= weekEnd,
  );
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  const goalMinutes = state.settings.weeklyHoursGoal * 60;

  const blocks: string[] = [heading(1, copy.weeklyTitle)];
  blocks.push(
    `**${copy.week}:** ${weekStart} → ${weekEnd} · **${copy.hours}:** ${formatDuration(
      totalMinutes,
      locale,
    )} (${formatHours(totalMinutes, locale)} · ${totalMinutes} min) · **${copy.sessions}:** ${
      sessions.length
    } · **${copy.weeklyGoal}:** ${formatDuration(goalMinutes, locale)}`,
  );

  if (sessions.length > 0) {
    const byCert = new Map<string, { minutes: number; count: number }>();
    for (const session of sessions) {
      const current = byCert.get(session.certId) ?? { minutes: 0, count: 0 };
      current.minutes += session.minutes;
      current.count += 1;
      byCert.set(session.certId, current);
    }
    const rows = [...byCert.entries()]
      .sort((a, b) => compareText(a[0], b[0]))
      .map(([certId, value]) => {
        const cert = certOf(state, certId);
        const code = cert?.code ?? certId;
        return `| ${code} | ${value.count} | ${formatDuration(value.minutes, locale)} |`;
      });
    blocks.push(
      `${heading(2, copy.byCert)}\n\n| ${copy.certification} | ${copy.sessions} | ${
        copy.hours
      } |\n|---|---:|---:|\n${rows.join('\n')}`,
    );
  }

  const mastered = state.topics
    .filter(
      (topic) =>
        topic.status === 'dominado' &&
        (dateOnly(topic.updatedAt) ?? '') >= weekStart &&
        (dateOnly(topic.updatedAt) ?? '') <= weekEnd,
    )
    .sort((a, b) => compareText(a.title, b.title));
  if (mastered.length > 0) {
    const lines = mastered.map((topic) => {
      const cert = certOf(state, topic.certId);
      return `- ${oneLine(topic.title)}${cert ? ` · ${cert.code}` : ''}`;
    });
    blocks.push(`${heading(2, copy.topicsMastered)}\n\n${lines.join('\n')}`);
  }

  const upcoming = milestones(state, copy, today);
  if (upcoming.length > 0) {
    blocks.push(`${heading(2, copy.upcoming)}\n\n${milestoneLines(upcoming)}`);
  }

  return `${blocks.join('\n\n')}\n`;
}

/* =============================================================================
   Reporte de presupuesto
   ========================================================================== */

function voucherLabel(state: AppState, voucherId: string | null): string {
  if (!voucherId) return '—';
  return state.vouchers.find((voucher) => voucher.id === voucherId)?.label ?? voucherId;
}

interface RouteCostRow {
  certId: string;
  priceUsd: number;
  voucherId: string | null;
  effectiveUsd: number;
}

interface RouteCostProjection {
  rows: RouteCostRow[];
  withoutVouchersUsd: number;
  withVouchersUsd: number;
  savingsUsd: number;
}

/**
 * §8.3 — proyección local para los reportes: un voucher `disponible` y no vencido
 * se consume una sola vez sobre la siguiente certificación pendiente de la ruta.
 */
function routeCostProjection(state: AppState, today: string): RouteCostProjection {
  const available = state.vouchers.filter((voucher) => {
    if (voucher.status !== 'disponible') return false;
    if (voucher.usedForAttemptId) return false;
    if (voucher.expiresAt && daysBetween(today, voucher.expiresAt) < 0) return false;
    return true;
  });
  const queue = [...available];
  const rows: RouteCostRow[] = [];
  for (const { cert, item } of plannedCerts(state)) {
    if (item.status === 'aprobado' || item.status === 'saltado') continue;
    const price = cert.priceUsd ?? 0;
    const voucher = queue.shift() ?? null;
    rows.push({
      certId: cert.id,
      priceUsd: price,
      voucherId: voucher?.id ?? null,
      effectiveUsd: voucher ? Math.round(price * (1 - voucher.percent / 100) * 100) / 100 : price,
    });
  }
  const without = rows.reduce((sum, row) => sum + row.priceUsd, 0);
  const withVouchers = rows.reduce((sum, row) => sum + row.effectiveUsd, 0);
  return {
    rows,
    withoutVouchersUsd: without,
    withVouchersUsd: withVouchers,
    savingsUsd: without - withVouchers,
  };
}

/** Reporte de presupuesto completo para Ajustes > Exportar Markdown. */
export function renderBudgetReport(state: AppState, locale: Locale, now: Date): string {
  const copy = copyFor(locale);
  const today = localDate(now);
  const body = budgetBodyWithToday(state, locale, today, 2);
  return `${heading(1, copy.budgetTitle)}\n\n${body}\n`;
}

function budgetBodyWithToday(
  state: AppState,
  locale: Locale,
  today: string,
  level: number,
): string {
  const copy = copyFor(locale);
  const totals = budgetTotals(state.budgetItems);
  const totalBudget = totals.plannedUsd + totals.paidUsd;
  const consumed = totalBudget > 0 ? totals.paidUsd / totalBudget : 0;
  const blocks: string[] = [];

  blocks.push(
    `${heading(level, copy.totals)}\n\n| ${copy.concept} | ${copy.value} |\n|---|---:|\n| ${
      copy.totalBudget
    } | ${formatCurrency(totalBudget, locale)} |\n| ${copy.paid} | ${formatCurrency(
      totals.paidUsd,
      locale,
    )} |\n| ${copy.remaining} | ${formatCurrency(totals.remainingUsd, locale)} |\n| ${
      copy.consumed
    } | ${formatPercent(consumed, locale)} |`,
  );

  const projection = routeCostProjection(state, today);
  if (projection.rows.length > 0) {
    const rows = projection.rows.map((row) => {
      const cert = certOf(state, row.certId);
      return `| ${cert?.code ?? row.certId} | ${formatCurrency(row.priceUsd, locale)} | ${cell(
        voucherLabel(state, row.voucherId),
      )} | ${formatCurrency(row.effectiveUsd, locale)} |`;
    });
    blocks.push(
      `${heading(level, copy.remainingRoute)}\n\n| ${copy.certification} | ${copy.price} | ${
        copy.voucher
      } | ${copy.effective} |\n|---|---:|---|---:|\n${rows.join('\n')}\n\n**${
        copy.withoutVouchers
      }:** ${formatCurrency(projection.withoutVouchersUsd, locale)} · **${
        copy.withVouchers
      }:** ${formatCurrency(projection.withVouchersUsd, locale)} · **${
        copy.savings
      }:** ${formatCurrency(projection.savingsUsd, locale)}`,
    );
  }

  if (state.budgetItems.length > 0) {
    const items = [...state.budgetItems].sort((a, b) => {
      const da = a.date ?? '9999-99-99';
      const db = b.date ?? '9999-99-99';
      if (da !== db) return compareText(da, db);
      return compareText(a.concept, b.concept);
    });
    const rows = items.map((item: BudgetItem) => {
      const cert = certOf(state, item.certId);
      return `| ${cell(item.concept)} | ${cert?.code ?? '—'} | ${copy.budgetKinds[item.kind]} | ${
        copy.budgetStatuses[item.status]
      } | ${item.date ?? '—'} | ${formatCurrency(item.amountUsd, locale)} |`;
    });
    blocks.push(
      `${heading(level, copy.items)}\n\n| ${copy.concept} | ${copy.certification} | ${
        copy.kind
      } | ${copy.status} | ${copy.date} | ${copy.amount} |\n|---|---|---|:--:|---|---:|\n${rows.join(
        '\n',
      )}`,
    );
  }

  if (state.vouchers.length > 0) {
    const rows = state.vouchers.map((voucher: Voucher) => {
      return `| ${cell(voucher.label)} | ${formatPercent(voucher.percent / 100, locale)} | ${
        copy.voucherStatuses[voucher.status]
      } | ${voucher.expiresAt ?? '—'} |`;
    });
    blocks.push(
      `${heading(level, copy.vouchers)}\n\n| ${copy.label} | ${copy.percent} | ${
        copy.status
      } | ${copy.expires} |\n|---|---:|---|---|\n${rows.join('\n')}`,
    );
  }

  const spend = cumulativeSpend(state.budgetItems);
  if (spend.length > 0) {
    const rows = spend.map((row) => `| ${row.month} | ${formatCurrency(row.amount, locale)} |`);
    blocks.push(
      `${heading(level, copy.monthlySpend)}\n\n| ${copy.month} | ${copy.cumulative} |\n|---|---:|\n${rows.join(
        '\n',
      )}`,
    );
  }

  return blocks.join('\n\n');
}

/* =============================================================================
   Reporte completo
   ========================================================================== */

function certFactsSection(planned: PlannedCert, locale: Locale): string {
  const copy = copyFor(locale);
  const { cert, item, readiness } = planned;
  const lines: string[] = [heading(3, copy.examFacts)];
  lines.push(`- **${copy.level}:** ${LEVEL_LABELS[cert.level]} · **${copy.phase}:** ${cert.phase}`);
  if (cert.priceUsd !== null) lines.push(`- **${copy.price}:** ${formatCurrency(cert.priceUsd, locale)}`);
  lines.push(
    `- **${copy.status}:** ${copy.planStatuses[item.status]} · **${copy.readiness}:** ${formatPercent(
      readiness.score / 100,
      locale,
    )}`,
  );
  if (item.targetDate) lines.push(`- **${copy.exam}:** ${item.targetDate}`);
  const guide = cert.examGuideUrl || cert.officialUrl;
  if (guide.length > 0) lines.push(`- **${copy.guide}:** ${guide}`);
  return lines.join('\n');
}

function certDomainsSection(planned: PlannedCert, state: AppState, locale: Locale): string {
  const copy = copyFor(locale);
  const { cert, readiness } = planned;
  if (cert.domains.length === 0) return '';
  const rows = cert.domains.map((domain) => {
    const accuracy = readiness.accuracyByDomain[domain.id] ?? null;
    const topics = state.topics.filter(
      (topic) =>
        topic.certId === cert.id &&
        topic.domainId === domain.id &&
        topic.status !== 'archivado',
    );
    const pending = topics.filter((topic) => topic.status !== 'dominado').length;
    return `| ${cell(domain.name)} | ${formatPercent(domain.weight, locale)} | ${
      accuracy === null ? copy.noData : formatPercent(accuracy, locale)
    } | ${pending}/${topics.length} |`;
  });
  return `${heading(3, copy.domains)}\n\n| ${copy.domain} | ${copy.weight} | ${
    copy.practice
  } | ${copy.topics} |\n|---|---:|---:|---:|\n${rows.join('\n')}`;
}

function certChecklistSection(state: AppState, cert: Certification, locale: Locale): string {
  const copy = copyFor(locale);
  const items = checklistOf(state, cert.id);
  if (items.length === 0) return '';
  const progress = progressOf(items);
  const blocks: string[] = [];
  blocks.push(
    `${heading(3, copy.checklist)}\n\n**${copy.progress}:** ${progress.done}/${progress.total} (${formatPercent(
      progress.total > 0 ? progress.done / progress.total : 0,
      locale,
    )})`,
  );
  const pending = items.filter((item) => !item.done);
  if (pending.length > 0) {
    const lines = pending.map((item) => {
      const due = item.dueDate ? ` · ${item.dueDate}` : '';
      return `- [ ] ${cell(item.title)}${due}`;
    });
    blocks.push(`${heading(4, copy.pending)}\n\n${lines.join('\n')}`);
  }
  return blocks.join('\n\n');
}

function certTopicsSection(state: AppState, cert: Certification, locale: Locale): string {
  const copy = copyFor(locale);
  const topics = topicsOf(state, cert.id).filter((topic) => topic.status !== 'archivado');
  if (topics.length === 0) return '';
  const lines = topics.map((topic) => {
    const review = dateOnly(topic.nextReviewAt);
    return `- ${oneLine(topic.title)} · ${copy.topicStatuses[topic.status]}${
      review ? ` · ${copy.nextReview} ${review}` : ''
    }`;
  });
  return `${heading(3, copy.topics)}\n\n${lines.join('\n')}`;
}

function certAttemptsSection(state: AppState, cert: Certification, locale: Locale): string {
  const copy = copyFor(locale);
  const attempts = attemptsOf(state, cert.id);
  if (attempts.length === 0) return '';
  const rows = attempts.map((attempt) => {
    const score = attemptScore(attempt);
    const passed = attempt.passed ?? attemptPassed(attempt, cert.passingScore);
    const correct =
      attempt.correct !== null && attempt.total !== null
        ? `${attempt.correct}/${attempt.total}`
        : copy.noData;
    const result = passed === true ? copy.passed : passed === false ? copy.failed : copy.noData;
    const source =
      attempt.source.trim().length > 0 ? attempt.source : copy.attemptKinds[attempt.kind];
    return `| ${attempt.date} | ${cell(source)} | ${correct} | ${
      score === null ? copy.noData : score
    } | ${result} |`;
  });
  return `${heading(3, copy.mockExams)}\n\n| ${copy.date} | ${copy.source} | ${
    copy.correct
  } | ${copy.estimated} | ${copy.status} |\n|---|---|---:|---:|---|\n${rows.join('\n')}`;
}

function certSessionsSection(state: AppState, cert: Certification, locale: Locale): string {
  const copy = copyFor(locale);
  const sessions = sessionsOf(state, cert.id);
  if (sessions.length === 0) return '';
  const minutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  const recent = sessions.slice(-5).reverse();
  const lines = recent.map((session) => {
    return `- ${session.date} · ${formatDuration(session.minutes, locale)} · ${
      copy.studyTypes[session.type]
    }`;
  });
  return `${heading(3, copy.sessions)}\n\n**${copy.sessions}:** ${
    sessions.length
  } · **${copy.hours}:** ${formatDuration(minutes, locale)}\n\n${lines.join('\n')}`;
}

function certNotesSection(state: AppState, cert: Certification, locale: Locale): string {
  const copy = copyFor(locale);
  const notes = notesOf(state, cert.id);
  if (notes.length === 0) return '';
  const blocks = notes.map((note) => {
    const body = sanitizeMarkdown(note.bodyMd);
    return `${heading(4, oneLine(note.title))}${body.length > 0 ? `\n\n${body}` : ''}`;
  });
  return `${heading(3, copy.notes)}\n\n${blocks.join('\n\n')}`;
}

/** Reporte Markdown completo para Ajustes > Exportar Markdown. */
export function renderFullReport(state: AppState, locale: Locale, now: Date): string {
  const copy = copyFor(locale);
  const today = localDate(now);
  const planned = plannedCerts(state);
  const approved = planned.filter((entry) => entry.item.status === 'aprobado').length;
  const totalMinutes = state.studySessions.reduce((sum, session) => sum + session.minutes, 0);
  const average =
    planned.length > 0
      ? Math.round(planned.reduce((sum, entry) => sum + entry.readiness.score, 0) / planned.length)
      : 0;
  const totals = budgetTotals(state.budgetItems);
  const totalBudget = totals.plannedUsd + totals.paidUsd;

  const blocks: string[] = [
    heading(1, `${copy.appName} — ${copy.fullTitle}`),
    `**${copy.date}:** ${today} · **${copy.plannedCerts}:** ${planned.length} · **${
      copy.approved
    }:** ${approved} · **${copy.totalHours}:** ${formatDuration(totalMinutes, locale)}`,
  ];

  blocks.push(
    `${heading(2, copy.summary)}\n\n| ${copy.metric} | ${copy.value} |\n|---|---:|\n| ${
      copy.plannedCerts
    } | ${planned.length} |\n| ${copy.approved} | ${approved} |\n| ${copy.sessions} | ${
      state.studySessions.length
    } |\n| ${copy.totalHours} | ${formatDuration(totalMinutes, locale)} |\n| ${
      copy.averageReadiness
    } | ${formatPercent(average / 100, locale)} |\n| ${copy.totalBudget} | ${formatCurrency(
      totalBudget,
      locale,
    )} |`,
  );

  if (planned.length > 0) {
    const rows = planned.map(({ cert, item, readiness }) => {
      return `| ${item.order} | ${cert.code} | ${LEVEL_LABELS[cert.level]} | ${
        PLAN_GLYPHS[item.status]
      } | ${formatPercent(readiness.score / 100, locale)} | ${item.targetDate ?? copy.noData} |`;
    });
    blocks.push(
      `${heading(2, copy.route)}\n\n| # | ${copy.certification} | ${copy.level} | ${
        copy.status
      } | ${copy.readiness} | ${copy.exam} |\n|--:|---|---|:--:|---:|---|\n${rows.join('\n')}`,
    );
  }

  for (const entry of planned) {
    const sections: string[] = [heading(2, certTitle(entry.cert))];
    sections.push(certFactsSection(entry, locale));
    const domains = certDomainsSection(entry, state, locale);
    if (domains.length > 0) sections.push(domains);
    const checklist = certChecklistSection(state, entry.cert, locale);
    if (checklist.length > 0) sections.push(checklist);
    const topics = certTopicsSection(state, entry.cert, locale);
    if (topics.length > 0) sections.push(topics);
    const attempts = certAttemptsSection(state, entry.cert, locale);
    if (attempts.length > 0) sections.push(attempts);
    const sessions = certSessionsSection(state, entry.cert, locale);
    if (sessions.length > 0) sections.push(sessions);
    const notes = certNotesSection(state, entry.cert, locale);
    if (notes.length > 0) sections.push(notes);
    blocks.push(sections.join('\n\n'));
  }

  if (state.budgetItems.length > 0 || planned.length > 0) {
    blocks.push(`${heading(2, copy.budget)}\n\n${budgetBodyWithToday(state, locale, today, 3)}`);
  }

  const upcoming = milestones(state, copy, today);
  if (upcoming.length > 0) {
    blocks.push(`${heading(2, copy.upcoming)}\n\n${milestoneLines(upcoming)}`);
  }

  return `${blocks.join('\n\n')}\n`;
}
