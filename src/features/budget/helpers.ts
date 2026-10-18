import { z } from 'zod';
import type {
  BudgetItem,
  BudgetKind,
  BudgetStatus,
  Certification,
  PlanItem,
  Voucher,
  VoucherSource,
  VoucherStatus,
} from '@/data/types';
import { voucherFromApproval, type RouteCostProjection } from '@/domain/budget';
import { sortRoute } from '@/domain/recommend';
import { isValidDateString } from '@/lib/dates';

export const BUDGET_KINDS = [
  'examen',
  'suscripcion',
  'curso',
  'lab',
  'otro',
] as const satisfies readonly BudgetKind[];

export const BUDGET_STATUSES = ['planeado', 'pagado'] as const satisfies readonly BudgetStatus[];

export const VOUCHER_SOURCES = [
  'aprobacion',
  'campana',
  'beta',
  'manual',
] as const satisfies readonly VoucherSource[];

export const VOUCHER_STATUSES = [
  'disponible',
  'usado',
  'vencido',
] as const satisfies readonly VoucherStatus[];

/** Movimientos: lo pagado primero, por fecha descendente, y luego lo planeado. */
export function sortLedger(items: BudgetItem[]): BudgetItem[] {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pagado' ? -1 : 1;
    const dateA = a.date ?? '';
    const dateB = b.date ?? '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return a.concept.localeCompare(b.concept);
  });
}

/* --------------------------------------------------- movimientos (zod) ----- */

export interface BudgetFormMessages {
  concept: string;
  amount: string;
  date: string;
}

