/* =============================================================================
   Generador ICS propio (RFC 5545) — sin librería de escritura.
   Reglas duras que este módulo garantiza:
   · CRLF real en todo el archivo, incluida la línea final.
   · Líneas plegadas a ≤75 octetos UTF-8 (nunca parte un carácter multibyte).
   · UID estable y único por evento; DTSTAMP en UTC; SEQUENCE configurable.
   · VTIMEZONE propio para `America/Bogota` (UTC-5 fijo: Colombia no observa
     horario de verano desde 1993).
   · Puro y determinista: recibe `now`, no usa `Date.now()`, `Math.random()`,
     DOM ni red. `domain/` no importa React ni Dexie (§4).
   ========================================================================== */

import type { AppState, Certification, TopicStatus } from '@/data/types';
import { TZ, addDaysToDate, localDate } from '@/lib/dates';

/** Ventana por defecto: próximos 90 días (§7.13). */
export const DEFAULT_HORIZON_DAYS = 90;
/** PRODID por defecto (§7.13 / contrato de API). */
export const DEFAULT_PROD_ID = '-//Mi Plan AWS//ES//';
/** Límite de octetos por línea física, sin contar el CRLF (RFC 5545 §3.1). */
export const MAX_LINE_OCTETS = 75;

const CRLF = '\r\n';
const UID_DOMAIN = 'miplan.local';
const DEFAULT_REMINDER_TIME = '19:00';
const TOPIC_REVIEW_MINUTES = 30;
const FLASHCARD_REVIEW_MINUTES = 15;
/** Aviso 15 minutos antes en todos los eventos (§7.13). */
const ALARM_TRIGGER = '-PT15M';
/** Sentinela para el UID de eventos sin tema (`{certCode}-{topicId}-{fecha}`). */
const EXAM_UID_PART = 'examen';
const FLASHCARD_UID_PART = 'flashcards';
/** Bogotá: UTC-5 todo el año; el último cambio real fue en abril de 1993. */
const STANDARD_FROM = '-0400';
const STANDARD_TO = '-0500';
const DAYLIGHT_FROM = '-0500';
const DAYLIGHT_TO = '-0400';

/** Estados de tema que generan bloque de repaso (8.7: dominado/archivado no). */
const REVIEW_STATUSES: ReadonlySet<TopicStatus> = new Set<TopicStatus>(['pendiente', 'estudiando', 'repasando']);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;
const UID_UNSAFE_RE = /[^A-Za-z0-9._-]+/g;

export interface IcsOptions {
  state: AppState;
  now: Date;
  /** Días hacia delante que se exportan (por defecto 90). */
  horizonDays?: number;
  /** Cada reexportación sube SEQUENCE (por defecto 0). */
  sequence?: number;
  /** PRODID del calendario (por defecto `-//Mi Plan AWS//ES//`). */
  prodId?: string;
}

/* -----------------------------------------------------------------------------
   Primitivas de texto RFC 5545
   -------------------------------------------------------------------------- */

