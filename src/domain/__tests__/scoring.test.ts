import { describe, expect, it } from 'vitest';
import { attemptPassed, attemptScore, averageOfLast, domainProgress, estimatedScore, normalizeAttempt } from '../scoring';
import type { Attempt, Certification } from '@/data/types';

const attempt = (overrides: Partial<Attempt>): Attempt => ({
  id: 'a1',
  certId: 'SAA-C03',
  date: '2026-10-18',
  kind: 'mock',
  source: 'Mock propio',
  correct: null,
  total: null,
  score: null,
  estimatedScore: null,
  passed: null,
  durationMin: 0,
  costUsd: 0,
  voucherId: null,
  breakdown: [],
  notes: '',
  ...overrides,
});

const cert = { id: 'SAA-C03', passingScore: 720 } as Certification;

describe('estimatedScore', () => {
  it('46/65 ⇒ 737', () => {
    expect(estimatedScore(46, 65)).toBe(737);
  });

  it('0/65 ⇒ 100 y 65/65 ⇒ 1000', () => {
    expect(estimatedScore(0, 65)).toBe(100);
    expect(estimatedScore(65, 65)).toBe(1000);
  });

  it('protege total 0 y ratios fuera de rango', () => {
    expect(estimatedScore(5, 0)).toBe(100);
    expect(estimatedScore(70, 65)).toBe(1000);
  });
});

describe('attemptScore / attemptPassed', () => {
  it('prioriza el puntaje reportado sobre el estimado', () => {
    const a = attempt({ correct: 40, total: 65, score: 800, estimatedScore: 654 });
    expect(attemptScore(a)).toBe(800);
    expect(attemptPassed(a, 720)).toBe(true);
  });

  it('usa el estimado cuando no hay puntaje', () => {
    const a = attempt({ correct: 46, total: 65, estimatedScore: 737 });
    expect(attemptScore(a)).toBe(737);
    expect(attemptPassed(a, 720)).toBe(true);
    expect(attemptPassed(a, 750)).toBe(false);
  });

  it('devuelve null sin datos', () => {
    expect(attemptScore(attempt({}))).toBeNull();
    expect(attemptPassed(attempt({}), 720)).toBeNull();
  });
});

describe('normalizeAttempt', () => {
  it('calcula estimatedScore y passed', () => {
    const result = normalizeAttempt(attempt({ correct: 46, total: 65 }), cert);
    expect(result.estimatedScore).toBe(737);
    expect(result.passed).toBe(true);
  });

  it('respeta el puntaje directo', () => {
    const result = normalizeAttempt(attempt({ score: 700 }), cert);
    expect(result.passed).toBe(false);
  });
});

describe('averageOfLast', () => {
  it('promedia los 3 más recientes', () => {
    const value = averageOfLast(
      [
        attempt({ id: '1', date: '2026-10-01', score: 600 }),
        attempt({ id: '2', date: '2026-10-05', score: 700 }),
        attempt({ id: '3', date: '2026-10-10', score: 800 }),
        attempt({ id: '4', date: '2026-10-15', score: 900 }),
      ],
      3,
    );
    expect(value).toBe(800);
  });

  it('sin intentos ⇒ null', () => {
    expect(averageOfLast([])).toBeNull();
  });
});

describe('domainProgress', () => {
  it('calcula ratio y semáforo por dominio', () => {
    const rows = domainProgress([
      attempt({
        breakdown: [
          { domainId: 'secure', correct: 9, total: 10 },
          { domainId: 'cost', correct: 6, total: 10 },
          { domainId: 'performance', correct: 3, total: 10 },
        ],
      }),
    ]);
    expect(rows.find((r) => r.domainId === 'secure')?.light).toBe('ok');
    expect(rows.find((r) => r.domainId === 'cost')?.light).toBe('warn');
    expect(rows.find((r) => r.domainId === 'performance')?.light).toBe('err');
  });
});
