import { describe, expect, it } from 'vitest';
import {
  blockingPrerequisites,
  daysToRetirement,
  groupByPhase,
  nextRecommended,
  retiringSoon,
  sortRoute,
  unlockState,
} from '../recommend';
import type { Certification, PlanItem } from '@/data/types';

function cert(overrides: Partial<Certification> & { id: string }): Certification {
  return {
    code: overrides.id,
    name: `Cert ${overrides.id}`,
    level: 'associate',
    phase: 2,
    priceUsd: 150,
    durationMin: 130,
    questions: 65,
    scoredQuestions: null,
    passingScore: 720,
    domains: [],
    prerequisites: [],
    recommendedExperience: '',
    officialUrl: 'https://aws.amazon.com/certification/',
    examGuideUrl: 'https://docs.aws.amazon.com/aws-certification/',
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: '2026-10-18',
    notes: '',
    ...overrides,
  };
}

function item(certId: string, order: number, status: PlanItem['status'] = 'no_iniciado'): PlanItem {
  return {
    id: `p-${certId}`,
    certId,
    order,
    status,
    targetDate: null,
    hoursPlanned: 40,
    hoursDone: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const certs: Certification[] = [
  cert({ id: 'CLF-C02', phase: 1 }),
  cert({ id: 'AIF-C01', phase: 1 }),
  cert({ id: 'SAA-C03', phase: 2, prerequisites: ['CLF-C02'] }),
  cert({ id: 'SAP-C02', phase: 3, prerequisites: ['SAA-C03'], lifecycle: 'retiring', retirementDate: '2026-11-16' }),
  cert({ id: 'ANS-C01', phase: 4, prerequisites: ['SAA-C03'], lifecycle: 'retiring', retirementDate: '2026-12-31' }),
  cert({ id: 'OLD-C01', phase: 4, lifecycle: 'retired' }),
];

describe('unlockState', () => {
  it('sin prerrequisitos está desbloqueada', () => {
    expect(unlockState('CLF-C02', [item('CLF-C02', 1)], certs)).toBe('unlocked');
  });

  it('SAA-C03 está bloqueada mientras CLF-C02 no esté aprobada', () => {
    const items = [item('CLF-C02', 1, 'estudiando'), item('SAA-C03', 3)];
    expect(unlockState('SAA-C03', items, certs)).toBe('locked');
    expect(blockingPrerequisites('SAA-C03', items, certs)).toEqual(['CLF-C02']);
  });

  it('se desbloquea al aprobar el prerrequisito o saltarlo explícitamente', () => {
    expect(unlockState('SAA-C03', [item('CLF-C02', 1, 'aprobado'), item('SAA-C03', 3)], certs)).toBe('unlocked');
    expect(unlockState('SAA-C03', [item('CLF-C02', 1, 'saltado'), item('SAA-C03', 3)], certs)).toBe('unlocked');
  });

  it('sin prerrequisito en el plan queda bloqueada', () => {
    expect(unlockState('SAA-C03', [item('SAA-C03', 3)], certs)).toBe('locked');
  });
});

describe('sortRoute', () => {
  it('ordena por fase y luego por order, sin depender del orden de entrada', () => {
    const items = [item('SAP-C02', 9), item('CLF-C02', 2), item('AIF-C01', 1), item('SAA-C03', 3), item('ANS-C01', 12)];
    expect(sortRoute(items, certs).map((i) => i.certId)).toEqual(['AIF-C01', 'CLF-C02', 'SAA-C03', 'SAP-C02', 'ANS-C01']);
  });
});

describe('retiringSoon / daysToRetirement', () => {
  it('ANS-C01 a ≤120 días del retiro', () => {
    const now = new Date('2026-10-18T12:00:00.000Z');
    const ans = certs.find((c) => c.id === 'ANS-C01') as Certification;
    expect(retiringSoon(ans, now, 120)).toBe(true);
    expect(daysToRetirement(ans, now)).toBe(74);
  });

  it('una certificación retirada no se marca como "por retirarse"', () => {
    const now = new Date('2026-10-18T12:00:00.000Z');
    const old = certs.find((c) => c.id === 'OLD-C01') as Certification;
    expect(retiringSoon(old, now)).toBe(false);
    expect(daysToRetirement(old, now)).toBeNull();
  });
});

describe('nextRecommended §6.1 / §8.2', () => {
  const now = new Date('2026-10-18T12:00:00.000Z');

  it('recomienda CLF-C02 primero', () => {
    const items = [
      item('CLF-C02', 1),
      item('AIF-C01', 2),
      item('SAA-C03', 3),
    ];
    expect(nextRecommended({ planItems: items, certifications: certs, now })?.certId).toBe('CLF-C02');
  });

  it('respeta prerrequisitos: tras aprobar CLF-C02 sigue AIF-C01 (mismo phase, menor order)', () => {
    const items = [item('CLF-C02', 1, 'aprobado'), item('AIF-C01', 2), item('SAA-C03', 3)];
    expect(nextRecommended({ planItems: items, certifications: certs, now })?.certId).toBe('AIF-C01');
  });

  it('no recomienda certificaciones retired', () => {
    const items = [item('OLD-C01', 1)];
    expect(nextRecommended({ planItems: items, certifications: certs, now })).toBeNull();
  });

  it('no recomienda una `retiring` a ≤120 días (SAP-C02 en octubre de 2026)', () => {
    const items = [
      item('CLF-C02', 1, 'aprobado'),
      item('AIF-C01', 2, 'aprobado'),
      item('SAA-C03', 3, 'aprobado'),
      item('SAP-C02', 8),
    ];
    const result = nextRecommended({ planItems: items, certifications: certs, now });
    expect(result).toBeNull();
  });

  it('devuelve null cuando todo está aprobado o saltado', () => {
    const items = [item('CLF-C02', 1, 'aprobado'), item('AIF-C01', 2, 'saltado')];
    expect(nextRecommended({ planItems: items, certifications: certs, now })).toBeNull();
  });
});

describe('prerrequisitos «A o B» (prerequisiteMode: any)', () => {
  const anyCerts: Certification[] = [
    cert({ id: 'DVA-C02', phase: 2 }),
    cert({ id: 'SOA-C03', phase: 2 }),
    cert({ id: 'DOP-C02', phase: 3, prerequisites: ['DVA-C02', 'SOA-C03'], prerequisiteMode: 'any' }),
  ];

  it('se desbloquea con uno de los dos aprobados', () => {
    const items = [item('DVA-C02', 1, 'aprobado'), item('SOA-C03', 2), item('DOP-C02', 9)];
    expect(unlockState('DOP-C02', items, anyCerts)).toBe('unlocked');
    expect(blockingPrerequisites('DOP-C02', items, anyCerts)).toEqual([]);
  });

  it('también se desbloquea si el aprobado es el otro', () => {
    const items = [item('DVA-C02', 1), item('SOA-C03', 2, 'saltado'), item('DOP-C02', 9)];
    expect(unlockState('DOP-C02', items, anyCerts)).toBe('unlocked');
  });

  it('sigue bloqueada si ninguno está aprobado y nombra los dos', () => {
    const items = [item('DVA-C02', 1, 'estudiando'), item('SOA-C03', 2), item('DOP-C02', 9)];
    expect(unlockState('DOP-C02', items, anyCerts)).toBe('locked');
    expect(blockingPrerequisites('DOP-C02', items, anyCerts)).toEqual(['DVA-C02', 'SOA-C03']);
  });

  it('sin `prerequisiteMode` se exige todo (comportamiento por defecto)', () => {
    const allCerts: Certification[] = [
      cert({ id: 'A', phase: 2 }),
      cert({ id: 'B', phase: 2 }),
      cert({ id: 'C', phase: 3, prerequisites: ['A', 'B'] }),
    ];
    const items = [item('A', 1, 'aprobado'), item('B', 2), item('C', 9)];
    expect(unlockState('C', items, allCerts)).toBe('locked');
    expect(blockingPrerequisites('C', items, allCerts)).toEqual(['B']);
  });
});

describe('groupByPhase', () => {
  it('agrupa y ordena las fases', () => {
    const items = [item('SAA-C03', 3), item('CLF-C02', 1), item('SAP-C02', 8)];
    const groups = groupByPhase(items, certs);
    expect(groups.map((g) => g.phase)).toEqual([1, 2, 3]);
    expect(groups[0].items.map((i) => i.certId)).toEqual(['CLF-C02']);
  });
});
