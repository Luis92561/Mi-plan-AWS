import { describe, expect, it } from 'vitest';
import type { Certification, Confidence, Topic } from '@/data/types';
import {
  assignMissingDomain,
  reprioritizeTopics,
  scheduleTopic,
  snoozeTopic,
} from '@/domain/schedule';
import { addDaysToDate, dateTimeInTz } from '@/lib/dates';

/** 2026-05-10T15:30Z = domingo 10 de mayo, 10:30 en America/Bogota. */
const NOW = new Date('2026-05-10T15:30:00Z');
const TODAY = '2026-05-10';
const AT_19 = '19:00';

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
    domains: [
      { id: 'secure', name: 'Design Secure Architectures', weight: 0.3 },
      { id: 'resilient', name: 'Design Resilient Architectures', weight: 0.26 },
      { id: 'perf', name: 'Design High-Performing Architectures', weight: 0.24 },
      { id: 'cost', name: 'Design Cost-Optimized Architectures', weight: 0.2 },
    ],
    prerequisites: ['CLF-C02'],
    recommendedExperience: '1 año de experiencia práctica',
    officialUrl: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
    examGuideUrl: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
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
    confidence: null,
    ease: 2.5,
    intervalDays: 1,
    nextReviewAt: dateTimeInTz('2026-05-09', AT_19),
    lastStudiedAt: null,
    reviewCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('scheduleTopic — ramas de confianza §8.7', () => {
  it('confianza 1 → intervalo 1 y estado repasando', () => {
    const result = scheduleTopic(makeTopic({ intervalDays: 16 }), 1, NOW);
    expect(result.intervalDays).toBe(1);
    expect(result.status).toBe('repasando');
    expect(result.topic.status).toBe('repasando');
    expect(result.reviewCount).toBe(1);
    expect(result.nextReviewAt).toBe(dateTimeInTz(addDaysToDate(TODAY, 1), AT_19));
  });

  it('confianza 2 → intervalo 1 y estado repasando', () => {
    const result = scheduleTopic(makeTopic({ intervalDays: 35 }), 2, NOW);
    expect(result.intervalDays).toBe(1);
    expect(result.status).toBe('repasando');
    expect(result.topic.status).toBe('repasando');
  });

  it('confianza 3 → intervalo * 0.8 redondeado, mínimo 1', () => {
    const wide = scheduleTopic(makeTopic({ intervalDays: 10 }), 3, NOW);
    expect(wide.intervalDays).toBe(8);
    expect(wide.status).toBe('estudiando');

    const narrow = scheduleTopic(makeTopic({ intervalDays: 1 }), 3, NOW);
    expect(narrow.intervalDays).toBe(1);
  });

  it('confianza 5 → tabla [1, 3, 7, 16, 35, 75] según reviewCount previo', () => {
    expect(scheduleTopic(makeTopic({ reviewCount: 0 }), 5, NOW).intervalDays).toBe(1);
    expect(scheduleTopic(makeTopic({ reviewCount: 1 }), 5, NOW).intervalDays).toBe(3);
    expect(scheduleTopic(makeTopic({ reviewCount: 2 }), 5, NOW).intervalDays).toBe(7);
    expect(scheduleTopic(makeTopic({ reviewCount: 3 }), 5, NOW).intervalDays).toBe(16);
    expect(scheduleTopic(makeTopic({ reviewCount: 4 }), 5, NOW).intervalDays).toBe(35);
    expect(scheduleTopic(makeTopic({ reviewCount: 5 }), 5, NOW).intervalDays).toBe(75);
    expect(scheduleTopic(makeTopic({ reviewCount: 9 }), 5, NOW).intervalDays).toBe(75);
  });
});

