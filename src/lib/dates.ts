import type { Locale } from '@/data/types';

/** Zona horaria fija del producto (no cambia con el idioma). */
export const TZ = 'America/Bogota';

export const localeTag = (locale: Locale): string => (locale === 'en' ? 'en-US' : 'es-CO');

/** Fecha local (YYYY-MM-DD) en la zona del producto. */
export function localDate(now: Date = new Date(), tz: string = TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Hora local (HH:mm) en la zona del producto. */
export function localTime(now: Date = new Date(), tz: string = TZ): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

/** ISO completa en la zona del producto con el desplazamiento aplicado: 2026-10-18T18:32:00-05:00 */
export function localIso(now: Date = new Date(), tz: string = TZ): string {
  const date = localDate(now, tz);
  const time = localTime(now, tz);
  const offset = tzOffset(tz, now);
  return `${date}T${time}:00${offset}`;
}

function tzOffset(tz: string, date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-05:00';
  const match = /GMT([+-]\d{2}:\d{2})/.exec(name);
  return match ? match[1] : '-05:00';
}

/** Suma días a una fecha YYYY-MM-DD sin cruzar husos horarios. */
export function addDaysToDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Construye un ISO con hora local del producto a partir de YYYY-MM-DD y "HH:mm". */
export function dateTimeInTz(date: string, time: string, tz: string = TZ): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  // Bogotá es UTC-5 sin horario de verano: se calcula el instante exacto.
  const guess = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  const offsetMinutes = tzOffsetMinutes(tz, new Date(guess));
  return new Date(guess - offsetMinutes * 60_000).toISOString();
}

function tzOffsetMinutes(tz: string, date: Date): number {
  const offset = tzOffset(tz, date);
  const sign = offset.startsWith('-') ? -1 : 1;
  const [hh, mm] = offset.slice(1).split(':').map(Number);
  return sign * ((hh ?? 0) * 60 + (mm ?? 0));
}

/** Diferencia en días calendario entre dos YYYY-MM-DD. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Lunes de la semana de `date` (corte semanal lunes–domingo). */
export function startOfWeekMonday(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const day = dt.getUTCDay(); // 0 domingo .. 6 sábado
  const delta = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/** Día de la semana 0..6 (0 = domingo) de un YYYY-MM-DD. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

export function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
