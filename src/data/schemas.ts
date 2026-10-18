import { z } from 'zod';

/* Validación estricta del respaldo JSON (§7.8, §10). Los mismos esquemas
   validan el import. Nunca se ejecuta nada del archivo: solo se valida. */

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024; // 20 MB

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha YYYY-MM-DD');
const isoStamp = z.string().min(10);
const confidence = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const priority = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const domainSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  weight: z.number().min(0).max(1),
});

export const certificationSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  level: z.enum(['foundational', 'associate', 'professional', 'specialty', 'business']),
  phase: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  priceUsd: z.number().nullable(),
  durationMin: z.number().nonnegative(),
  questions: z.number().nonnegative(),
  scoredQuestions: z.number().nullable(),
  passingScore: z.number(),
  domains: z.array(domainSchema),
  prerequisites: z.array(z.string()),
  prerequisiteMode: z.enum(['all', 'any']).optional(),
  recommendedExperience: z.string(),
  officialUrl: z.string(),
  examGuideUrl: z.string(),
  lifecycle: z.enum(['available', 'beta', 'retiring', 'retired']),
  retirementDate: isoDate.nullable(),
  verifiedOn: isoDate,
  notes: z.string(),
});

export const planItemSchema = z.object({
  id: z.string().min(1),
  certId: z.string().min(1),
  order: z.number(),
  status: z.enum(['no_iniciado', 'estudiando', 'listo', 'agendado', 'aprobado', 'reprobado', 'saltado']),
  targetDate: isoDate.nullable(),
  hoursPlanned: z.number().nonnegative(),
  hoursDone: z.number().nonnegative(),
  createdAt: isoStamp,
  updatedAt: isoStamp,
});

export const resourceSchema = z.object({
  id: z.string().min(1),
  certId: z.string().nullable(),
  title: z.string(),
  provider: z.string(),
  url: z.string(),
  type: z.enum(['curso', 'lab', 'workshop', 'badge', 'practice_questions', 'practice_exam', 'video', 'libro', 'doc']),
  isFree: z.boolean(),
  costUsd: z.number().nonnegative(),
  domainIds: z.array(z.string()),
  status: z.enum(['pendiente', 'en_curso', 'completado', 'descartado']),
  estimatedMin: z.number().nullable(),
  note: z.string(),
});

export const studySessionSchema = z.object({
  id: z.string().min(1),
  date: isoDate,
  certId: z.string().min(1),
  domainId: z.string().nullable(),
  minutes: z.number().positive(),
  type: z.enum(['lectura', 'video', 'lab', 'practica', 'repaso', 'proyecto']),
  confidence,
  notes: z.string(),
  createdAt: isoStamp,
});

export const attemptSchema = z.object({
  id: z.string().min(1),
  certId: z.string().min(1),
  date: isoDate,
  kind: z.enum(['practice_set', 'practice_exam', 'mock', 'real']),
  source: z.string(),
  correct: z.number().nullable(),
  total: z.number().nullable(),
  score: z.number().nullable(),
  estimatedScore: z.number().nullable(),
  passed: z.boolean().nullable(),
  durationMin: z.number().nonnegative(),
  costUsd: z.number().nonnegative(),
  voucherId: z.string().nullable(),
  breakdown: z.array(
    z.object({ domainId: z.string(), correct: z.number().nonnegative(), total: z.number().nonnegative() }),
  ),
  notes: z.string(),
});

export const flashcardSchema = z.object({
  id: z.string().min(1),
  certId: z.string().min(1),
  domainId: z.string().nullable(),
  front: z.string(),
  back: z.string(),
  ease: z.number(),
  intervalDays: z.number(),
  dueDate: isoDate,
  reps: z.number(),
  lapses: z.number(),
  createdAt: isoStamp,
});

export const voucherSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  percent: z.number().min(0).max(100),
  source: z.enum(['aprobacion', 'campana', 'beta', 'manual']),
  expiresAt: isoDate.nullable(),
  usedForAttemptId: z.string().nullable(),
  status: z.enum(['disponible', 'usado', 'vencido']),
});

export const budgetItemSchema = z.object({
  id: z.string().min(1),
  concept: z.string(),
  certId: z.string().nullable(),
  kind: z.enum(['examen', 'suscripcion', 'curso', 'lab', 'otro']),
  amountUsd: z.number(),
  status: z.enum(['planeado', 'pagado']),
  date: isoDate.nullable(),
  voucherId: z.string().nullable(),
  note: z.string(),
});

export const topicSchema = z.object({
  id: z.string().min(1),
  certId: z.string().min(1),
  domainId: z.string().nullable(),
  title: z.string().min(1),
  descriptionMd: z.string(),
  status: z.enum(['pendiente', 'estudiando', 'repasando', 'dominado', 'archivado']),
  priority,
  sourceResourceId: z.string().nullable(),
  confidence: confidence.nullable(),
  ease: z.number(),
  intervalDays: z.number(),
  nextReviewAt: isoStamp.nullable(),
  lastStudiedAt: isoStamp.nullable(),
  reviewCount: z.number(),
  createdAt: isoStamp,
  updatedAt: isoStamp,
});

