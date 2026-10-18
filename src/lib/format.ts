import type { Locale } from '@/data/types';
import { TZ, localeTag } from './dates';

const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat | Intl.PluralRules>();

function dtf(locale: Locale, opts: Intl.DateTimeFormatOptions, key: string): Intl.DateTimeFormat {
  const id = `dtf:${locale}:${key}`;
  const found = cache.get(id);
  if (found) return found as Intl.DateTimeFormat;
  const made = new Intl.DateTimeFormat(localeTag(locale), opts);
  cache.set(id, made);
  return made;
}

function nf(locale: Locale, opts: Intl.NumberFormatOptions, key: string): Intl.NumberFormat {
  const id = `nf:${locale}:${key}`;
  const found = cache.get(id);
  if (found) return found as Intl.NumberFormat;
  const made = new Intl.NumberFormat(localeTag(locale), opts);
  cache.set(id, made);
  return made;
}

function toDate(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (!value) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface DateParts {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
}

/**
 * Partes de la fecha **en la zona del producto** (`America/Bogota`).
 * Se componen a mano para que el formato sea el del contrato (§9.12):
 * `18 oct 2026` en español y `Oct 18, 2026` en inglés, sin el «de» que
 * intercala ICU en `es-CO`.
 */
function dateParts(value: string | Date, locale: Locale, withTime: boolean): DateParts | null {
  const d = toDate(value);
  if (!d) return null;
  const options: Intl.DateTimeFormatOptions = {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  };
  const parts = dtf(locale, options, withTime ? 'parts-ymdhm' : 'parts-ymd').formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: pick('day'),
    month: pick('month').replace(/\.$/, ''),
    year: pick('year'),
    hour: pick('hour'),
    minute: pick('minute'),
  };
}

/** 2026-10-18 → "18 oct 2026" (es) · "Oct 18, 2026" (en) */
export function formatDate(value: string | Date, locale: Locale): string {
  const parts = dateParts(value, locale, false);
  if (!parts) return '—';
  return locale === 'en' ? `${parts.month} ${parts.day}, ${parts.year}` : `${parts.day} ${parts.month} ${parts.year}`;
}

/** 2026-10-18 → "18 oct" (es) · "Oct 18" (en) */
export function formatDateShort(value: string | Date, locale: Locale): string {
  const parts = dateParts(value, locale, false);
  if (!parts) return '—';
  return locale === 'en' ? `${parts.month} ${parts.day}` : `${parts.day} ${parts.month}`;
}

/** "18 oct 2026, 19:00" */
export function formatDateTime(value: string | Date, locale: Locale): string {
  const parts = dateParts(value, locale, true);
  if (!parts) return '—';
  const date = locale === 'en' ? `${parts.month} ${parts.day}, ${parts.year}` : `${parts.day} ${parts.month} ${parts.year}`;
  return `${date}, ${parts.hour}:${parts.minute}`;
}

export function formatWeekday(value: string | Date, locale: Locale): string {
  const d = toDate(value);
  if (!d) return '—';
  return dtf(locale, { timeZone: TZ, weekday: 'short' }, 'wd').format(d).replace(/\.$/, '');
}

/** 1250 → "1.250" (es) · "1,250" (en) */
export function formatNumber(value: number, locale: Locale): string {
  return nf(locale, { maximumFractionDigits: 2 }, 'n').format(value);
}

/** Dinero siempre en USD: "150 US$" (es) · "$150" (en) */
export function formatCurrency(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const isInteger = Number.isInteger(value);
  // En español se recortan los ceros sobrantes (75,5); en inglés se muestran dos
  // decimales cuando la cifra no es entera ($75.50).
  const digits: Intl.NumberFormatOptions = isInteger
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : locale === 'en'
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 0, maximumFractionDigits: 2 };
  const amount = nf(locale, digits, `cur-${isInteger ? 'int' : locale}`).format(value);
  return locale === 'en' ? `$${amount}` : `${amount} US$`;
}

/** 480 → "8 h" (es) · "8h" (en) */
export function formatHours(minutes: number, locale: Locale): string {
  const hours = minutes / 60;
  const digits = Math.abs(hours - Math.round(hours)) < 0.05 ? 0 : 1;
  const amount = nf(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }, `h${digits}`).format(
    hours,
  );
  return locale === 'en' ? `${amount}h` : `${amount} h`;
}

/** 45 → "45 min" */
export function formatMinutes(minutes: number, locale: Locale): string {
  return `${formatNumber(Math.round(minutes), locale)} min`;
}

/** 0.62 → "62 %" (es) · "62%" (en) */
export function formatPercent(ratio: number, locale: Locale, digits = 0): string {
  const value = nf(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }, `p${digits}`).format(
    ratio * 100,
  );
  return locale === 'en' ? `${value}%` : `${value} %`;
}

/** Puntaje en formato terminal: "737/720" */
export function formatScore(value: number | null, minimum?: number | null): string {
  if (value === null) return '—';
  return minimum === null || minimum === undefined ? String(value) : `${value}/${minimum}`;
}

export function plural(locale: Locale, count: number): Intl.LDMLPluralRule {
  const id = `pr:${locale}`;
  let rules = cache.get(id) as Intl.PluralRules | undefined;
  if (!rules) {
    rules = new Intl.PluralRules(localeTag(locale));
    cache.set(id, rules);
  }
  return rules.select(count);
}
