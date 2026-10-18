/* =============================================================================
   Tests de `domain/ics.ts` — valida el RFC 5545 con `ical.js` (dependencia de
   desarrollo, nunca de runtime).
   Cubre lo obligatorio de §11.1: parseo, UID únicos, VALARM, plegado a ≤75
   octetos, CRLF y DTSTART en `America/Bogota`.
   ========================================================================== */

import { describe, expect, it } from 'vitest';
import ICAL, { type IcalComponent, type IcalDuration, type IcalTime } from 'ical.js';

import { MAX_LINE_OCTETS, buildIcs, buildUid, escapeText, foldLine, icsFilename } from '@/domain/ics';
import { TZ, addDaysToDate } from '@/lib/dates';

import { NOW, TODAY, isoAt, makeCertification, makeFlashcard, makePlanItem, makeSettings, makeState, makeTopic } from './fixtures';

/* -----------------------------------------------------------------------------
   Utilidades de test
   -------------------------------------------------------------------------- */

const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length;

/** Deshace el plegado RFC 5545 (CRLF + espacio). */
const unfold = (folded: string): string => folded.split('\r\n ').join('');

const physicalLines = (ics: string): string[] => ics.split('\r\n').filter((line) => line.length > 0);

/**
 * Parsea el ICS registrando su propio VTIMEZONE. `ical.js` no trae tzdata, así
 * que si el bloque generado estuviera mal, `utcOffset()` no daría -300.
 */
function parseWithOwnZone(ics: string): IcalComponent {
  ICAL.TimezoneService.reset();
  const probe = new ICAL.Component(ICAL.parse(ics));
  const tzComponent = probe.getFirstSubcomponent('vtimezone');
  if (!tzComponent) throw new Error('El ICS no incluye VTIMEZONE');
  ICAL.TimezoneService.register(TZ, new ICAL.Timezone(tzComponent));
  return new ICAL.Component(ICAL.parse(ics));
}

const eventsOf = (ics: string): IcalComponent[] =>
  parseWithOwnZone(ics).getAllSubcomponents('vevent');

const dtstartOf = (event: IcalComponent): IcalTime => event.getFirstPropertyValue('dtstart') as IcalTime;
const dtendOf = (event: IcalComponent): IcalTime => event.getFirstPropertyValue('dtend') as IcalTime;
const textProp = (event: IcalComponent, name: string): string => String(event.getFirstPropertyValue(name));

/** 5 temas programados + 1 examen agendado: el caso base de §11.1. */
function baseState() {
  return makeState({
    certifications: [makeCertification()],
    topics: [
      makeTopic({ id: 't1', nextReviewAt: isoAt('2026-02-10', '19:00') }),
      makeTopic({ id: 't2', domainId: 'resilient', nextReviewAt: isoAt('2026-02-11', '08:30') }),
      makeTopic({ id: 't3', nextReviewAt: isoAt('2026-02-12', '19:00') }),
      makeTopic({ id: 't4', nextReviewAt: isoAt('2026-02-13', '19:00') }),
      makeTopic({ id: 't5', nextReviewAt: isoAt('2026-02-14', '19:00') }),
    ],
    planItems: [makePlanItem({ certId: 'SAA-C03', targetDate: '2026-03-20' })],
  });
}

/* -----------------------------------------------------------------------------
   foldLine
   -------------------------------------------------------------------------- */

