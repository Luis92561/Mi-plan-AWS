import { describe, expect, it } from 'vitest';
import { computeReadiness, domainAccuracy, passingRatio } from '../readiness';
import type { Attempt, Certification, PlanItem, Resource, StudySession } from '@/data/types';

const cert: Certification = {
  id: 'SAA-C03',
  code: 'SAA-C03',
  name: 'AWS Certified Solutions Architect – Associate',
  level: 'associate',
  phase: 2,
  priceUsd: 150,
  durationMin: 130,
  questions: 65,
  scoredQuestions: null,
  passingScore: 720,
  domains: [
    { id: 'secure', name: 'Design Secure Architectures', weight: 0.3 },
    { id: 'resilient', name: 'Design Resilient Architectures', weight: 0.26 },
    { id: 'performance', name: 'Design High-Performing Architectures', weight: 0.24 },
    { id: 'cost', name: 'Design Cost-Optimized Architectures', weight: 0.2 },
  ],
  prerequisites: ['CLF-C02'],
  recommendedExperience: '1 año',
  officialUrl: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
  examGuideUrl: 'https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html',
  lifecycle: 'available',
  retirementDate: null,
  verifiedOn: '2026-10-18',
  notes: '',
};

const planItem = (hoursPlanned: number): PlanItem => ({
  id: 'p1',
  certId: 'SAA-C03',
  order: 3,
  status: 'estudiando',
  targetDate: null,
  hoursPlanned,
  hoursDone: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
});

const resource = (status: Resource['status']): Resource => ({
  id: `r-${status}`,
  certId: 'SAA-C03',
  title: 'x',
  provider: 'AWS',
  url: 'https://skillbuilder.aws/',
  type: 'curso',
  isFree: true,
  costUsd: 0,
  domainIds: [],
  status,
  estimatedMin: 60,
  note: '',
});

const session = (minutes: number, certId = 'SAA-C03'): StudySession => ({
  id: `s-${minutes}`,
  date: '2026-10-18',
  certId,
  domainId: null,
  minutes,
  type: 'lab',
  confidence: 4,
  notes: '',
  createdAt: '2026-10-18T20:00:00.000Z',
});

const attempt = (overrides: Partial<Attempt>): Attempt => ({
  id: 'a1',
  certId: 'SAA-C03',
  date: '2026-10-18',
  kind: 'mock',
  source: 'Mock propio',
  correct: 46,
  total: 65,
  score: null,
  estimatedScore: null,
  passed: null,
  durationMin: 118,
  costUsd: 0,
  voucherId: null,
  breakdown: [],
  notes: '',
  ...overrides,
});

describe('passingRatio', () => {
  it('traduce el mínimo aprobatorio al porcentaje del examen', () => {
    expect(passingRatio(720)).toBeCloseTo(0.6889, 3);
    expect(passingRatio(750)).toBeCloseTo(0.7222, 3);
    expect(passingRatio(700)).toBeCloseTo(0.6667, 3);
  });
});

describe('domainAccuracy', () => {
  it('suma aciertos y totales de todos los intentos', () => {
    const result = domainAccuracy([
      attempt({ breakdown: [{ domainId: 'secure', correct: 10, total: 20 }] }),
      attempt({ id: 'a2', breakdown: [{ domainId: 'secure', correct: 5, total: 10 }] }),
    ]);
    expect(result.secure).toBeCloseTo(15 / 30);
  });

  it('devuelve null para un dominio con total 0', () => {
    const result = domainAccuracy([attempt({ breakdown: [{ domainId: 'cost', correct: 0, total: 0 }] })]);
    expect(result.cost).toBeNull();
  });
});

