import { useLiveQuery } from 'dexie-react-hooks';
import type { Table } from 'dexie';
import { getDb } from './db';
import { defaultSettings } from './seed';
import type { AppState, Settings } from './types';

export const EMPTY_STATE: AppState = {
  certifications: [],
  planItems: [],
  resources: [],
  studySessions: [],
  attempts: [],
  flashcards: [],
  vouchers: [],
  budgetItems: [],
  topics: [],
  checklistItems: [],
  notes: [],
  reminders: [],
  exportProfiles: [],
  questions: [],
  settings: defaultSettings(new Date()),
};

/** Estado completo reactivo (IndexedDB → React). */
export function useAppState(): { state: AppState; ready: boolean } {
  const state = useLiveQuery(async () => {
    const db = getDb();
    const [
      certifications,
      planItems,
      resources,
      studySessions,
      attempts,
      flashcards,
      vouchers,
      budgetItems,
      topics,
      checklistItems,
      notes,
      reminders,
      exportProfiles,
      questions,
      settings,
    ] = await Promise.all([
      db.certifications.toArray(),
      db.planItems.toArray(),
      db.resources.toArray(),
      db.studySessions.toArray(),
      db.attempts.toArray(),
      db.flashcards.toArray(),
      db.vouchers.toArray(),
      db.budgetItems.toArray(),
      db.topics.toArray(),
      db.checklistItems.toArray(),
      db.notes.toArray(),
      db.reminders.toArray(),
      db.exportProfiles.toArray(),
      db.questions.toArray(),
      db.settings.get('app'),
    ]);
    const built: AppState = {
      certifications,
      planItems,
      resources,
      studySessions,
      attempts,
      flashcards,
      vouchers,
      budgetItems,
      topics,
      checklistItems,
      notes,
      reminders,
      exportProfiles,
      questions,
      settings: settings ?? defaultSettings(new Date()),
    };
    return built;
  }, []);

  // Solo el estado serializado se expone: evita re-render por cambios de identidad.
  return { state: state ?? EMPTY_STATE, ready: state !== undefined };
}

export function useSettings(): Settings {
  const { state } = useAppState();
  return state.settings;
}

let counter = 0;

/** Id estable y legible: `ses-1734567890-3`. */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function upsert<T extends { id: string }>(table: Table<T, string>, row: T): Promise<void> {
  await table.put(row);
}

export async function removeById<T>(table: Table<T, string>, id: string): Promise<void> {
  await table.delete(id);
}

/** Guarda los ajustes (registro único `app`). */
export async function saveSettings(settings: Settings): Promise<void> {
  await getDb().settings.put({ ...settings, id: 'app' });
}

/** Borra todo (doble confirmación en la UI, §7.8). */
export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.tables, async () => {
    await Promise.all([
      db.certifications.clear(),
      db.planItems.clear(),
      db.resources.clear(),
      db.studySessions.clear(),
      db.attempts.clear(),
      db.flashcards.clear(),
      db.vouchers.clear(),
      db.budgetItems.clear(),
      db.topics.clear(),
      db.checklistItems.clear(),
      db.notes.clear(),
      db.reminders.clear(),
      db.exportProfiles.clear(),
      db.settings.clear(),
    ]);
  });
}

/** Certificación por código (para chips y enlaces). */
export function certById(state: AppState, certId: string | null | undefined) {
  if (!certId) return undefined;
  return state.certifications.find((c) => c.id === certId);
}

export function domainById(state: AppState, certId: string, domainId: string | null | undefined) {
  if (!domainId) return undefined;
  return certById(state, certId)?.domains.find((d) => d.id === domainId);
}