describe('foldLine', () => {
  it('no pliega una línea de 75 octetos y sí una de 76', () => {
    expect(MAX_LINE_OCTETS).toBe(75);
    const exact = 'A'.repeat(75);
    expect(foldLine(exact)).toBe(exact);
    const overflow = 'A'.repeat(76);
    expect(foldLine(overflow)).toBe(`A${'A'.repeat(74)}\r\n A`);
    expect(foldLine(overflow).split('\r\n')).toHaveLength(2);
  });

  it('pliega un título de 200 caracteres a ≤75 octetos por línea física', () => {
    const original = `SUMMARY:Repaso: ${'x'.repeat(200)}`;
    const folded = foldLine(original);
    const lines = folded.split('\r\n');

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(utf8Bytes(line)).toBeLessThanOrEqual(MAX_LINE_OCTETS);
    }
    // Cada continuación empieza con exactamente un espacio.
    for (const line of lines.slice(1)) {
      expect(line.startsWith(' ')).toBe(true);
      expect(line.startsWith('  ')).toBe(false);
    }
    expect(unfold(folded)).toBe(original);
  });

  it('cuenta octetos UTF-8, no caracteres (50 «é» = 100 octetos)', () => {
    const original = 'é'.repeat(50);
    const folded = foldLine(original);

    expect(original).toHaveLength(50);
    expect(utf8Bytes(original)).toBe(100);
    expect(folded).toContain('\r\n');
    for (const line of folded.split('\r\n')) {
      expect(utf8Bytes(line)).toBeLessThanOrEqual(MAX_LINE_OCTETS);
    }
    expect(unfold(folded)).toBe(original);
  });

  it('no parte caracteres multibyte: emoji y acentos sobreviven al plegado', () => {
    const original = `DESCRIPTION:${'🚀'.repeat(40)} Diseño de redes, café – ñandú`;
    const lines = foldLine(original).split('\r\n');

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(utf8Bytes(line)).toBeLessThanOrEqual(MAX_LINE_OCTETS);
      expect(line).not.toContain('\uFFFD');
      // Si se hubiera partido un carácter, la decodificación estricta fallaría.
      expect(new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(line))).toBe(line);
    }
    expect(unfold(lines.join('\r\n'))).toBe(original);
  });

  it('devuelve la cadena vacía sin inventar líneas', () => {
    expect(foldLine('')).toBe('');
  });
});

/* -----------------------------------------------------------------------------
   escapeText
   -------------------------------------------------------------------------- */

describe('escapeText', () => {
  it('escapa barra invertida, punto y coma y coma', () => {
    expect(escapeText('a\\b')).toBe('a\\\\b');
    expect(escapeText('a;b')).toBe('a\\;b');
    expect(escapeText('a,b')).toBe('a\\,b');
    expect(escapeText('a\\,b')).toBe('a\\\\\\,b');
  });

  it('convierte los saltos de línea en el literal \\n', () => {
    expect(escapeText('linea1\nlinea2')).toBe('linea1\\nlinea2');
    expect(escapeText('linea1\r\nlinea2')).toBe('linea1\\nlinea2');
    expect(escapeText('linea1\rlinea2')).toBe('linea1\\nlinea2');
  });

  it('respeta acentos, emoji y guiones largos', () => {
    const text = 'Diseño de red – café 🚀 ñandú';
    expect(escapeText(text)).toBe(text);
  });
});

/* -----------------------------------------------------------------------------
   buildUid / icsFilename
   -------------------------------------------------------------------------- */

describe('buildUid', () => {
  it('usa el formato {certCode}-{topicId}-{fecha}@miplan.local', () => {
    expect(buildUid({ certCode: 'SAA-C03', topicId: 't1', date: '2026-02-10' })).toBe(
      'SAA-C03-t1-2026-02-10@miplan.local',
    );
  });

  it('rellena los huecos nulos y sanea espacios', () => {
    expect(buildUid({ certCode: null, topicId: null, date: '2026-02-10' })).toBe(
      'sin-cert-evento-2026-02-10@miplan.local',
    );
    expect(buildUid({ certCode: 'CLF C02', topicId: 'a b', date: '2026-02-10' })).toBe(
      'CLF-C02-a-b-2026-02-10@miplan.local',
    );
    expect(buildUid({ date: '2026-02-10' })).toBe('sin-cert-evento-2026-02-10@miplan.local');
  });
});