describe('computeReadiness §8.1', () => {
  it('caso 1 — sin datos: score 0 y estimación preliminar', () => {
    const result = computeReadiness({ cert, planItem: null, attempts: [], resources: [], sessions: [] });
    expect(result.score).toBe(0);
    expect(result.preliminary).toBe(true);
    expect(result.breakdown.domainCoverage).toBe(0);
    expect(result.breakdown.mockPerformance).toBe(0);
  });

  it('caso 2 — todo perfecto: 100 %', () => {
    const resources = [resource('completado'), resource('completado')];
    const sessions = [session(2400)];
    const perfect = attempt({
      correct: 65,
      total: 65,
      breakdown: cert.domains.map((d) => ({ domainId: d.id, correct: 10, total: 10 })),
    });
    const result = computeReadiness({
      cert,
      planItem: planItem(40),
      attempts: [perfect],
      resources,
      sessions,
    });
    expect(result.score).toBe(100);
    expect(result.preliminary).toBe(false);
  });

  it('caso 3 — sin labs (sin recursos) pero con simulacros y horas', () => {
    const result = computeReadiness({
      cert,
      planItem: planItem(40),
      attempts: [attempt({ correct: 52, total: 65, breakdown: cert.domains.map((d) => ({ domainId: d.id, correct: 8, total: 10 })) })],
      resources: [],
      sessions: [session(1200)],
    });
    expect(result.breakdown.resourcesDone).toBe(0);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it('caso 4 — dominios desparejos: el peor dominio baja la cobertura', () => {
    const result = computeReadiness({
      cert,
      planItem: planItem(40),
      attempts: [
        attempt({
          breakdown: [
            { domainId: 'secure', correct: 10, total: 10 },
            { domainId: 'resilient', correct: 2, total: 10 },
            { domainId: 'performance', correct: 0, total: 10 },
            { domainId: 'cost', correct: 0, total: 10 },
          ],
        }),
      ],
      resources: [],
      sessions: [],
    });
    // secure 10/10 → 1; resilient 2/10=0.2 → 0.25; performance 0; cost 0 ⇒ (1+0.25+0+0)/4
    expect(result.breakdown.domainCoverage).toBeCloseTo(0.3125, 4);
  });

  it('caso 5 — los dominios sin intentos cuentan 0', () => {
    const result = computeReadiness({
      cert,
      planItem: planItem(10),
      attempts: [attempt({ breakdown: [{ domainId: 'secure', correct: 8, total: 10 }] })],
      resources: [],
      sessions: [],
    });
    expect(result.breakdown.domainCoverage).toBeCloseTo(1 / 4, 4);
  });

  it('caso 6 — pesos: los últimos 3 intentos pesan 3, 2 y 1', () => {
    const older = attempt({
      id: 'old',
      date: '2026-10-01',
      correct: 30,
      total: 65,
      breakdown: [{ domainId: 'secure', correct: 10, total: 10 }],
    });
    const middle = attempt({
      id: 'mid',
      date: '2026-10-10',
      correct: 40,
      total: 65,
      breakdown: [{ domainId: 'secure', correct: 5, total: 10 }],
    });
    const newest = attempt({
      id: 'new',
      date: '2026-10-18',
      correct: 46,
      total: 65,
      breakdown: [],
    });
    const result = computeReadiness({
      cert,
      planItem: planItem(10),
      attempts: [older, middle, newest],
      resources: [],
      sessions: [],
    });
    const target = passingRatio(cert.passingScore);
    const expected =
      (3 * Math.min(1, 46 / 65 / target) + 2 * Math.min(1, 40 / 65 / target) + 1 * Math.min(1, 30 / 65 / target)) /
      6;
    expect(result.breakdown.mockPerformance).toBeCloseTo(expected, 5);
    expect(result.breakdown.mockPerformance).toBeLessThan(1);
  });

  it('redondea a entero y nunca sale de 0..100', () => {
    const result = computeReadiness({
      cert,
      planItem: planItem(1),
      attempts: [attempt({ correct: 65, total: 65, breakdown: cert.domains.map((d) => ({ domainId: d.id, correct: 99, total: 100 })) })],
      resources: [resource('completado')],
      sessions: [session(6000)],
    });
    expect(Number.isInteger(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