function isAmount(value: string): boolean {
  if (value.trim() === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export function budgetItemFormSchema(messages: BudgetFormMessages) {
  return z.object({
    concept: z.string().trim().min(1, messages.concept),
    certId: z.string(),
    kind: z.enum(BUDGET_KINDS),
    amount: z.string().refine(isAmount, messages.amount),
    status: z.enum(BUDGET_STATUSES),
    date: z.string().refine((value) => value === '' || isValidDateString(value), messages.date),
    voucherId: z.string(),
    note: z.string(),
  });
}

export type BudgetItemFormValues = z.infer<ReturnType<typeof budgetItemFormSchema>>;

export function toBudgetItemFormValues(
  item: BudgetItem | null,
  defaultCertId?: string,
): BudgetItemFormValues {
  if (!item) {
    return {
      concept: '',
      certId: defaultCertId ?? '',
      kind: 'examen',
      amount: '0',
      status: 'planeado',
      date: '',
      voucherId: '',
      note: '',
    };
  }
  return {
    concept: item.concept,
    certId: item.certId ?? '',
    kind: item.kind,
    amount: String(item.amountUsd),
    status: item.status,
    date: item.date ?? '',
    voucherId: item.voucherId ?? '',
    note: item.note,
  };
}

export function toBudgetItem(values: BudgetItemFormValues, id: string): BudgetItem {
  const amount = Number(values.amount);
  return {
    id,
    concept: values.concept.trim(),
    certId: values.certId === '' ? null : values.certId,
    kind: values.kind,
    amountUsd: Math.round((Number.isFinite(amount) ? Math.max(0, amount) : 0) * 100) / 100,
    status: values.status,
    date: values.date === '' ? null : values.date,
    voucherId: values.voucherId === '' ? null : values.voucherId,
    note: values.note.trim(),
  };
}

/* ------------------------------------------------------ vouchers (zod) ----- */

export interface VoucherFormMessages {
  label: string;
  percent: string;
  date: string;
}

function isPercent(value: string): boolean {
  if (value.trim() === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100;
}

export function voucherFormSchema(messages: VoucherFormMessages) {
  return z.object({
    label: z.string().trim().min(1, messages.label),
    percent: z.string().refine(isPercent, messages.percent),
    source: z.enum(VOUCHER_SOURCES),
    expiresAt: z.string().refine((value) => value === '' || isValidDateString(value), messages.date),
    status: z.enum(VOUCHER_STATUSES),
  });
}

export type VoucherFormValues = z.infer<ReturnType<typeof voucherFormSchema>>;

export function toVoucherFormValues(voucher: Voucher | null): VoucherFormValues {
  if (!voucher) {
    return { label: '', percent: '50', source: 'manual', expiresAt: '', status: 'disponible' };
  }
  return {
    label: voucher.label,
    percent: String(voucher.percent),
    source: voucher.source,
    expiresAt: voucher.expiresAt ?? '',
    status: voucher.status,
  };
}

export function toVoucher(values: VoucherFormValues, id: string): Voucher {
  const percent = Number(values.percent);
  return {
    id,
    label: values.label.trim(),
    percent: Math.round((Number.isFinite(percent) ? percent : 0) * 100) / 100,
    source: values.source,
    expiresAt: values.expiresAt === '' ? null : values.expiresAt,
    usedForAttemptId: null,
    status: values.status,
  };
}

/* -------------------------------------------------------- proyección ------- */

export interface RouteStep {
  certId: string;
  code: string;
  name: string;
  priceUsd: number | null;
}

/** Certificaciones pendientes en orden de ruta (base del simulador). */
export function pendingSteps(planItems: PlanItem[], certifications: Certification[]): RouteStep[] {
  return sortRoute(planItems, certifications)
    .filter((item) => item.status !== 'aprobado' && item.status !== 'saltado')
    .map((item) => {
      const cert = certifications.find((entry) => entry.id === item.certId);
      return {
        certId: item.certId,
        code: cert?.code ?? item.certId,
        name: cert?.name ?? '',
        priceUsd: cert?.priceUsd ?? null,
      };
    });
}

export interface SimulatedVoucher {
  code: string;
  voucher: Voucher;
}

export interface SimulationResult {
  planItems: PlanItem[];
  vouchers: Voucher[];
  /** Vouchers del 50 % que la simulación añade (no existen en la base). */
  simulated: SimulatedVoucher[];
}

/**
 * Estado derivado de la simulación (§7.6): las certificaciones marcadas como aprobadas
 * pasan a `aprobado` y cada una genera un voucher del 50 % con `voucherFromApproval`.
 * No escribe nada en IndexedDB.
 */
export function simulateApprovals(input: {
  planItems: PlanItem[];
  certifications: Certification[];
  vouchers: Voucher[];
  approvedCertIds: string[];
  now: Date;
}): SimulationResult {
  const approved = new Set(input.approvedCertIds);
  const planItems: PlanItem[] = input.planItems.map((item) =>
    approved.has(item.certId) ? { ...item, status: 'aprobado' } : item,
  );

  const existing = new Set(input.vouchers.map((voucher) => voucher.id));
  const simulated: SimulatedVoucher[] = [];
  for (const item of sortRoute(input.planItems, input.certifications)) {
    if (!approved.has(item.certId)) continue;
    const code = input.certifications.find((cert) => cert.id === item.certId)?.code ?? item.certId;
    const voucher = voucherFromApproval(code, input.now);
    if (existing.has(voucher.id)) continue;
    simulated.push({ code, voucher });
  }

  return {
    planItems,
    vouchers: [...input.vouchers, ...simulated.map((entry) => entry.voucher)],
    simulated,
  };
}

export interface ProjectionRowView {
  certId: string;
  code: string;
  name: string;
  /** `null` = precio por confirmar en el catálogo. */
  priceUsd: number | null;
  voucherLabel: string | null;
  effectiveUsd: number;
}

/** Filas de la proyección ya resueltas para la tabla (certificación y etiqueta del voucher). */
export function projectionRows(
  projection: RouteCostProjection,
  certifications: Certification[],
  labelOfVoucher: (voucherId: string) => string | null,
): ProjectionRowView[] {
  return projection.rows.map((row) => {
    const cert = certifications.find((entry) => entry.id === row.certId);
    return {
      certId: row.certId,
      code: cert?.code ?? row.certId,
      name: cert?.name ?? '',
      priceUsd: cert ? cert.priceUsd : row.priceUsd,
      voucherLabel: row.voucherId === null ? null : labelOfVoucher(row.voucherId),
      effectiveUsd: row.effectiveUsd,
    };
  });
}

/** Vouchers cuyo estado cambió al aplicar `expireVouchers` (para persistir solo esos). */
export function changedVouchers(before: Voucher[], after: Voucher[]): Voucher[] {
  const previous = new Map(before.map((voucher) => [voucher.id, voucher.status]));
  return after.filter((voucher) => previous.get(voucher.id) !== voucher.status);
}
