import type { BudgetItem, Certification, PlanItem, Voucher } from '@/data/types';
import { daysBetween, localDate } from '@/lib/dates';
import { sortRoute } from './recommend';

export interface VoucherProjectionRow {
  certId: string;
  priceUsd: number;
  voucherId: string | null;
  effectiveUsd: number;
  discarded: boolean;
}

export interface RouteCostProjection {
  rows: VoucherProjectionRow[];
  /** Suma con los vouchers disponibles aplicados en orden. */
  withVouchersUsd: number;
  /** Suma a precio de lista (sin vouchers). */
  withoutVouchersUsd: number;
  savingsUsd: number;
  /** Vouchers que se consumirían en la simulación. */
  consumedVoucherIds: string[];
}

export interface RouteCostInput {
  planItems: PlanItem[];
  certifications: Certification[];
  vouchers: Voucher[];
  /** Fecha de referencia para descartar vouchers vencidos (YYYY-MM-DD). */
  today?: string;
}

function isUsable(voucher: Voucher, today: string): boolean {
  if (voucher.status !== 'disponible') return false;
  if (voucher.usedForAttemptId) return false;
  // Un voucher sirve hasta el día de su vencimiento (inclusive); solo se descarta
  // cuando la fecha de vencimiento ya pasó.
  if (voucher.expiresAt) return daysBetween(today, voucher.expiresAt) >= 0;
  return true;
}

/**
 * §8.3 — Costo de la ruta restante: recorre las certificaciones planeadas no aprobadas
 * en orden de ruta y aplica un voucher disponible a la siguiente que lo necesite.
 * Un voucher se consume una sola vez y solo si está `disponible` y no vencido.
 */
export function remainingRouteCost(input: RouteCostInput): RouteCostProjection {
  const today = input.today ?? localDate();
  const available = input.vouchers.filter((v) => isUsable(v, today));
  const queue = [...available];
  const rows: VoucherProjectionRow[] = [];

  for (const item of sortRoute(input.planItems, input.certifications)) {
    if (item.status === 'aprobado' || item.status === 'saltado') continue;
    const cert = input.certifications.find((c) => c.id === item.certId);
    if (!cert) continue;
    const price = cert.priceUsd ?? 0;
    const voucher = queue.shift() ?? null;
    const effective = voucher ? Math.round(price * (1 - voucher.percent / 100) * 100) / 100 : price;
    rows.push({
      certId: cert.id,
      priceUsd: price,
      voucherId: voucher?.id ?? null,
      effectiveUsd: effective,
      discarded: false,
    });
  }

  const withVouchers = rows.reduce((sum, row) => sum + row.effectiveUsd, 0);
  const without = rows.reduce((sum, row) => sum + row.priceUsd, 0);

  return {
    rows,
    withVouchersUsd: withVouchers,
    withoutVouchersUsd: without,
    savingsUsd: without - withVouchers,
    consumedVoucherIds: rows.map((r) => r.voucherId).filter((id): id is string => id !== null),
  };
}

export interface BudgetTotals {
  plannedUsd: number;
  paidUsd: number;
  remainingUsd: number;
  /** paid / planned (0 si no hay plan) */
  burnRatio: number;
}

export function budgetTotals(items: BudgetItem[]): BudgetTotals {
  const planned = items
    .filter((i) => i.status === 'planeado')
    .reduce((sum, i) => sum + i.amountUsd, 0);
  const paid = items.filter((i) => i.status === 'pagado').reduce((sum, i) => sum + i.amountUsd, 0);
  const plannedTotal = planned + paid;
  return {
    plannedUsd: planned,
    paidUsd: paid,
    remainingUsd: Math.max(0, planned),
    burnRatio: plannedTotal > 0 ? paid / plannedTotal : 0,
  };
}

/** Costo acumulado por mes para la gráfica de gasto (§7.6). */
export function cumulativeSpend(items: BudgetItem[]): { month: string; amount: number }[] {
  const byMonth = new Map<string, number>();
  for (const item of items) {
    if (item.status !== 'pagado' || !item.date) continue;
    const month = item.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + item.amountUsd);
  }
  let running = 0;
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amount]) => {
      running += amount;
      return { month, amount: running };
    });
}

/** Marca como vencidos los vouchers cuya fecha ya pasó. */
export function expireVouchers(vouchers: Voucher[], today: string): Voucher[] {
  return vouchers.map((voucher) =>
    voucher.status === 'disponible' && voucher.expiresAt && daysBetween(today, voucher.expiresAt) < 0
      ? { ...voucher, status: 'vencido' }
      : voucher,
  );
}

export interface UpcomingVoucher {
  voucher: Voucher;
  daysLeft: number;
}

/** Vouchers que vencen en ≤`days` días (alerta §8.5). */
export function vouchersExpiringSoon(vouchers: Voucher[], today: string, days = 30): UpcomingVoucher[] {
  return vouchers
    .filter((v) => v.status === 'disponible' && v.expiresAt)
    .map((voucher) => ({ voucher, daysLeft: daysBetween(today, voucher.expiresAt as string) }))
    .filter((row) => row.daysLeft >= 0 && row.daysLeft <= days)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Voucher del 50 % que se gana al aprobar una certificación (§7.6). */
export function voucherFromApproval(certCode: string, now: Date): Voucher {
  const expires = new Date(now.getTime());
  expires.setDate(expires.getDate() + 180);
  return {
    id: `vch-${certCode}-${localDate(now)}`,
    label: `${certCode} · 50 %`,
    percent: 50,
    source: 'aprobacion',
    expiresAt: localDate(expires),
    usedForAttemptId: null,
    status: 'disponible',
  };
}