/** Longitud en octetos UTF-8 de un único code point. */
function utf8Octets(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0;
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

/**
 * Pliega una línea lógica a ≤75 octetos por línea física (RFC 5545 §3.1).
 * La continuación se marca con CRLF + un espacio; ese espacio cuenta dentro de
 * los 75 octetos, por eso el contenido de cada continuación admite 74.
 * Itera por code points (`Array.from`), así que nunca rompe un emoji ni un
 * carácter acentuado entre dos líneas.
 */
export function foldLine(line: string): string {
  const chunks: string[] = [];
  let current = '';
  let octets = 0;
  let limit = MAX_LINE_OCTETS;

  for (const char of line) {
    const size = utf8Octets(char);
    if (octets + size > limit && current.length > 0) {
      chunks.push(current);
      current = '';
      octets = 0;
      limit = MAX_LINE_OCTETS - 1;
    }
    current += char;
    octets += size;
  }
  chunks.push(current);

  return chunks.join(`${CRLF} `);
}

/**
 * Escapa un valor TEXT (RFC 5545 §3.3.11): `\`, `;`, `,` y los saltos de línea.
 * El orden importa: la barra invertida va primero para no duplicar los escapes
 * que se insertan después.
 */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/* -----------------------------------------------------------------------------
   Formato de fechas y UID
   -------------------------------------------------------------------------- */

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** `YYYYMMDDTHHMMSSZ` — DTSTAMP siempre en UTC. */
function utcStamp(instant: Date): string {
  const year = String(instant.getUTCFullYear()).padStart(4, '0');
  return (
    `${year}${pad2(instant.getUTCMonth() + 1)}${pad2(instant.getUTCDate())}` +
    `T${pad2(instant.getUTCHours())}${pad2(instant.getUTCMinutes())}${pad2(instant.getUTCSeconds())}Z`
  );
}

/** `2026-01-15` → `20260115`. */
function compactDate(date: string): string {
  return date.replace(/-/g, '');
}

/** (`2026-01-15`, `19:00`) → `20260115T190000`. Hora local de `TZ`. */
function compactDateTime(date: string, time: string): string {
  return `${compactDate(date)}T${time.replace(':', '')}00`;
}

/**
 * Suma minutos a una hora de pared local (`YYYY-MM-DD` + `HH:mm`).
 * No hay DST que corregir en `America/Bogota`, así que la aritmética es exacta.
 */
function addMinutesToLocal(date: string, time: string, minutes: number): { date: string; time: string } {
  const [hours, mins] = time.split(':').map(Number);
  const total = (hours ?? 0) * 60 + (mins ?? 0) + minutes;
  const dayShift = Math.floor(total / 1440);
  const rest = ((total % 1440) + 1440) % 1440;
  return {
    date: addDaysToDate(date, dayShift),
    time: `${pad2(Math.floor(rest / 60))}:${pad2(rest % 60)}`,
  };
}

/** Normaliza `"19:00"` a `HH:mm`; cualquier valor inválido cae al fallback. */
function normalizeTime(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const match = TIME_RE.exec(value.trim());
  if (!match) return fallback;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${pad2(hours)}:${pad2(minutes)}`;
}

/** Trozo de UID seguro: sin espacios ni `@`, recortado y con fallback. */
function uidPart(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim().replace(UID_UNSAFE_RE, '-').replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 64) : fallback;
}

/**
 * `UID` estable por evento: `{certCode}-{topicId}-{fecha}@miplan.local` (§7.13).
 * Los eventos sin tema usan un sentinela legible en el hueco `topicId`
 * (`examen`, `flashcards`) para no colisionar con los repasos.
 */
export function buildUid(parts: { certCode?: string | null; topicId?: string | null; date: string }): string {
  const cert = uidPart(parts.certCode, 'sin-cert');
  const topic = uidPart(parts.topicId, 'evento');
  return `${cert}-${topic}-${parts.date}@${UID_DOMAIN}`;
}

/** Nombre del archivo exportado: `miplan-aws-calendario-YYYY-MM-DD.ics`. */
export function icsFilename(now: Date): string {
  return `miplan-aws-calendario-${localDate(now)}.ics`;
}

/* -----------------------------------------------------------------------------
   Construcción de eventos
   -------------------------------------------------------------------------- */

type EventTiming =
  | { allDay: true; date: string }
  | { allDay: false; date: string; time: string; minutes: number };

interface IcsEvent {
  uid: string;
  summary: string;
  description: string;
  timing: EventTiming;
  /** Orden estable de salida: fecha + hora + tipo + id. */
  sortKey: string;
}

function isDateString(value: string | null | undefined): value is string {
  return typeof value === 'string' && DATE_RE.test(value);
}

function domainName(cert: Certification | undefined, domainId: string | null): string {
  if (!domainId) return 'Sin dominio asignado';
  const domain = cert?.domains.find((item) => item.id === domainId);
  return domain?.name ?? domainId;
}

function certLabel(cert: Certification | undefined, certId: string): { code: string; name: string } {
  return { code: cert?.code ?? certId, name: cert?.name ?? certId };
}

/** Bloque de repaso de un tema: 30 min a la hora configurada (§7.13). */
function topicEvent(
  topic: AppState['topics'][number],
  cert: Certification | undefined,
  scheduled: string,
  reminderTime: string,
): IcsEvent {
  const { code, name } = certLabel(cert, topic.certId);
  return {
    uid: buildUid({ certCode: code, topicId: topic.id, date: scheduled }),
    summary: `Repaso: ${topic.title}`,
    description: [`Certificación: ${name} (${code})`, `Dominio: ${domainName(cert, topic.domainId)}`].join('\n'),
    timing: { allDay: false, date: scheduled, time: reminderTime, minutes: TOPIC_REVIEW_MINUTES },
    sortKey: `${scheduled}T${reminderTime}|1|${topic.id}`,
  };
}

/** Examen: evento de todo el día con la fecha objetivo del plan (§7.13). */
function examEvent(item: AppState['planItems'][number], cert: Certification | undefined, date: string): IcsEvent {
  const { code, name } = certLabel(cert, item.certId);
  return {
    uid: buildUid({ certCode: code, topicId: EXAM_UID_PART, date }),
    summary: `Examen ${code}`,
    description: [`Examen oficial de ${name} (${code})`, `Fecha objetivo: ${date}`, `Estado del plan: ${item.status}`].join(
      '\n',
    ),
    timing: { allDay: true, date },
    sortKey: `${date}T00:00|0|${item.certId}`,
  };
}

/** Repaso de tarjetas: 15 min por certificación y día con tarjetas vencidas. */
function flashcardEvent(
  certId: string,
  cert: Certification | undefined,
  date: string,
  count: number,
  reminderTime: string,
): IcsEvent {
  const { code, name } = certLabel(cert, certId);
  const plural = count === 1 ? 'tarjeta' : 'tarjetas';
  return {
    uid: buildUid({ certCode: code, topicId: FLASHCARD_UID_PART, date }),
    summary: `Repaso de tarjetas ${code}`,
    description: [`Revisión de ${count} ${plural} de ${name} (${code})`, 'Duración sugerida: 15 min'].join('\n'),
    timing: { allDay: false, date, time: reminderTime, minutes: FLASHCARD_REVIEW_MINUTES },
    sortKey: `${date}T${reminderTime}|2|${certId}`,
  };
}

function eventLines(event: IcsEvent, stamp: string, sequence: number): string[] {
  const lines: string[] = ['BEGIN:VEVENT', `UID:${event.uid}`, `DTSTAMP:${stamp}`, `SEQUENCE:${sequence}`];

  if (event.timing.allDay) {
    // RFC 5545 §3.8.2.2: en eventos de día completo DTEND es exclusivo.
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.timing.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(addDaysToDate(event.timing.date, 1))}`);
  } else {
    const end = addMinutesToLocal(event.timing.date, event.timing.time, event.timing.minutes);
    lines.push(`DTSTART;TZID=${TZ}:${compactDateTime(event.timing.date, event.timing.time)}`);
    lines.push(`DTEND;TZID=${TZ}:${compactDateTime(end.date, end.time)}`);
  }

  lines.push(`SUMMARY:${escapeText(event.summary)}`);
  lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Recordatorio: ${event.summary}`)}`,
    `TRIGGER:${ALARM_TRIGGER}`,
    'END:VALARM',
  );
  lines.push('END:VEVENT');
  return lines;
}

