import { describe, expect, it } from 'vitest';
import { BASE_EASE, MIN_EASE, dueCards, newFlashcard, nextLadderInterval, sm2 } from '../sm2';
import type { Flashcard } from '@/data/types';

const NOW = new Date('2026-10-18T15:00:00.000Z');

function card(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    certId: 'SAA-C03',
    domainId: null,
    front: '¿Qué es S3 Intelligent-Tiering?',
    back: 'Clase que mueve objetos entre niveles según el acceso.',
    ease: BASE_EASE,
    intervalDays: 0,
    dueDate: '2026-10-18',
    reps: 0,
    lapses: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('nextLadderInterval', () => {
  it('usa la escalera 1, 3, 7, 16, 35, 75', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(nextLadderInterval)).toEqual([1, 3, 7, 16, 35, 75, 75]);
  });
});

describe('sm2', () => {
  it('secuencia "bien" recorre 1 → 3 → 7 → 16 días', () => {
    let current = card();
    const intervals: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      current = sm2(current, 'good', NOW);
      intervals.push(current.intervalDays);
    }
    expect(intervals).toEqual([1, 3, 7, 16]);
  });

  it('"otra vez" reinicia a 1 día, baja el ease y suma un lapso', () => {
    const result = sm2(card({ reps: 3, intervalDays: 7, ease: 2.5 }), 'again', NOW);
    expect(result.intervalDays).toBe(1);
    expect(result.ease).toBe(2.3);
    expect(result.lapses).toBe(1);
    expect(result.reps).toBe(4);
    expect(result.dueDate).toBe('2026-10-19');
  });

  it('el ease nunca baja de 1.3', () => {
    let current = card({ ease: MIN_EASE });
    for (let i = 0; i < 5; i += 1) {
      current = sm2(current, 'again', NOW);
    }
    expect(current.ease).toBe(MIN_EASE);
  });

  it('"fácil" sube el ease y salta un escalón', () => {
    const result = sm2(card({ reps: 1, ease: 2.5 }), 'easy', NOW);
    expect(result.ease).toBe(2.65);
    expect(result.intervalDays).toBe(7);
  });

  it('calcula dueDate sumando el intervalo a hoy', () => {
    const result = sm2(card({ reps: 2 }), 'good', NOW);
    expect(result.dueDate).toBe('2026-10-25');
  });
});

describe('newFlashcard', () => {
  it('empieza con ease 2.5 y vencimiento hoy', () => {
    const created = newFlashcard({ certId: 'CLF-C02', front: 'A', back: 'B' }, NOW);
    expect(created.ease).toBe(BASE_EASE);
    expect(created.reps).toBe(0);
    expect(created.lapses).toBe(0);
    expect(created.dueDate).toBe('2026-10-18');
    expect(created.domainId).toBeNull();
  });
});

describe('dueCards', () => {
  it('devuelve solo las vencidas, de más antigua a más nueva', () => {
    const cards = [
      card({ id: 'future', dueDate: '2026-10-25' }),
      card({ id: 'today', dueDate: '2026-10-18' }),
      card({ id: 'old', dueDate: '2026-10-01' }),
    ];
    expect(dueCards(cards, '2026-10-18').map((c) => c.id)).toEqual(['old', 'today']);
  });
});
