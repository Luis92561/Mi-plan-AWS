import Dexie, { type Table, type Transaction } from 'dexie';
import type {
  Attempt,
  BudgetItem,
  Certification,
  ChecklistItem,
  ExportProfile,
  Flashcard,
  Note,
  PlanItem,
  Question,
  Reminder,
  Resource,
  Settings,
  StudySession,
  Topic,
  Voucher,
} from './types';
import { convertLegacyTasks, type LegacyTask } from './migrations';

export const DB_NAME = 'miplan-aws';
export const SCHEMA_VERSION = 3;

/**
 * Esquema v1 — incluía la tabla heredada `tasks` (versiones previas de la app).
 * Se exporta para poder probar la migración 1 → 2 con `fake-indexeddb`.
 */
export const SCHEMA_V1 = {
  certifications: 'id, code, phase, level, lifecycle',
  planItems: 'id, certId, order, status',
  resources: 'id, certId, type, status, [certId+type]',
  studySessions: 'id, date, certId, type, [certId+date]',
  attempts: 'id, certId, date, kind, [certId+date]',
  flashcards: 'id, certId, dueDate, domainId',
  vouchers: 'id, status, expiresAt',
  budgetItems: 'id, status, certId, kind',
  topics: 'id, certId, status, nextReviewAt, priority, [certId+status]',
  checklistItems: 'id, certId, topicId, done, groupId, dueDate, templateKey, [certId+done]',
  notes: 'id, certId, domainId, topicId, pinned, *tags',
  reminders: 'id, dueAt, status, type, refId',
  exportProfiles: 'id, name',
  settings: 'id',
  tasks: '++id, done, dueDate',
} as const;

/** Cambios de la v2: se elimina `tasks` y se añade el índice `order` al checklist. */
export const SCHEMA_V2_DIFF = {
  tasks: null,
  checklistItems: 'id, certId, topicId, done, groupId, dueDate, templateKey, [certId+done], order',
} as const;

/** v3 (F3.2): banco de preguntas propio, por certificación y dominio. */
export const SCHEMA_V3_DIFF = {
  questions: 'id, certId, domainId, archived, [certId+domainId]',
} as const;

export class MiPlanDb extends Dexie {
  certifications!: Table<Certification, string>;
  planItems!: Table<PlanItem, string>;
  resources!: Table<Resource, string>;
  studySessions!: Table<StudySession, string>;
  attempts!: Table<Attempt, string>;
  flashcards!: Table<Flashcard, string>;
  vouchers!: Table<Voucher, string>;
  budgetItems!: Table<BudgetItem, string>;
  topics!: Table<Topic, string>;
  checklistItems!: Table<ChecklistItem, string>;
  notes!: Table<Note, string>;
  reminders!: Table<Reminder, string>;
  exportProfiles!: Table<ExportProfile, string>;
  questions!: Table<Question, string>;
  settings!: Table<Settings, string>;

  constructor(name = DB_NAME) {
    super(name);

    this.version(1).stores(SCHEMA_V1);

    /**
     * v2 — elimina la tabla heredada `tasks` y convierte cada tarea en un
     * `checklistItem` del grupo `personal`. Nunca borra datos del usuario.
     */
    this.version(2)
      .stores(SCHEMA_V2_DIFF)
      .upgrade(async (tx) => {
        const legacy = await readLegacyTasks(tx);
        if (legacy.length === 0) return;
        const items = convertLegacyTasks(legacy, new Date().toISOString());
        await tx.table('checklistItems').bulkPut(items);
      });

    /** v3 (F3.2) — añade el banco de preguntas propio; no toca datos existentes. */
    this.version(3).stores(SCHEMA_V3_DIFF);
  }
}

async function readLegacyTasks(tx: Transaction): Promise<LegacyTask[]> {
  // Durante la migración la tabla `tasks` puede existir en la versión anterior
  // aunque ya no esté en el esquema actual: se intenta leer y, si no está, no pasa nada.
  try {
    return (await tx.table('tasks').toArray()) as LegacyTask[];
  } catch {
    return [];
  }
}

let instance: MiPlanDb | null = null;

/** Instancia única de la base (en tests se reemplaza por una con nombre distinto). */
export function getDb(): MiPlanDb {
  if (!instance) instance = new MiPlanDb();
  return instance;
}

export function resetDbInstanceForTests(): void {
  instance?.close();
  instance = null;
}
