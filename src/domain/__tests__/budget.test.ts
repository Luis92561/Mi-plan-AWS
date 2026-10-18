import { describe, expect, it } from 'vitest';
import {
  budgetTotals,
  cumulativeSpend,
  expireVouchers,
  remainingRouteCost,
  voucherFromApproval,
  vouchersExpiringSoon,
} from '../budget';
import type { BudgetItem, Certification, PlanItem, Voucher } from '@/data/types';

function cert(id: string, priceUsd: number | null, phase = 2): Certification {
  return {
    id,
    code: id,
    name: `Cert ${id}`,
    level: 'associate',
    phase: phase as Certification['phase'],
    priceUsd,
    durationMin: 130,
    questions: 65,
    scoredQuestions: null,
    passingScore: 720,
    domains: [],
    prerequisites: [],
    recommendedExperience: '',
    officialUrl: '',
    examGuideUrl: '',
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: '2026-10-18',
    notes: '',
  };
}

function item(certId: string, order: number, status: PlanItem['status'] = 'estudiando'): PlanItem {
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

function voucher(overrides: Partial<Voucher> = {}): Voucher {
  return {
    id: 'v1',
    label: '50 % por aprobar CLF-C02',
    percent: 50,
    source: 'aprobacion',
    expiresAt: '2026-11-30',
    usedForAttemptId: null,
    status: 'disponible',
    ...overrides,
  };
}

describe('remainingRouteCost §8.3', () => {
  const certifications = [cert('CLF-C02', 100, 1), cert('SAA-C03', 150, 2), cert('SAP-C02', 300, 3)];

  it('sin vouchers: suma los precios de lista de lo pendiente', () => {
    const planItems = [item('CLF-C02', 1, 'aprobado'), item('SAA-C03', 3), item('SAP-C02', 8)];
    const result = remainingRouteCost({ planItems, certifications, vouchers: [], today: '2026-10-18' });
    expect(result.withoutVouchersUsd).toBe(450);
    expect(result.withVouchersUsd).toBe(450);
    expect(result.savingsUsd).toBe(0);
  });

  it('un voucher del 50 % baja SAA-C03 de 150 a 75', () => {
    const planItems = [item('CLF-C02', 1, 'aprobado'), item('SAA-C03', 3), item('SAP-C02', 8)];
    const result = remainingRouteCost({
      planItems,
      certifications,
      vouchers: [voucher()],
      today: '2026-10-18',
    });
    const saa = result.rows.find((row) => row.certId === 'SAA-C03');
    expect(saa?.effectiveUsd).toBe(75);
    expect(saa?.voucherId).toBe('v1');
    expect(result.withVouchersUsd).toBe(375);
    expect(result.savingsUsd).toBe(75);
  });

  it('un voucher se consume una sola vez', () => {
    const planItems = [item('SAA-C03', 3), item('SAP-C02', 8)];
    const result = remainingRouteCost({ planItems, certifications, vouchers: [voucher()], today: '2026-10-18' });
    expect(result.rows[0].voucherId).toBe('v1');
    expect(result.rows[1].voucherId).toBeNull();
    expect(result.consumedVoucherIds).toEqual(['v1']);
  });

  it('ignora vouchers vencidos, usados o no disponibles', () => {
    const planItems = [item('SAA-C03', 3)];
    const expired = remainingRouteCost({
      planItems,
      certifications,
      vouchers: [voucher({ expiresAt: '2026-10-01' })],
      today: '2026-10-18',
    });
    expect(expired.rows[0].voucherId).toBeNull();

    const used = remainingRouteCost({
      planItems,
      certifications,
      vouchers: [voucher({ status: 'usado' })],
      today: '2026-10-18',
    });
    expect(used.rows[0].voucherId).toBeNull();

    const consumed = remainingRouteCost({
      planItems,
      certifications,
      vouchers: [voucher({ usedForAttemptId: 'a1' })],
      today: '2026-10-18',
    });
    expect(consumed.rows[0].voucherId).toBeNull();
  });

  it('acepta un voucher que vence exactamente hoy', () => {
    const planItems = [item('SAA-C03', 3)];
    const result = remainingRouteCost({
      planItems,
      certifications,
      vouchers: [voucher({ expiresAt: '2026-10-18' })],
      today: '2026-10-18',
    });
    expect(result.rows[0].voucherId).toBe('v1');
  });

  it('no cobra certificaciones aprobadas o saltadas', () => {
    const planItems = [item('SAA-C03', 3, 'aprobado'), item('SAP-C02', 8, 'saltado')];
    const result = remainingRouteCost({ planItems, certifications, vouchers: [], today: '2026-10-18' });
    expect(result.rows).toHaveLength(0);
    expect(result.withVouchersUsd).toBe(0);
  });
});

describe('budgetTotals', () => {
  const items: BudgetItem[] = [
    { id: 'b1', concept: 'Examen CLF', certId: 'CLF-C02', kind: 'examen', amountUsd: 100, status: 'pagado', date: '2026-02-14', voucherId: null, note: '' },
    { id: 'b2', concept: 'Examen SAA', certId: 'SAA-C03', kind: 'examen', amountUsd: 75, status: 'planeado', date: null, voucherId: 'v1', note: '' },
    { id: 'b3', concept: 'Suscripción', certId: null, kind: 'suscripcion', amountUsd: 29, status: 'planeado', date: null, voucherId: null, note: '' },
  ];

  it('separa planeado y pagado', () => {
    const totals = budgetTotals(items);
    expect(totals.plannedUsd).toBe(104);
    expect(totals.paidUsd).toBe(100);
    expect(totals.remainingUsd).toBe(104);
  });

  it('sin ítems el burn ratio es 0', () => {
    expect(budgetTotals([]).burnRatio).toBe(0);
  });
});

describe('cumulativeSpend', () => {
  it('acumula por mes', () => {
    const rows = cumulativeSpend([
      { id: 'a', concept: '', certId: null, kind: 'examen', amountUsd: 100, status: 'pagado', date: '2026-01-10', voucherId: null, note: '' },
      { id: 'b', concept: '', certId: null, kind: 'examen', amountUsd: 50, status: 'pagado', date: '2026-01-20', voucherId: null, note: '' },
      { id: 'c', concept: '', certId: null, kind: 'examen', amountUsd: 75, status: 'pagado', date: '2026-03-02', voucherId: null, note: '' },
      { id: 'd', concept: '', certId: null, kind: 'examen', amountUsd: 999, status: 'planeado', date: '2026-04-02', voucherId: null, note: '' },
    ]);
    expect(rows).toEqual([
      { month: '2026-01', amount: 150 },
      { month: '2026-03', amount: 225 },
    ]);
  });
});

describe('expireVouchers / vouchersExpiringSoon', () => {
  it('marca vencidos solo los disponibles caducados', () => {
    const result = expireVouchers(
      [
        voucher({ id: 'old', expiresAt: '2026-10-01' }),
        voucher({ id: 'live', expiresAt: '2026-12-01' }),
        voucher({ id: 'used', status: 'usado', expiresAt: '2026-10-01' }),
      ],
      '2026-10-18',
    );
    expect(result.find((v) => v.id === 'old')?.status).toBe('vencido');
    expect(result.find((v) => v.id === 'live')?.status).toBe('disponible');
    expect(result.find((v) => v.id === 'used')?.status).toBe('usado');
  });

  it('lista los que vencen en ≤30 días ordenados', () => {
    const rows = vouchersExpiringSoon(
      [
        voucher({ id: 'a', expiresAt: '2026-11-10' }),
        voucher({ id: 'b', expiresAt: '2026-10-20' }),
        voucher({ id: 'c', expiresAt: '2027-06-01' }),
      ],
      '2026-10-18',
      30,
    );
    expect(rows.map((r) => r.voucher.id)).toEqual(['b', 'a']);
    expect(rows[0].daysLeft).toBe(2);
  });
});

describe('voucherFromApproval', () => {
  it('crea un voucher del 50 % con vencimiento a 180 días', () => {
    const created = voucherFromApproval('CLF-C02', new Date('2026-10-18T15:00:00.000Z'));
    expect(created.percent).toBe(50);
    expect(created.source).toBe('aprobacion');
    expect(created.status).toBe('disponible');
    expect(created.expiresAt).toBe('2027-04-16');
  });
});
