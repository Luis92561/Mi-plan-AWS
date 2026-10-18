import { getDb, SCHEMA_VERSION } from './db';
import { backupSchema, parseBackupText, type BackupData, type ParseResult } from './schemas';
import type { AppState } from './types';

const TABLES = [
  'certifications',
  'planItems',
  'resources',
  'studySessions',
  'attempts',
  'flashcards',
  'vouchers',
  'budgetItems',
  'topics',
  'checklistItems',
  'notes',
  'reminders',
  'exportProfiles',
  'questions',
] as const;

/** Lee el estado completo de la base (sin React). */
export async function readAppState(): Promise<AppState> {
  const db = getDb();
  const settings = await db.settings.get('app');
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
  ]);
  return {
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
    // El respaldo debe incluir ajustes; si no hay registro se exporta sin ellos.
    settings: settings as AppState['settings'],
  };
}

export function buildBackupText(state: AppState, now: Date = new Date()): string {
  const payload = {
    app: 'miplan-aws' as const,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: {
      certifications: state.certifications,
      planItems: state.planItems,
      resources: state.resources,
      studySessions: state.studySessions,
      attempts: state.attempts,
      flashcards: state.flashcards,
      vouchers: state.vouchers,
      budgetItems: state.budgetItems,
      topics: state.topics,
      checklistItems: state.checklistItems,
      notes: state.notes,
      reminders: state.reminders,
      exportProfiles: state.exportProfiles,
      questions: state.questions ?? [],
      settings: state.settings ?? null,
    },
  };
  // Validación de salida: si el esquema cambia y el respaldo no cumple, falla aquí.
  backupSchema.parse(payload);
  return JSON.stringify(payload, null, 2);
}

export function backupFilename(now: Date = new Date()): string {
  return `miplan-aws-${now.toISOString().slice(0, 10)}.json`;
}

export type ImportMode = 'replace' | 'merge';

export interface ImportOutcome {
  ok: boolean;
  imported?: number;
  mode: ImportMode;
  error?: string;
}

/**
 * Importa un respaldo validado.
 *  - `replace`: vacía las tablas y deja exactamente el archivo.
 *  - `merge`: fusiona por id (gana el archivo).
 * Nunca ejecuta nada del archivo: solo escribe datos validados.
 */
export async function importBackup(data: BackupData, mode: ImportMode): Promise<ImportOutcome> {
  const db = getDb();
  let imported = 0;
  await db.transaction('rw', db.tables, async () => {
    if (mode === 'replace') {
      for (const name of TABLES) {
        await db.table(name).clear();
      }
      await db.settings.clear();
    }
    for (const name of TABLES) {
      const rows = (data[name] ?? []) as { id: string }[];
      if (rows.length === 0) continue;
      await db.table(name).bulkPut(rows);
      imported += rows.length;
    }
    if (data.settings) {
      await db.settings.put(data.settings);
      imported += 1;
    }
  });
  return { ok: true, imported, mode };
}

export function parseBackupFile(text: string): ParseResult {
  return parseBackupText(text);
}

/** Descarga un archivo de texto generado en memoria (100 % local). */
export function downloadText(filename: string, content: string, mime = 'application/json'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob): void {
  void shareInNativeShell(filename, blob).then((handled) => {
    if (handled) return;
    // Navegador: descarga normal con un enlace temporal.
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

/**
 * En el APK (Capacitor/Android) el WebView no descarga con `<a download>`: se escribe
 * el archivo en la caché de la app y se abre la hoja de compartir del sistema, que
 * permite guardarlo en Archivos, enviarlo por WhatsApp/correo o abrirlo con la app que
 * corresponda. En el navegador devuelve `false` y se usa la descarga normal.
 */
async function shareInNativeShell(filename: string, blob: Blob): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;

    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const base64 = await toBase64(blob);
    await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
      encoding: undefined,
    });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
    await Share.share({ title: filename, url: uri, dialogTitle: filename });
    // `Encoding` se mantiene importado para futuras exportaciones de texto sin base64.
    void Encoding;
    return true;
  } catch {
    return false;
  }
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}
