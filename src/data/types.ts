/* =============================================================================
   Modelo de datos — espejo exacto de la especificación §5.
   Fechas: ISO-8601 UTC salvo `date` (YYYY-MM-DD en hora local) y `updatedOn`.
   Horas y duraciones: minutos. Dinero: USD.
   ========================================================================== */

export const PHASES = [0, 1, 2, 3, 4] as const;
export type Phase = (typeof PHASES)[number];

export type CertLevel = 'foundational' | 'associate' | 'professional' | 'specialty' | 'business';
export type Lifecycle = 'available' | 'beta' | 'retiring' | 'retired';
export type PlanStatus =
  | 'no_iniciado'
  | 'estudiando'
  | 'listo'
  | 'agendado'
  | 'aprobado'
  | 'reprobado'
  | 'saltado';
export type ResourceType =
  | 'curso'
  | 'lab'
  | 'workshop'
  | 'badge'
  | 'practice_questions'
  | 'practice_exam'
  | 'video'
  | 'libro'
  | 'doc';
export type ResourceStatus = 'pendiente' | 'en_curso' | 'completado' | 'descartado';
export type StudyType = 'lectura' | 'video' | 'lab' | 'practica' | 'repaso' | 'proyecto';
export type AttemptKind = 'practice_set' | 'practice_exam' | 'mock' | 'real';
export type VoucherSource = 'aprobacion' | 'campana' | 'beta' | 'manual';
export type VoucherStatus = 'disponible' | 'usado' | 'vencido';
export type BudgetKind = 'examen' | 'suscripcion' | 'curso' | 'lab' | 'otro';
export type BudgetStatus = 'planeado' | 'pagado';
export type TopicStatus = 'pendiente' | 'estudiando' | 'repasando' | 'dominado' | 'archivado';
export type ChecklistGroup = 'preparacion' | 'practica' | 'examen' | 'personal';
export type Recurrence = 'ninguna' | 'diaria' | 'semanal' | 'mensual';
export type NoteSource = 'manual' | 'sesion' | 'simulacro' | 'import';
export type ReminderType = 'tema' | 'checklist' | 'examen' | 'voucher' | 'inactividad' | 'custom';
export type ReminderChannel = 'inapp' | 'browser' | 'ics';
export type ReminderStatus = 'pendiente' | 'enviado' | 'hecho' | 'pospuesto' | 'descartado';
export type Theme = 'dark' | 'light' | 'system';
export type Locale = 'es' | 'en';
export type Confidence = 1 | 2 | 3 | 4 | 5;
export type Priority = 1 | 2 | 3;

export interface Domain {
  id: string;
  name: string;
  weight: number; // 0..1, la suma de los dominios de una certificación es 1
}

export interface Certification {
  id: string; // "CLF-C02"
  code: string;
  name: string;
  level: CertLevel;
  phase: Phase;
  priceUsd: number | null;
  durationMin: number;
  questions: number;
  scoredQuestions: number | null;
  passingScore: number;
  domains: Domain[];
  prerequisites: string[];
  /**
   * Cómo se leen los prerrequisitos: `all` (por defecto) exige todos; `any` basta
   * con uno. El Anexo A usa «DVA-C02 o SOA-C03» en DOP-C02 y SCS-C03.
   */
  prerequisiteMode?: 'all' | 'any';
  recommendedExperience: string;
  officialUrl: string;
  examGuideUrl: string;
  lifecycle: Lifecycle;
  retirementDate: string | null; // ISO date
  verifiedOn: string; // "2026-10-18"
  notes: string;
}

export interface PlanItem {
  id: string;
  certId: string;
  order: number;
  status: PlanStatus;
  targetDate: string | null;
  hoursPlanned: number;
  hoursDone: number;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  certId: string | null;
  title: string;
  provider: string;
  url: string;
  type: ResourceType;
  isFree: boolean;
  costUsd: number;
  domainIds: string[];
  status: ResourceStatus;
  estimatedMin: number | null;
  note: string;
}

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  certId: string;
  domainId: string | null;
  minutes: number;
  type: StudyType;
  confidence: Confidence;
  notes: string;
  createdAt: string;
}

export interface AttemptBreakdown {
  domainId: string;
  correct: number;
  total: number;
}