describe('scheduleTopic — dominado y secuencia de intervalos', () => {
  it('secuencia completa 1 → 3 → 7 en tres repasos con confianza 4', () => {
    const first = scheduleTopic(makeTopic({ reviewCount: 0, intervalDays: 1 }), 4, NOW);
    expect(first.reviewCount).toBe(1);
    expect(first.intervalDays).toBe(1);

    const second = scheduleTopic(first.topic, 4, NOW);
    expect(second.reviewCount).toBe(2);
    expect(second.intervalDays).toBe(3);
    expect(second.status).not.toBe('dominado');

    const third = scheduleTopic(second.topic, 4, NOW);
    expect(third.reviewCount).toBe(3);
    expect(third.intervalDays).toBe(7);
  });

  it('3.er repaso con confianza ≥4 → dominado y programado a 30 días', () => {
    const topic = makeTopic({ reviewCount: 2, intervalDays: 3 });
    const result = scheduleTopic(topic, 4, NOW);
    expect(result.reviewCount).toBe(3);
    expect(result.status).toBe('dominado');
    expect(result.topic.status).toBe('dominado');
    expect(result.nextReviewAt).toBe(dateTimeInTz(addDaysToDate(TODAY, 30), AT_19));
    expect(result.topic.nextReviewAt).toBe(result.nextReviewAt);
  });

  it('confianza 3 en el 3.er repaso no domina el tema', () => {
    const result = scheduleTopic(makeTopic({ reviewCount: 2, intervalDays: 3 }), 3, NOW);
    expect(result.status).not.toBe('dominado');
    expect(result.intervalDays).toBe(Math.max(1, Math.round(3 * 0.8)));
  });

  it('confianza ≤2 con reviewCount alto vuelve a repasando, no a dominado', () => {
    const result = scheduleTopic(makeTopic({ reviewCount: 4, intervalDays: 35 }), 2, NOW);
    expect(result.status).toBe('repasando');
    expect(result.intervalDays).toBe(1);
  });
});

describe('scheduleTopic — contrato de la función', () => {
  it('agenda a las 19:00 de America/Bogota', () => {
    const result = scheduleTopic(makeTopic({ reviewCount: 0 }), 5, NOW);
    // 19:00 en Bogotá (UTC-5) del 11 de mayo = 00:00Z del 12 de mayo.
    expect(result.nextReviewAt).toBe('2026-05-12T00:00:00.000Z');
  });

  it('respeta una hora diaria personalizada', () => {
    const result = scheduleTopic(makeTopic({ reviewCount: 0 }), 5, NOW, { dailyReminderTime: '07:30' });
    // 07:30 en Bogotá = 12:30Z del mismo día.
    expect(result.nextReviewAt).toBe('2026-05-11T12:30:00.000Z');
  });

  it('es pura: no muta el tema de entrada y devuelve un Topic nuevo', () => {
    const topic = makeTopic({ id: 'puro', reviewCount: 1, intervalDays: 3, ease: 2.4 });
    const snapshot = { ...topic };
    const result = scheduleTopic(topic, 5, NOW);
    expect(topic).toEqual(snapshot);
    expect(result.topic).not.toBe(topic);
    expect(result.topic.confidence).toBe(5);
    expect(result.topic.lastStudiedAt).toBe(NOW.toISOString());
    expect(result.topic.updatedAt).toBe(NOW.toISOString());
    expect(result.topic.ease).toBe(2.4);
  });

  it('un tema sin repasos previos sigue dominado solo al tercer repaso', () => {
    const start = makeTopic({ reviewCount: 0 });
    const one = scheduleTopic(start, 5, NOW);
    const two = scheduleTopic(one.topic, 5, NOW);
    const three = scheduleTopic(two.topic, 5, NOW);
    expect(one.status).not.toBe('dominado');
    expect(two.status).not.toBe('dominado');
    expect(three.status).toBe('dominado');
  });
});

describe('snoozeTopic', () => {
  it('solo mueve nextReviewAt: no toca ease ni intervalDays', () => {
    const topic = makeTopic({
      ease: 2.1,
      intervalDays: 35,
      nextReviewAt: dateTimeInTz('2026-05-12', AT_19),
      reviewCount: 4,
      status: 'estudiando',
    });
    const snoozed = snoozeTopic(topic, 7, NOW);

    expect(snoozed).not.toBe(topic);
    expect(snoozed.nextReviewAt).toBe(dateTimeInTz('2026-05-17', AT_19));
    expect(snoozed.ease).toBe(2.1);
    expect(snoozed.intervalDays).toBe(35);
    expect(snoozed.reviewCount).toBe(4);
    expect(snoozed.status).toBe('estudiando');
    expect(snoozed.updatedAt).toBe(topic.updatedAt);
    // El original no cambia.
    expect(topic.nextReviewAt).toBe(dateTimeInTz('2026-05-12', AT_19));
  });

  it('conserva la hora local que ya tenía el tema', () => {
    const topic = makeTopic({ nextReviewAt: dateTimeInTz('2026-05-20', '07:30') });
    const snoozed = snoozeTopic(topic, 3, NOW);
    expect(snoozed.nextReviewAt).toBe(dateTimeInTz('2026-05-13', '07:30'));
  });

  it('sin nextReviewAt usa las 19:00 por defecto y no acepta días negativos', () => {
    const snoozed = snoozeTopic(makeTopic({ nextReviewAt: null }), -5, NOW);
    expect(snoozed.nextReviewAt).toBe(dateTimeInTz(TODAY, AT_19));
  });
});