describe('icsFilename', () => {
  it('nombra el archivo con la fecha local de Bogotá', () => {
    expect(icsFilename(NOW)).toBe('miplan-aws-calendario-2026-01-15.ics');
    // 02:00 UTC del día 16 todavía es día 15 en Bogotá (UTC-5).
    expect(icsFilename(new Date('2026-01-16T02:00:00Z'))).toBe('miplan-aws-calendario-2026-01-15.ics');
  });
});

/* -----------------------------------------------------------------------------
   buildIcs — estructura del calendario
   -------------------------------------------------------------------------- */

describe('buildIcs — cabecera y VTIMEZONE', () => {
  it('incluye las propiedades obligatorias del VCALENDAR', () => {
    const ics = buildIcs({ state: baseState(), now: NOW });

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Mi Plan AWS//ES//');
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics).toContain('METHOD:PUBLISH');
    expect(ics).toContain('X-WR-TIMEZONE:America/Bogota');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('respeta PRODID propio (y lo escapa como TEXT)', () => {
    const ics = buildIcs({ state: baseState(), now: NOW, prodId: '-//Mi Plan, AWS//ES//' });
    expect(ics).toContain('PRODID:-//Mi Plan\\, AWS//ES//');
    expect(ics).not.toContain('PRODID:-//Mi Plan AWS//ES//');
  });

  it('declara un VTIMEZONE válido para America/Bogota sin reglas de verano', () => {
    const ics = buildIcs({ state: baseState(), now: NOW });
    const start = ics.indexOf('BEGIN:VTIMEZONE');
    const end = ics.indexOf('END:VTIMEZONE') + 'END:VTIMEZONE'.length;
    const block = ics.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('TZID:America/Bogota');
    expect(block).toContain('BEGIN:STANDARD');
    expect(block).toContain('BEGIN:DAYLIGHT');
    expect(block).toContain('TZOFFSETFROM:-0400');
    expect(block).toContain('TZOFFSETTO:-0500');
    expect(block).toContain('DTSTART:19930404T030000');
    // Colombia no observa horario de verano: no hay reglas anuales de DST.
    expect(block).not.toContain('RRULE');
    expect(ics.split('TZID:America/Bogota')).toHaveLength(2);
  });

  it('se parsea con ical.js sin errores', () => {
    const calendar = new ICAL.Component(ICAL.parse(buildIcs({ state: baseState(), now: NOW })));
    expect(calendar.name).toBe('vcalendar');
    expect(calendar.getFirstPropertyValue('version')).toBe('2.0');
    expect(calendar.getFirstSubcomponent('vtimezone')).not.toBeNull();
    expect(calendar.getAllSubcomponents('vevent')).toHaveLength(6);
  });
});

describe('buildIcs — CRLF y plegado', () => {
  it('usa CRLF real en todo el archivo, incluida la línea final', () => {
    const ics = buildIcs({ state: baseState(), now: NOW });
    const parts = ics.split('\n');

    expect(parts.at(-1)).toBe('');
    for (const part of parts.slice(0, -1)) expect(part.endsWith('\r')).toBe(true);
    // Todos los \r pertenecen a un par CRLF: no queda ningún \r suelto.
    expect(ics.split('\r').length).toBe(ics.split('\r\n').length);
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.split('\r\n').filter((line) => line === '')).toHaveLength(1);
  });

  it('ninguna línea física supera 75 octetos UTF-8', () => {
    const state = makeState({
      certifications: [
        makeCertification({
          name: 'AWS Certified Solutions Architect – Associate (Diseño, redes; y más 🚀)',
        }),
      ],
      topics: [
        makeTopic({
          id: 't-acentos',
          title: `Diseño de redes, subredes y seguridad; práctica con emoji 🚀 ${'ñ'.repeat(60)}`,
          nextReviewAt: isoAt('2026-02-20', '19:00'),
        }),
      ],
      planItems: [makePlanItem({ targetDate: '2026-03-20' })],
    });
    const lines = physicalLines(buildIcs({ state, now: NOW }));

    expect(lines.length).toBeGreaterThan(10);
    for (const line of lines) expect(utf8Bytes(line)).toBeLessThanOrEqual(MAX_LINE_OCTETS);
    expect(unfold(lines.join('\r\n')).length).toBeGreaterThan(0);
  });
});