export interface Attempt {
  id: string;
  certId: string;
  date: string;
  kind: AttemptKind;
  source: string;
  correct: number | null;
  total: number | null;
  score: number | null;
  estimatedScore: number | null;
  passed: boolean | null;
  durationMin: number;
  costUsd: number;
  voucherId: string | null;
  breakdown: AttemptBreakdown[];
  notes: string;
  /** F3.2 — preguntas del banco propio usadas en un simulacro (para revisión). */
  questionIds?: string[];
}

/**
 * F3.2 — banco de preguntas propio. Nunca se importan preguntas reales de examen:
 * solo preguntas escritas por el usuario o de práctica pública.
 */
export interface Question {
  id: string;
  certId: string;
  domainId: string | null;
  prompt: string;
  options: string[];
  /** Índice 0..n-1 de la opción correcta. */
  correctIndex: number;
  explanation: string;
  source: string;
  tags: string[];
  archived?: boolean;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  certId: string;
  domainId: string | null;
  front: string;
  back: string;
  ease: number;
  intervalDays: number;
  dueDate: string; // YYYY-MM-DD
  reps: number;
  lapses: number;
  createdAt: string;
}

export interface Voucher {
  id: string;
  label: string;
  percent: number;
  source: VoucherSource;
  expiresAt: string | null;
  usedForAttemptId: string | null;
  status: VoucherStatus;
}

export interface BudgetItem {
  id: string;
  concept: string;
  certId: string | null;
  kind: BudgetKind;
  amountUsd: number;
  status: BudgetStatus;
  date: string | null;
  voucherId: string | null;
  note: string;
}

export interface Topic {
  id: string;
  certId: string;
  domainId: string | null;
  title: string;
  descriptionMd: string;
  status: TopicStatus;
  priority: Priority;
  sourceResourceId: string | null;
  confidence: Confidence | null;
  ease: number;
  intervalDays: number;
  nextReviewAt: string | null; // ISO con hora
  lastStudiedAt: string | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  certId: string;
  topicId: string | null;
  groupId: ChecklistGroup;
  title: string;
  done: boolean;
  doneAt: string | null;
  dueDate: string | null;
  order: number;
  recurrence: Recurrence;
  templateKey: string | null;
  createdAt: string;
  /** §7.10/§8.9: los ítems archivados no cuentan en el progreso ni en "Hoy". */
  archived?: boolean;
}

export interface Note {
  id: string;
  certId: string | null;
  domainId: string | null;
  topicId: string | null;
  title: string;
  bodyMd: string;
  tags: string[];
  pinned: boolean;
  source: NoteSource;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  type: ReminderType;
  refId: string | null;
  title: string;
  dueAt: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  snoozedUntil: string | null;
  createdAt: string;
}

export interface ExportProfile {
  id: string;
  name: string;
  folder: string;
  includeFrontmatter: boolean;
  includeWikilinks: boolean;
  includeNotes: boolean;
  includeSessions: boolean;
  includeBudget: boolean;
  includeChecklist: boolean;
  dataviewBlocks: boolean;
  taskDates: boolean;
  createdAt: string;
}

export interface Settings {
  id: 'app';
  displayName: string;
  weeklyHoursGoal: number;
  studyDays: number[]; // 0 (domingo) .. 6 (sábado)
  startDate: string; // YYYY-MM-DD
  activeCertId: string | null;
  theme: Theme;
  locale: Locale;
  passphraseEnabled: boolean;
  schemaVersion: number;
  fontMode: 'terminal' | 'lectura';
  fontScale: number; // 0.9 .. 1.3
  remindersEnabled: boolean;
  dailyReminderTime: string; // "19:00"
  quietHours: { from: string; to: string };
  maxRemindersPerDay: number;
  defaultExportProfileId: string | null;
}

/** Estado completo de la app: la entrada de toda la lógica de dominio. */
export interface AppState {
  certifications: Certification[];
  planItems: PlanItem[];
  resources: Resource[];
  studySessions: StudySession[];
  attempts: Attempt[];
  flashcards: Flashcard[];
  vouchers: Voucher[];
  budgetItems: BudgetItem[];
  topics: Topic[];
  checklistItems: ChecklistItem[];
  notes: Note[];
  reminders: Reminder[];
  exportProfiles: ExportProfile[];
  questions: Question[];
  settings: Settings;
}

export type TableName = keyof Omit<AppState, 'settings'>;