describe('reprioritizeTopics — examen y dominios débiles', () => {
  const topics = [
    makeTopic({ id: 'a', priority: 3, domainId: 'secure' }),
    makeTopic({ id: 'b', priority: 2, domainId: 'perf' }),
    makeTopic({ id: 'c', priority: 1, domainId: 'cost' }),
  ];

  it('con el examen a 10 días todos los temas pasan a prioridad 1', () => {
    const result = reprioritizeTopics(topics, {
      examDate: addDaysToDate(TODAY, 10),
      today: TODAY,
      weakDomainIds: [],
    });
    expect(result.map((topic) => topic.priority)).toEqual([1, 1, 1]);
    expect(result.map((topic) => topic.id)).toEqual(['a', 'b', 'c']);
  });

  it('con el examen a 30 días la prioridad no se toca salvo dominios débiles', () => {
    const result = reprioritizeTopics(topics, {
      examDate: addDaysToDate(TODAY, 30),
      today: TODAY,
      weakDomainIds: [],
    });
    expect(result.map((topic) => topic.priority)).toEqual([3, 2, 1]);
  });

  it('los dominios débiles suben a prioridad 1 aunque el examen esté lejos', () => {
    const result = reprioritizeTopics(topics, {
      examDate: addDaysToDate(TODAY, 30),
      today: TODAY,
      weakDomainIds: ['secure'],
    });
    expect(result.map((topic) => topic.priority)).toEqual([1, 2, 1]);
  });

  it('no baja prioridades ya altas y es pura', () => {
    const snapshot = topics.map((topic) => ({ ...topic }));
    const result = reprioritizeTopics(topics, {
      examDate: null,
      today: TODAY,
      weakDomainIds: [],
    });
    expect(result.map((topic) => topic.priority)).toEqual([3, 2, 1]);
    expect(topics).toEqual(snapshot);
    expect(result[0]).not.toBe(topics[0]);
  });
});

describe('assignMissingDomain', () => {
  it('asigna el dominio de mayor peso cuando domainId es null', () => {
    const result = assignMissingDomain(makeTopic({ domainId: null }), makeCert());
    expect(result.domainId).toBe('secure');
    expect(result).not.toBe(makeTopic({ domainId: null }));
  });

  it('no toca un tema que ya tiene dominio', () => {
    const topic = makeTopic({ domainId: 'cost' });
    expect(assignMissingDomain(topic, makeCert())).toBe(topic);
    expect(assignMissingDomain(topic, makeCert()).domainId).toBe('cost');
  });

  it('en empate gana el primer dominio y sin dominios no hay cambio', () => {
    const cert = makeCert({
      domains: [
        { id: 'first', name: 'First', weight: 0.5 },
        { id: 'second', name: 'Second', weight: 0.5 },
      ],
    });
    expect(assignMissingDomain(makeTopic({ domainId: null }), cert).domainId).toBe('first');

    const empty = makeCert({ domains: [] });
    const topic = makeTopic({ domainId: null });
    expect(assignMissingDomain(topic, empty)).toEqual(topic);
  });
});

describe('tipos de confianza admitidos', () => {
  it('acepta las cinco confianzas válidas', () => {
    const confidences: Confidence[] = [1, 2, 3, 4, 5];
    for (const confidence of confidences) {
      const result = scheduleTopic(makeTopic({ reviewCount: 1 }), confidence, NOW);
      expect(result.intervalDays).toBeGreaterThanOrEqual(1);
      expect(result.reviewCount).toBe(2);
    }
  });
});