describe('buildIcs — metadatos de evento', () => {
  it('pone DTSTAMP en UTC y SEQUENCE configurable en cada evento', () => {
    const ics = buildIcs({ state: baseState(), now: NOW, sequence: 3 });
    const events = eventsOf(ics);

    expect(ics).toContain('DTSTAMP:20260115T120000Z');
    expect(ics).toContain('SEQUENCE:3');
    for (const event of events) {
      // ical.js convierte DTSTAMP en ICAL.Time: el instante debe ser `now` en UTC.
      const stamp = event.getFirstPropertyValue('dtstamp') as IcalTime;
      expect(stamp.zone?.tzid).toBe('UTC');
      expect(stamp.utcOffset()).toBe(0);
      expect(stamp.toUnixTime()).toBe(NOW.getTime() / 1000);
      expect(Number(event.getFirstPropertyValue('sequence'))).toBe(3);
    }
  });

  it('por defecto SEQUENCE es 0', () => {
    const ics = buildIcs({ state: baseState(), now: NOW });
    expect(ics).toContain('SEQUENCE:0');
    expect(ics).not.toContain('SEQUENCE:1');
  });

  it('el VTIMEZONE propio basta para resolver el instante UTC (UTC-5 fijo)', () => {
    ICAL.TimezoneService.reset();
    const ics = buildIcs({ state: baseState(), now: NOW });
    expect(ICAL.TimezoneService.has(TZ)).toBe(false); // ical.js no trae tzdata
    const events = eventsOf(ics);
    const night = dtstartOf(events[0]);

    expect(night.zone?.tzid).toBe(TZ);
    // ical.js devuelve el desplazamiento en segundos: UTC-5 = -18000.
    expect(night.utcOffset()).toBe(-18000);
    // 2026-02-10 19:00 en Bogotá = 2026-02-11 00:00 UTC.
    expect(night.toUnixTime()).toBe(Date.parse('2026-02-11T00:00:00Z') / 1000);
  });
});

/* -----------------------------------------------------------------------------
   buildIcs — contenido
   -------------------------------------------------------------------------- */

