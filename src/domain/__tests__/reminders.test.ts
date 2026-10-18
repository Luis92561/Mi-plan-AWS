import { describe, expect, it } from 'vitest';
import type {
  Attempt,
  Certification,
  ChecklistItem,
  PlanItem,
  Reminder,
  Settings,
  StudySession,
  Topic,
  Voucher,
} from '@/data/types';
import {
  REMINDER_WINDOW_DAYS,
  buildReminders,
  capPerDay,
  isWithinQuietHours,
  type ReminderInput,
} from '@/domain/reminders';
import { addDaysToDate, dateTimeInTz, localDate, weekdayOf } from '@/lib/dates';

/** 2026-05-10T15:30Z = domingo 10 de mayo, 10:30 en America/Bogota. */
const NOW = new Date('2026-05-10T15:30:00Z');
const TODAY = '2026-05-10';
const AT_19 = '19:00';

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 'app',
    displayName: 'Estudiante',
    weeklyHoursGoal: 8,
    studyDays: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-01-01',
    activeCertId: 'SAA-C03',
    theme: 'dark',
    locale: 'es',
    passphraseEnabled: false,
    schemaVersion: 1,
    fontMode: 'terminal',
    fontScale: 1,
    remindersEnabled: true,
    dailyReminderTime: AT_19,
    quietHours: { from: '22:00', to: '07:00' },
    maxRemindersPerDay: 5,
    defaultExportProfileId: null,
    ...overrides,
  };
}

function makeCert(overrides: Partial<Certification> = {}): Certification {
  return {
    id: 'SAA-C03',
    code: 'SAA-C03',
    name: 'AWS Certified Solutions Architect – Associate',
    level: 'associate',
    phase: 2,
    priceUsd: 150,
    durationMin: 130,
    questions: 65,
    scoredQuestions: 50,
    passingScore: 720,
    domains: [{ id: 'secure', name: 'Design Secure Architectures', weight: 0.5 }],
    prerequisites: ['CLF-C02'],
    recommendedExperience: '',
    officialUrl: 'https://aws.amazon.com/certification/',
    examGuideUrl: 'https://aws.amazon.com/certification/',
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: '2026-01-01',
    notes: '',
    ...overrides,
  };
}

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 't1',
    certId: 'SAA-C03',
    domainId: 'secure',
    title: 'IAM: políticas y roles',
    descriptionMd: '',
    status: 'estudiando',
    priority: 2,
    sourceResourceId: null,
    confidence: 4,
    ease: 2.5,
    intervalDays: 3,
    nextReviewAt: dateTimeInTz('2026-05-09', AT_19),
    lastStudiedAt: '2026-05-09T00:00:00.000Z',
    reviewCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-09T00:00:00.000Z',
    ...overrides,
  };
}

function makePlanItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 'p1',
    certId: 'SAA-C03',
    order: 1,
    status: 'estudiando',
    targetDate: '2026-05-15',
    hoursPlanned: 20,
    hoursDone: 6,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeChecklistItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: 'c1',
    certId: 'SAA-C03',
    topicId: null,
    groupId: 'examen',
    title: 'Agendar el examen',
    done: false,
    doneAt: null,
    dueDate: '2026-05-08',
    order: 1,
    recurrence: 'ninguna',
    templateKey: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeVoucher(overrides: Partial<Voucher> = {}): Voucher {
  return {
    id: 'v1',
    label: '50 %',
    percent: 50,
    source: 'manual',
    expiresAt: '2026-05-13',
    usedForAttemptId: null,
    status: 'disponible',
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: 'a1',
    certId: 'SAA-C03',
    date: '2026-05-01',
    kind: 'mock',
    source: 'Tutorials Dojo',
    correct: 30,
    total: 50,
    score: null,
    estimatedScore: null,
    passed: null,
    durationMin: 60,
    costUsd: 0,
    voucherId: null,
    breakdown: [],
    notes: '',
    ...overrides,
  };
}

