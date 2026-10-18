import type { AppState } from '@/data/types';
import { daysBetween, localDate } from '@/lib/dates';
import { vouchersExpiringSoon } from './budget';
import { computeReadiness } from './readiness';
import { daysToRetirement, sortRoute } from './recommend';
import { inactiveDays } from './stats';
import { budgetTotals } from './budget';

export type AlertType = 'voucher' | 'retiring' | 'ready' | 'inactive' | 'overBudget';

export interface AppAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warn' | 'error';
  /** Clave del diccionario; la UI la traduce con `t()`. */
  messageKey: string;
  vars: Record<string, string | number>;
  href: string;
}

/**
 * §8.5 — Alertas, máximo 3 visibles, en este orden de prioridad:
 *  1. voucher vence en ≤30 días
 *  2. certificación planeada `retiring` con ≤120 días
 *  3. readiness ≥80 % sin examen agendado
 *  4. sin sesiones en ≥3 días
 *  5. gasto real > 120 % de lo planeado
 */
export function buildAlerts(state: AppState, now: Date): AppAlert[] {
  const today = localDate(now);
  const alerts: AppAlert[] = [];

  const expiring = vouchersExpiringSoon(state.vouchers, today, 30);
  for (const row of expiring.slice(0, 1)) {
    alerts.push({
      id: `alert-voucher-${row.voucher.id}`,
      type: 'voucher',
      severity: row.daysLeft <= 7 ? 'error' : 'warn',
      messageKey: 'dashboard.voucherExpiring',
      vars: { label: row.voucher.label, count: row.daysLeft, n: row.daysLeft },
      href: '/presupuesto',
    });
  }

  const route = sortRoute(state.planItems, state.certifications);
  for (const item of route) {
    const cert = state.certifications.find((c) => c.id === item.certId);
    if (!cert || item.status === 'aprobado' || item.status === 'saltado') continue;
    const remaining = daysToRetirement(cert, now);
    if (cert.lifecycle === 'retiring' && remaining !== null && remaining >= 0 && remaining <= 120) {
      alerts.push({
        id: `alert-retiring-${cert.id}`,
        type: 'retiring',
        severity: remaining <= 30 ? 'error' : 'warn',
        messageKey: 'dashboard.retiringSoon',
        vars: { date: cert.retirementDate ?? '', code: cert.code },
        href: `/ruta/${cert.id}`,
      });
      break;
    }
  }

  const activeCertId = state.settings.activeCertId;
  const activeItem = route.find((item) => item.certId === activeCertId);
  if (activeItem && activeItem.status !== 'agendado' && activeItem.status !== 'aprobado') {
    const cert = state.certifications.find((c) => c.id === activeItem.certId);
    if (cert) {
      const readiness = computeReadiness({
        cert,
        planItem: activeItem,
        attempts: state.attempts.filter((a) => a.certId === cert.id),
        resources: state.resources,
        sessions: state.studySessions,
      });
      const hasRealMock =
        state.attempts.some((a) => a.certId === cert.id && a.kind !== 'practice_set') ||
        state.attempts.some((a) => a.certId === cert.id && a.passed === true);
      if (readiness.score >= 80 && hasRealMock) {
        alerts.push({
          id: `alert-ready-${cert.id}`,
          type: 'ready',
          severity: 'info',
          messageKey: 'dashboard.readyToBook',
          vars: { n: readiness.score, code: cert.code },
          href: `/ruta/${cert.id}`,
        });
      }
    }
  }

  const idle = inactiveDays(state.studySessions, today);
  if (idle !== null && idle >= 3) {
    alerts.push({
      id: `alert-inactive-${today}`,
      type: 'inactive',
      severity: 'warn',
      messageKey: 'dashboard.inactive',
      vars: { n: idle, count: idle },
      href: '/bitacora',
    });
  }

  const totals = budgetTotals(state.budgetItems);
  const plannedTotal = totals.plannedUsd + totals.paidUsd;
  if (plannedTotal > 0 && totals.paidUsd > plannedTotal * 1.2) {
    alerts.push({
      id: `alert-budget-${today}`,
      type: 'overBudget',
      severity: 'warn',
      messageKey: 'dashboard.overBudget',
      vars: { n: Math.round((totals.paidUsd / plannedTotal) * 100) },
      href: '/presupuesto',
    });
  }

  return alerts.slice(0, 3);
}

/** Días hasta el examen agendado (o hasta la fecha objetivo) de una certificación. */
export function daysToExam(state: AppState, certId: string, now: Date): number | null {
  const item = state.planItems.find((p) => p.certId === certId);
  if (!item?.targetDate) return null;
  return daysBetween(localDate(now), item.targetDate);
}