describe('buildIcs — eventos', () => {
  it('5 temas + 1 examen producen 6 eventos con UID únicos', () => {
    const events = eventsOf(buildIcs({ state: baseState(), now: NOW }));
    const uids = events.map((event) => textProp(event, 'uid'));

    expect(events).toHaveLength(6);
    expect(new Set(uids).size).toBe(6);
    expect(uids).toContain('SAA-C03-t1-2026-02-10@miplan.local');
    expect(uids).toContain('SAA-C03-examen-2026-03-20@miplan.local');
    for (const uid of uids) expect(uid.endsWith('@miplan.local')).toBe(true);
  });

  it('cada evento lleva VALARM DISPLAY a -PT15M', () => {
    const ics = buildIcs({ state: baseState(), now: NOW });
    const events = eventsOf(ics);

    for (const event of events) {
      const alarms = event.getAllSubcomponents('valarm');
      expect(alarms).toHaveLength(1);
      const alarm = alarms[0];
      expect(textProp(alarm, 'action')).toBe('DISPLAY');
      const trigger = alarm.getFirstPropertyValue('trigger') as IcalDuration;
      expect(trigger.toSeconds()).toBe(-900);
      expect(trigger.isNegative).toBe(true);
      expect(textProp(alarm, 'description').length).toBeGreaterThan(0);
    }
    expect(ics).toContain('TRIGGER:-PT15M');
  });

  it('programa cada tema como bloque de 30 min a dailyReminderTime', () => {
    const ics = buildIcs({ state: baseState(), now: NOW });
    const events = eventsOf(ics);
    const first = events[0];

    expect(ics).toContain(`DTSTART;TZID=${TZ}:20260210T190000`);
    expect(ics).toContain(`DTEND;TZID=${TZ}:20260210T193000`);
    expect(dtstartOf(first).hour).toBe(19);
    expect(dtstartOf(first).minute).toBe(0);
    expect(dtstartOf(first).zone?.tzid).toBe(TZ);
    expect(dtstartOf(first).utcOffset()).toBe(-18000);
    expect(dtendOf(first).hour).toBe(19);
    expect(dtendOf(first).minute).toBe(30);
    expect(textProp(first, 'summary')).toBe('Repaso: RDS Multi-AZ');
    // DESCRIPTION con la certificación y el dominio.
    expect(textProp(first, 'description')).toContain('AWS Certified Solutions Architect – Associate (SAA-C03)');
    expect(textProp(first, 'description')).toContain('Design Secure Architectures');
  });

  it('respeta America/Bogota en un caso de mañana y otro de noche', () => {
    const state = baseState();
    const morning = eventsOf(
      buildIcs({ state: { ...state, settings: makeSettings({ dailyReminderTime: '08:30' }) }, now: NOW }),
    );
    expect(dtstartOf(morning[1]).hour).toBe(8);
    expect(dtstartOf(morning[1]).minute).toBe(30);
    // La zona resuelta tiene que ser la del VTIMEZONE generado, no la del SO.
    expect(dtstartOf(morning[1]).zone?.tzid).toBe(TZ);
    expect(dtendOf(morning[1]).hour).toBe(9);
    expect(dtendOf(morning[1]).minute).toBe(0);
    // 2026-02-11 08:30 en Bogotá = 2026-02-11 13:30 UTC.
    expect(dtstartOf(morning[1]).toUnixTime()).toBe(Date.parse('2026-02-11T13:30:00Z') / 1000);

    const night = eventsOf(buildIcs({ state, now: NOW }));
    expect(dtstartOf(night[0]).hour).toBe(19);
    expect(dtstartOf(night[0]).zone?.tzid).toBe(TZ);
    // 2026-02-10 19:00 en Bogotá = 2026-02-11 00:00 UTC (día siguiente).
    expect(dtstartOf(night[0]).toUnixTime()).toBe(Date.parse('2026-02-11T00:00:00Z') / 1000);
  });

  it('escapa acentos, comas y puntos y coma en el título del tema', () => {
    const state = makeState({
      topics: [
        makeTopic({
          id: 't-acentos',
          title: 'Diseño de, redes; y más – café 🚀',
          nextReviewAt: isoAt('2026-02-20', '19:00'),
        }),
      ],
    });
    const ics = buildIcs({ state, now: NOW });
    const event = eventsOf(ics)[0];

    expect(unfold(ics)).toContain('SUMMARY:Repaso: Diseño de\\, redes\\; y más – café 🚀');
    // ical.js deshace el escapado: el valor lógico es idéntico al original.
    expect(textProp(event, 'summary')).toBe('Repaso: Diseño de, redes; y más – café 🚀');
  });

  it('exporta las fechas de examen como eventos de todo el día (VALUE=DATE)', () => {
    const ics = buildIcs({ state: baseState(), now: NOW });
    const exam = eventsOf(ics).find((event) => textProp(event, 'uid').includes('examen'));
    if (!exam) throw new Error('Falta el evento de examen');

    const start = exam.getFirstProperty('dtstart');
    expect(start?.type).toBe('date');
    expect(dtstartOf(exam).isDate).toBe(true);
    expect(dtstartOf(exam).toString()).toBe('2026-03-20');
    // DTEND es exclusivo en eventos de día completo (RFC 5545 §3.8.2.2).
    expect(dtendOf(exam).toString()).toBe('2026-03-21');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260320');
    expect(ics).toContain('DTEND;VALUE=DATE:20260321');
    expect(textProp(exam, 'summary')).toBe('Examen SAA-C03');
  });

  it('agrupa las fichas vencidas en un solo bloque de 15 min por día', () => {
    const state = makeState({
      flashcards: [
        makeFlashcard({ id: 'f1', dueDate: '2026-02-10' }),
        makeFlashcard({ id: 'f2', dueDate: '2026-02-10' }),
        makeFlashcard({ id: 'f3', dueDate: '2026-02-11' }),
        makeFlashcard({ id: 'f4', dueDate: '2027-01-01' }),
      ],
    });
    const events = eventsOf(buildIcs({ state, now: NOW }));

    expect(events).toHaveLength(2);
    expect(events.map((event) => textProp(event, 'uid'))).toEqual([
      'SAA-C03-flashcards-2026-02-10@miplan.local',
      'SAA-C03-flashcards-2026-02-11@miplan.local',
    ]);
    expect(dtstartOf(events[0]).hour).toBe(19);
    expect(dtendOf(events[0]).minute).toBe(15);
    expect(textProp(events[0], 'description')).toContain('2 tarjetas');
    expect(textProp(events[1], 'description')).toContain('1 tarjeta');
  });

  it('no inventa eventos de fichas cuando no hay ninguna vencida', () => {
    const ics = buildIcs({ state: baseState(), now: NOW });
    expect(ics).not.toContain('flashcards');
  });
});