function makeSession(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: 's1',
    date: '2026-05-06',
    certId: 'SAA-C03',
    domainId: 'secure',
    minutes: 45,
    type: 'repaso',
    confidence: 4,
    notes: '',
    createdAt: '2026-05-06T23:00:00.000Z',
    ...overrides,
  };
}

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'rem-tema-t1-2026-05-10',
    type: 'tema',
    refId: 't1',
    title: 'Repasar: IAM',
    dueAt: dateTimeInTz(TODAY, AT_19),
    channel: 'browser',
    status: 'pendiente',
    snoozedUntil: null,
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

function makeInput(overrides: Partial<ReminderInput> = {}): ReminderInput {
  return {
    now: NOW,
    settings: makeSettings(),
    topics: [],
    certifications: [makeCert()],
    planItems: [],
    checklistItems: [],
    vouchers: [],
    attempts: [],
    studySessions: [],
    ...overrides,
  };
}

/** Entrada rica: examen, tema vencido, checklist vencido, voucher e inactividad. */
function richInput(settings: Settings = makeSettings()): ReminderInput {
  return makeInput({
    settings,
    topics: [makeTopic({ nextReviewAt: dateTimeInTz('2026-05-09', AT_19) })],
    planItems: [makePlanItem({ targetDate: '2026-05-15' })],
    checklistItems: [makeChecklistItem({ dueDate: '2026-05-08' })],
    vouchers: [makeVoucher({ expiresAt: '2026-05-13' })],
    attempts: [],
    studySessions: [makeSession({ date: '2026-05-06' })],
  });
}

describe('buildReminders — prioridad §8.8', () => {
  it('ordena examen > tema > checklist > voucher > inactividad', () => {
    const reminders = buildReminders(richInput());
    const today = reminders.filter((reminder) => localDate(new Date(reminder.dueAt)) === TODAY);
    expect(today.map((reminder) => reminder.type)).toEqual([
      'examen',
      'tema',
      'checklist',
      'voucher',
      'inactividad',
    ]);
  });

  it('el aviso de examen se repite los 7 días previos y el día del examen', () => {
    const reminders = buildReminders(richInput());
    const examDays = reminders
      .filter((reminder) => reminder.type === 'examen')
      .map((reminder) => localDate(new Date(reminder.dueAt)))
      .sort();
    expect(examDays).toEqual([
      '2026-05-10',
      '2026-05-11',
      '2026-05-12',
      '2026-05-13',
      '2026-05-14',
      '2026-05-15',
    ]);
    const onExamDay = reminders.find(
      (reminder) =>
        reminder.type === 'examen' && localDate(new Date(reminder.dueAt)) === '2026-05-15',
    );
    expect(onExamDay?.title).toContain('hoy');
  });

  it('deduplica por (type, refId, día)', () => {
    const topic = makeTopic({ nextReviewAt: dateTimeInTz('2026-05-14', AT_19) });
    const checklist = makeChecklistItem({ dueDate: '2026-05-13' });
    const planItem = makePlanItem({ targetDate: '2026-05-12' });
    const reminders = buildReminders(
      makeInput({
        topics: [topic, topic, { ...topic }],
        checklistItems: [checklist, checklist, { ...checklist }],
        planItems: [planItem, planItem],
      }),
    );
    expect(reminders.filter((reminder) => reminder.type === 'tema')).toHaveLength(1);
    expect(reminders.filter((reminder) => reminder.type === 'checklist')).toHaveLength(1);
    const examDays = reminders
      .filter((reminder) => reminder.type === 'examen')
      .map((reminder) => reminder.id);
    expect(new Set(examDays).size).toBe(examDays.length);
  });
});