export const checklistItemSchema = z.object({
  id: z.string().min(1),
  certId: z.string().min(1),
  topicId: z.string().nullable(),
  groupId: z.enum(['preparacion', 'practica', 'examen', 'personal']),
  title: z.string().min(1),
  done: z.boolean(),
  doneAt: isoStamp.nullable(),
  dueDate: isoDate.nullable(),
  order: z.number(),
  recurrence: z.enum(['ninguna', 'diaria', 'semanal', 'mensual']),
  templateKey: z.string().nullable(),
  createdAt: isoStamp,
  archived: z.boolean().optional(),
});

export const noteSchema = z.object({
  id: z.string().min(1),
  certId: z.string().nullable(),
  domainId: z.string().nullable(),
  topicId: z.string().nullable(),
  title: z.string(),
  bodyMd: z.string(),
  tags: z.array(z.string()),
  pinned: z.boolean(),
  source: z.enum(['manual', 'sesion', 'simulacro', 'import']),
  createdAt: isoStamp,
  updatedAt: isoStamp,
});

export const reminderSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['tema', 'checklist', 'examen', 'voucher', 'inactividad', 'custom']),
  refId: z.string().nullable(),
  title: z.string(),
  dueAt: isoStamp,
  channel: z.enum(['inapp', 'browser', 'ics']),
  status: z.enum(['pendiente', 'enviado', 'hecho', 'pospuesto', 'descartado']),
  snoozedUntil: isoStamp.nullable(),
  createdAt: isoStamp,
});

export const exportProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  folder: z.string(),
  includeFrontmatter: z.boolean(),
  includeWikilinks: z.boolean(),
  includeNotes: z.boolean(),
  includeSessions: z.boolean(),
  includeBudget: z.boolean(),
  includeChecklist: z.boolean(),
  dataviewBlocks: z.boolean(),
  taskDates: z.boolean(),
  createdAt: isoStamp,
});

export const questionSchema = z.object({
  id: z.string().min(1),
  certId: z.string().min(1),
  domainId: z.string().nullable(),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string(),
  source: z.string(),
  tags: z.array(z.string()),
  archived: z.boolean().optional(),
  createdAt: isoStamp,
});

export const settingsSchema = z.object({
  id: z.literal('app'),
  displayName: z.string(),
  weeklyHoursGoal: z.number().nonnegative(),
  studyDays: z.array(z.number().min(0).max(6)),
  startDate: isoDate,
  activeCertId: z.string().nullable(),
  theme: z.enum(['dark', 'light', 'system']),
  locale: z.enum(['es', 'en']),
  passphraseEnabled: z.boolean(),
  schemaVersion: z.number(),
  fontMode: z.enum(['terminal', 'lectura']),
  fontScale: z.number().min(0.9).max(1.3),
  remindersEnabled: z.boolean(),
  dailyReminderTime: z.string().regex(/^\d{2}:\d{2}$/),
  quietHours: z.object({ from: z.string(), to: z.string() }),
  maxRemindersPerDay: z.number().positive(),
  defaultExportProfileId: z.string().nullable(),
});

export const appDataSchema = z.object({
  certifications: z.array(certificationSchema),
  planItems: z.array(planItemSchema),
  resources: z.array(resourceSchema),
  studySessions: z.array(studySessionSchema),
  attempts: z.array(attemptSchema),
  flashcards: z.array(flashcardSchema),
  vouchers: z.array(voucherSchema),
  budgetItems: z.array(budgetItemSchema),
  topics: z.array(topicSchema),
  checklistItems: z.array(checklistItemSchema),
  notes: z.array(noteSchema),
  reminders: z.array(reminderSchema),
  exportProfiles: z.array(exportProfileSchema),
  questions: z.array(questionSchema).optional().default([]),
  settings: settingsSchema.nullable(),
});

export const backupSchema = z.object({
  app: z.literal('miplan-aws'),
  schemaVersion: z.number(),
  exportedAt: z.string(),
  data: appDataSchema,
});

export type BackupFile = z.infer<typeof backupSchema>;
export type BackupData = z.infer<typeof appDataSchema>;

export interface ParseResult {
  ok: boolean;
  data?: BackupData;
  error?: string;
  /** Se rellenan para mostrar en el resumen previo al import. */
  counts?: Record<string, number>;
}

/** Valida el JSON de respaldo: tamaño, forma y versión. */
export function parseBackupText(text: string): ParseResult {
  if (text.length > MAX_BACKUP_BYTES) {
    return { ok: false, error: 'El archivo supera el límite de 20 MB.' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: `El archivo no es JSON válido: ${(error as Error).message}` };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join('.') ?? 'data';
    return { ok: false, error: `Esquema inválido en «${path}»: ${first?.message ?? 'forma inesperada'}` };
  }
  const data = parsed.data.data;
  const counts: Record<string, number> = {
    certifications: data.certifications.length,
    planItems: data.planItems.length,
    studySessions: data.studySessions.length,
    attempts: data.attempts.length,
    notes: data.notes.length,
    topics: data.topics.length,
    questions: data.questions?.length ?? 0,
  };
  return { ok: true, data, counts };
}