describe('buildIcs — ventana temporal', () => {
  it('ignora fechas fuera de la ventana y obedece horizonDays', () => {
    const farState = makeState({ planItems: [makePlanItem({ targetDate: addDaysToDate(TODAY, 200) })] });

    expect(eventsOf(buildIcs({ state: farState, now: NOW }))).toHaveLength(0);
    expect(eventsOf(buildIcs({ state: farState, now: NOW, horizonDays: 365 }))).toHaveLength(1);
    expect(eventsOf(buildIcs({ state: baseState(), now: NOW, horizonDays: 0 }))).toHaveLength(0);
  });

  it('ancla los temas vencidos al inicio de la ventana', () => {
    const state = makeState({ topics: [makeTopic({ id: 't1', nextReviewAt: isoAt('2025-12-01', '19:00') })] });
    const ics = buildIcs({ state, now: NOW });

    expect(eventsOf(ics)).toHaveLength(1);
    expect(ics).toContain(`DTSTART;TZID=${TZ}:${TODAY.replace(/-/g, '')}T190000`);
  });

  it('solo programa temas en estado pendiente, estudiando o repasando', () => {
    const state = makeState({
      topics: [
        makeTopic({ id: 't1', status: 'pendiente' }),
        makeTopic({ id: 't2', status: 'estudiando' }),
        makeTopic({ id: 't3', status: 'repasando' }),
        makeTopic({ id: 't4', status: 'dominado' }),
        makeTopic({ id: 't5', status: 'archivado' }),
      ],
    });
    const uids = eventsOf(buildIcs({ state, now: NOW })).map((event) => textProp(event, 'uid'));

    expect(uids).toHaveLength(3);
    expect(uids.join(' ')).not.toContain('-t4-');
    expect(uids.join(' ')).not.toContain('-t5-');
  });

  it('es determinista e independiente del orden de entrada', () => {
    const state = baseState();
    const ics = buildIcs({ state, now: NOW });

    expect(buildIcs({ state, now: NOW })).toBe(ics);
    const reversed = { ...state, topics: [...state.topics].reverse() };
    expect(buildIcs({ state: reversed, now: NOW })).toBe(ics);
    // Mismo `now`, mismo instante: no se cuela Date.now() en el resultado.
    expect(buildIcs({ state, now: new Date(NOW.getTime()) })).toBe(ics);
  });
});