describe('buildReminders — tope diario', () => {
  it('maxRemindersPerDay = 1 deja como máximo uno por día', () => {
    const reminders = buildReminders(richInput(makeSettings({ maxRemindersPerDay: 1 })));
    expect(reminders).toHaveLength(6);
    const days = reminders.map((reminder) => localDate(new Date(reminder.dueAt)));
    expect(new Set(days).size).toBe(reminders.length);
    // El examen es lo más prioritario: gana todos sus días.
    expect(reminders.every((reminder) => reminder.type === 'examen')).toBe(true);
  });

  it('capPerDay respeta el tope, filtra el día y ordena por prioridad', () => {
    const exam = makeReminder({ id: 'rem-examen-SAA-C03-2026-05-10', type: 'examen', refId: 'SAA-C03' });
    const topic = makeReminder({ id: 'rem-tema-t1-2026-05-10' });
    const otherDay = makeReminder({ id: 'rem-tema-t1-2026-05-11', dueAt: dateTimeInTz('2026-05-11', AT_19) });
    const capped = capPerDay([topic, exam, otherDay], 1, TODAY);
    expect(capped.map((reminder) => reminder.type)).toEqual(['examen']);
    expect(capPerDay([topic, exam], 0, TODAY)).toEqual([]);
    expect(capPerDay([topic, exam], 2, '2026-05-20')).toEqual([]);
  });
});

describe('buildReminders — horas de silencio', () => {
  it('no genera recordatorios si la hora de aviso cae en quietHours', () => {
    const reminders = buildReminders(richInput(makeSettings({ quietHours: { from: '18:00', to: '21:00' } })));
    expect(reminders).toEqual([]);
  });

  it('isWithinQuietHours maneja rangos que cruzan medianoche', () => {
    const settings = makeSettings({ quietHours: { from: '22:00', to: '07:00' } });
    expect(isWithinQuietHours(settings, new Date(dateTimeInTz(TODAY, '23:30')))).toBe(true);
    expect(isWithinQuietHours(settings, new Date(dateTimeInTz(TODAY, '22:00')))).toBe(true);
    expect(isWithinQuietHours(settings, new Date(dateTimeInTz(TODAY, '06:59')))).toBe(true);
    expect(isWithinQuietHours(settings, new Date(dateTimeInTz(TODAY, '07:00')))).toBe(false);
    expect(isWithinQuietHours(settings, new Date(dateTimeInTz(TODAY, '12:00')))).toBe(false);
  });

  it('un rango vacío o en el mismo día se evalúa correctamente', () => {
    const daytime = makeSettings({ quietHours: { from: '18:00', to: '21:00' } });
    expect(isWithinQuietHours(daytime, new Date(dateTimeInTz(TODAY, '19:00')))).toBe(true);
    expect(isWithinQuietHours(daytime, new Date(dateTimeInTz(TODAY, '21:00')))).toBe(false);

    const empty = makeSettings({ quietHours: { from: '07:00', to: '07:00' } });
    expect(isWithinQuietHours(empty, new Date(dateTimeInTz(TODAY, '07:00')))).toBe(false);
  });
});

describe('buildReminders — días de estudio', () => {
  it('no genera recordatorios en días no lectivos', () => {
    // 2026-05-12 es martes (2); studyDays solo lunes, miércoles y viernes.
    const settings = makeSettings({ studyDays: [1, 3, 5] });
    const reminders = buildReminders(
      makeInput({
        settings,
        planItems: [makePlanItem({ targetDate: '2026-05-12' })],
        topics: [makeTopic({ nextReviewAt: dateTimeInTz('2026-05-12', AT_19) })],
      }),
    );
    expect(weekdayOf('2026-05-12')).toBe(2);
    expect(reminders.some((reminder) => localDate(new Date(reminder.dueAt)) === '2026-05-12')).toBe(false);
    // El lunes 11 sí es lectivo: el aviso del examen aparece.
    expect(reminders.some((reminder) => localDate(new Date(reminder.dueAt)) === '2026-05-11')).toBe(true);
    const weekdays = reminders.map((reminder) => weekdayOf(localDate(new Date(reminder.dueAt))));
    expect(weekdays.every((weekday) => [1, 3, 5].includes(weekday))).toBe(true);
  });
});

