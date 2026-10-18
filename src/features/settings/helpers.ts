import { localDate } from '@/lib/dates';
import type { TKey } from '@/lib/i18n/shape';

/**
 * Auxiliares de Ajustes (§7.8): nombres de archivo del respaldo, memoria local
 * del último respaldo (no es un dato de negocio: vive en `localStorage`) y
 * etiquetas del resumen de importación.
 */

/** Texto de un error desconocido, sin `any` y sin `console`. */
export function messageOf(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  return String(cause);
}

const LAST_BACKUP_KEY = 'miplan-aws:last-backup';

/** Fecha ISO del último respaldo descargado, si la hay en este navegador. */
export function readLastBackup(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function writeLastBackup(iso: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_BACKUP_KEY, iso);
  } catch {
    /* almacenamiento bloqueado: solo se pierde el recordatorio, no el respaldo */
  }
}

/** Nombre del reporte Markdown; el idioma no cambia el nombre del archivo. */
export function markdownFilename(now: Date = new Date()): string {
  return `miplan-aws-report-${localDate(now)}.md`;
}

/** Filas del resumen de importación, en el orden en que las devuelve `parseBackupFile`. */
export interface CountLabel {
  key: string;
  labelKey: TKey;
}

export const COUNT_LABELS: CountLabel[] = [
  { key: 'certifications', labelKey: 'settings.backup.count.certs' },
  { key: 'planItems', labelKey: 'settings.backup.count.plan' },
  { key: 'studySessions', labelKey: 'settings.backup.count.sessions' },
  { key: 'attempts', labelKey: 'settings.backup.count.attempts' },
  { key: 'notes', labelKey: 'settings.backup.count.notes' },
  { key: 'topics', labelKey: 'settings.backup.count.topics' },
];

/** Validación de "HH:mm" con la misma regla que `buildReminders`. */
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Validación de una fecha `YYYY-MM-DD` real (rechaza 2026-02-31). */
export function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) return false;
  return new Date(time).toISOString().slice(0, 10) === value;
}
