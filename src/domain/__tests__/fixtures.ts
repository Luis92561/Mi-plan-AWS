/* =============================================================================
   Fixtures reutilizables para los tests de `domain/`.
   Todo determinista: ningún `Date.now()`, ningún dato aleatorio.
   ========================================================================== */

import type { AppState, Certification, Flashcard, PlanItem, Settings, Topic } from '@/data/types';
import { TZ, dateTimeInTz, localDate } from '@/lib/dates';

/** Instante fijo de referencia: 2026-01-15 12:00 UTC = 07:00 en Bogotá. */
export const NOW = new Date('2026-01-15T12:00:00Z');

/** Fecha local de `NOW` en la zona del producto (`2026-01-15`). */
export const TODAY = localDate(NOW, TZ);

/** ISO UTC correspondiente a una hora de pared de Bogotá. */
export function isoAt(date: string, time: string): string {
  return dateTimeInTz(date, time, TZ);
}

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 'app',
    displayName: 'Estudiante',
    weeklyHoursGoal: 8,
    studyDays: [1, 2, 3, 4, 5],
    startDate: '2026-01-05',
    activeCertId: 'SAA-C03',
    theme: 'dark',
    locale: 'es',
    passphraseEnabled: false,
    schemaVersion: 1,
    fontMode: 'terminal',
    fontScale: 1,
    remindersEnabled: true,
    dailyReminderTime: '19:00',
    quietHours: { from: '22:00', to: '07:00' },
    maxRemindersPerDay: 5,
    defaultExportProfileId: null,
    ...overrides,
  };
}

export function makeCertification(overrides: Partial<Certification> = {}): Certification {
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
    domains: [
      { id: 'secure', name: 'Design Secure Architectures', weight: 0.3 },
      { id: 'resilient', name: 'Design Resilient Architectures', weight: 0.26 },
      { id: 'performant', name: 'Design High-Performing Architectures', weight: 0.24 },
      { id: 'cost', name: 'Design Cost-Optimized Architectures', weight: 0.2 },
    ],
    prerequisites: ['CLF-C02'],
    recommendedExperience: '1 año de experiencia práctica',
    officialUrl: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
    examGuideUrl: 'https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/',
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: '2026-10-18',
    notes: '',
    ...overrides,
  };
}

export function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 't1',
    certId: 'SAA-C03',
    domainId: 'secure',
    title: 'RDS Multi-AZ',
    descriptionMd: '',
    status: 'pendiente',
    priority: 2,
    sourceResourceId: null,
    confidence: null,
    ease: 2.5,
    intervalDays: 1,
    nextReviewAt: isoAt('2026-02-10', '19:00'),
    lastStudiedAt: null,
    reviewCount: 0,
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-01-10T12:00:00.000Z',
    ...overrides,
  };
}

export function makePlanItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 'p1',
    certId: 'SAA-C03',
    order: 3,
    status: 'agendado',
    targetDate: null,
    hoursPlanned: 40,
    hoursDone: 12,
    createdAt: '2026-01-05T12:00:00.000Z',
    updatedAt: '2026-01-05T12:00:00.000Z',
    ...overrides,
  };
}

export function makeFlashcard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'f1',
    certId: 'SAA-C03',
    domainId: 'secure',
    front: '¿Qué hace Multi-AZ?',
    back: 'Failover automático entre zonas',
    ease: 2.5,
    intervalDays: 1,
    dueDate: '2026-02-10',
    reps: 0,
    lapses: 0,
    createdAt: '2026-01-10T12:00:00.000Z',
    ...overrides,
  };
}

/** Estado mínimo y válido; cualquier colección se puede sustituir por override. */
export function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    certifications: [makeCertification()],
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
    settings: makeSettings(),
    ...overrides,
  };
}