describe('buildReminders — exclusiones y contrato', () => {
  it('no genera para temas dominado/archivado ni para checklist hecho', () => {
    const reminders = buildReminders(
      makeInput({
        topics: [
          makeTopic({ id: 'dominado', status: 'dominado', nextReviewAt: dateTimeInTz('2026-05-10', AT_19) }),
          makeTopic({ id: 'archivado', status: 'archivado', nextReviewAt: dateTimeInTz('2026-05-10', AT_19) }),
        ],
        checklistItems: [makeChecklistItem({ id: 'hecho', done: true, doneAt: '2026-05-01T00:00:00.000Z' })],
      }),
    );
    expect(reminders.filter((reminder) => reminder.type === 'tema')).toEqual([]);
    expect(reminders.filter((reminder) => reminder.type === 'checklist')).toEqual([]);
  });

  it('no genera aviso de examen si el examen real ya está aprobado', () => {
    const reminders = buildReminders(
      makeInput({
        planItems: [makePlanItem({ targetDate: '2026-05-12' })],
        attempts: [makeAttempt({ kind: 'real', passed: true, date: '2026-04-01' })],
      }),
    );
    expect(reminders.filter((reminder) => reminder.type === 'examen')).toEqual([]);
  });

  it('channel es browser con recordatorios activos e inapp sin ellos', () => {
    const enabled = buildReminders(richInput(makeSettings({ remindersEnabled: true })));
    expect(enabled.length).toBeGreaterThan(0);
    expect(enabled.every((reminder) => reminder.channel === 'browser')).toBe(true);

    const disabled = buildReminders(richInput(makeSettings({ remindersEnabled: false })));
    expect(disabled.length).toBeGreaterThan(0);
    expect(disabled.every((reminder) => reminder.channel === 'inapp')).toBe(true);
  });

  it('los ids son deterministas: rem-{type}-{refId}-{YYYY-MM-DD}', () => {
    const reminders = buildReminders(
      makeInput({
        topics: [makeTopic({ id: 't1', nextReviewAt: dateTimeInTz('2026-05-14', AT_19) })],
        planItems: [makePlanItem({ targetDate: '2026-05-15' })],
        studySessions: [makeSession({ date: '2026-05-06' })],
      }),
    );
    expect(reminders.map((reminder) => reminder.id)).toContain('rem-tema-t1-2026-05-14');
    expect(reminders.map((reminder) => reminder.id)).toContain('rem-examen-SAA-C03-2026-05-10');
    expect(reminders.map((reminder) => reminder.id)).toContain('rem-inactividad-sin-ref-2026-05-10');
    for (const reminder of reminders) {
      expect(reminder.id).toMatch(/^rem-(examen|tema|checklist|voucher|inactividad|custom)-/);
      expect(reminder.status).toBe('pendiente');
      expect(reminder.snoozedUntil).toBeNull();
    }
  });

  it('respeta la ventana de 14 días', () => {
    expect(REMINDER_WINDOW_DAYS).toBe(14);
    const reminders = buildReminders(
      makeInput({
        planItems: [makePlanItem({ targetDate: '2026-05-24' })],
        topics: [makeTopic({ nextReviewAt: dateTimeInTz('2026-05-23', AT_19) })],
      }),
    );
    const days = reminders.map((reminder) => localDate(new Date(reminder.dueAt)));
    expect(days).toContain('2026-05-23');
    expect(days).not.toContain('2026-05-24');
    expect(days.every((day) => day >= TODAY && day <= addDaysToDate(TODAY, 13))).toBe(true);
  });

  it('es determinista y no muta la entrada', () => {
    const input = richInput();
    const topicsBefore = input.topics.map((topic) => ({ ...topic }));
    const first = buildReminders(input);
    const second = buildReminders(input);
    expect(second).toEqual(first);
    expect(input.topics).toEqual(topicsBefore);
  });

  it('devuelve [] cuando el tope diario es 0', () => {
    expect(buildReminders(richInput(makeSettings({ maxRemindersPerDay: 0 })))).toEqual([]);
  });

  it('sin sesiones usa settings.startDate como referencia de inactividad', () => {
    const reminders = buildReminders(
      makeInput({ settings: makeSettings({ startDate: '2026-05-01' }), studySessions: [] }),
    );
    const inactivity = reminders.filter((reminder) => reminder.type === 'inactividad');
    expect(inactivity).toHaveLength(1);
    expect(localDate(new Date(inactivity[0].dueAt))).toBe(TODAY);
  });
});