function calendarHeader(prodId: string): string[] {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${escapeText(prodId)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-TIMEZONE:${TZ}`,
    'X-WR-CALNAME:Mi Plan AWS',
    'BEGIN:VTIMEZONE',
    `TZID:${TZ}`,
    `X-LIC-LOCATION:${TZ}`,
    // Regla en vigor: UTC-5 desde 1993-04-04. Va primero para que los clientes
    // que solo leen el primer componente se queden con el desplazamiento real.
    'BEGIN:STANDARD',
    `TZOFFSETFROM:${STANDARD_FROM}`,
    `TZOFFSETTO:${STANDARD_TO}`,
    'TZNAME:-05',
    'DTSTART:19930404T030000',
    'END:STANDARD',
    // Colombia sí observó verano en 1992-1993; se declara como regla histórica
    // (sin RRULE) para que el bloque sea completo y el instante vigente correcto.
    'BEGIN:DAYLIGHT',
    `TZOFFSETFROM:${DAYLIGHT_FROM}`,
    `TZOFFSETTO:${DAYLIGHT_TO}`,
    'TZNAME:-04',
    'DTSTART:19920503T030000',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
  ];
}

/** Serializa líneas lógicas a un documento ICS con CRLF real y línea final. */
function serialize(lines: string[]): string {
  return `${lines.map((line) => foldLine(line)).join(CRLF)}${CRLF}`;
}

/* -----------------------------------------------------------------------------
   Entrada principal
   -------------------------------------------------------------------------- */

/**
 * Construye el `.ics` completo a partir del estado de la app.
 *
 * Ventana: `[hoy, hoy + horizonDays)` en fecha local `America/Bogota`.
 * Contenido:
 * · Temas con `nextReviewAt` en estado `pendiente|estudiando|repasando`
 *   → bloque de 30 min a `settings.dailyReminderTime`. Un tema vencido se
 *   ancla al inicio de la ventana (hoy) para que no desaparezca del calendario.
 * · `planItem.targetDate` dentro de la ventana → examen de día completo.
 * · Tarjetas con `dueDate` en la ventana → repaso de 15 min por certificación
 *   y día (agrupado: una tarjeta por evento sería ruido en el calendario).
 * Todos los eventos llevan `VALARM` a `-PT15M`.
 */
export function buildIcs(options: IcsOptions): string {
  const { state, now } = options;
  const horizonDays = Math.max(0, Math.trunc(options.horizonDays ?? DEFAULT_HORIZON_DAYS));
  const sequence = Math.max(0, Math.trunc(options.sequence ?? 0));
  const prodId = typeof options.prodId === 'string' && options.prodId.trim().length > 0 ? options.prodId.trim() : DEFAULT_PROD_ID;

  const stamp = utcStamp(now);
  const reminderTime = normalizeTime(state.settings?.dailyReminderTime, DEFAULT_REMINDER_TIME);
  const windowStart = localDate(now, TZ);
  const windowEnd = addDaysToDate(windowStart, horizonDays);
  const inWindow = (date: string): boolean => date >= windowStart && date < windowEnd;

  const certifications = new Map(state.certifications.map((cert) => [cert.id, cert] as const));
  const events: IcsEvent[] = [];

  // 1) Repasos de temas.
  for (const topic of state.topics) {
    if (!REVIEW_STATUSES.has(topic.status)) continue;
    if (typeof topic.nextReviewAt !== 'string') continue;
    const instant = new Date(topic.nextReviewAt);
    if (Number.isNaN(instant.getTime())) continue;
    const scheduled = localDate(instant, TZ);
    const date = scheduled < windowStart ? windowStart : scheduled;
    if (!inWindow(date)) continue;
    events.push(topicEvent(topic, certifications.get(topic.certId), date, reminderTime));
  }

  // 2) Exámenes agendados.
  for (const item of state.planItems) {
    if (!isDateString(item.targetDate)) continue;
    if (!inWindow(item.targetDate)) continue;
    events.push(examEvent(item, certifications.get(item.certId), item.targetDate));
  }

  // 3) Repaso de flashcards, agrupado por certificación y día.
  const flashcardGroups = new Map<string, { certId: string; date: string; count: number }>();
  for (const card of state.flashcards) {
    if (!isDateString(card.dueDate)) continue;
    if (!inWindow(card.dueDate)) continue;
    const key = `${card.certId}|${card.dueDate}`;
    const group = flashcardGroups.get(key);
    if (group) group.count += 1;
    else flashcardGroups.set(key, { certId: card.certId, date: card.dueDate, count: 1 });
  }
  for (const group of flashcardGroups.values()) {
    events.push(flashcardEvent(group.certId, certifications.get(group.certId), group.date, group.count, reminderTime));
  }

  // Orden estable: el mismo estado produce siempre el mismo archivo.
  events.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey < b.sortKey ? -1 : 1;
    return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
  });

  const lines = calendarHeader(prodId);
  for (const event of events) lines.push(...eventLines(event, stamp, sequence));
  lines.push('END:VCALENDAR');

  return serialize(lines);
}
