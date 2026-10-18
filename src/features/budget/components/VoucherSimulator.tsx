import { RotateCcw, Undo2 } from 'lucide-react';
import { Badge, Button, Chip } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import type { ProjectionRowView, RouteStep } from '../helpers';

export interface VoucherSimulatorProps {
  steps: RouteStep[];
  approvedCertIds: string[];
  onApprove: (certId: string) => void;
  onUndo: (certId: string) => void;
  onReset: () => void;
  /** Proyección del estado derivado, sin escribir en la base. */
  rows: ProjectionRowView[];
  withVouchersUsd: number;
  withoutVouchersUsd: number;
  savingsUsd: number;
}

/**
 * Simulador de vouchers (§7.6): se recorren las certificaciones planeadas en orden y
 * cada aprobación simulada aplica un 50 % a la siguiente por pagar. Solo estado en memoria.
 */
export function VoucherSimulator({
  steps,
  approvedCertIds,
  onApprove,
  onUndo,
  onReset,
  rows,
  withVouchersUsd,
  withoutVouchersUsd,
  savingsUsd,
}: VoucherSimulatorProps) {
  const { t, f } = useT();
  const approved = new Set(approvedCertIds);
  const active = approvedCertIds.length > 0;

  if (steps.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line px-3 py-6 text-center text-ui text-muted">
        {t('budget.sim.empty')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-meta text-muted">{t('budget.sim.hint')}</p>

      <ol className="flex flex-col gap-1.5">
        {steps.map((step, index) => {
          const isApproved = approved.has(step.certId);
          return (
            <li
              key={step.certId}
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-input border border-line px-2.5 py-2"
            >
              <span className="tnum text-label text-muted">{t('budget.sim.step', { n: index + 1 })}</span>
              <span className="text-ui text-text">{step.code}</span>
              <span className="tnum text-meta text-muted">
                {step.priceUsd === null
                  ? t('budget.projection.priceUnknown')
                  : f.currency(step.priceUsd)}
              </span>
              {isApproved ? <Badge tone="accent">{t('budget.sim.simulated')}</Badge> : null}
              <span className="ml-auto">
                {isApproved ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('budget.sim.undoFor', { code: step.code })}
                    onClick={() => onUndo(step.certId)}
                  >
                    <Undo2 size={14} aria-hidden="true" />
                    {t('budget.sim.undo')}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={t('budget.sim.approveFor', { code: step.code })}
                    onClick={() => onApprove(step.certId)}
                  >
                    {t('budget.sim.approve')}
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" className="flex flex-col gap-2">
        {active ? (
          <>
            <ul className="flex flex-col gap-1">
              {rows.map((row) => (
                <li
                  key={row.certId}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-meta"
                >
                  <span className="text-ui text-text">{row.code}</span>
                  <span className="tnum text-muted">
                    {row.priceUsd === null
                      ? t('budget.projection.priceUnknown')
                      : f.currency(row.priceUsd)}
                  </span>
                  <span aria-hidden="true" className="text-muted">
                    →
                  </span>
                  <span className="tnum text-text">{f.currency(row.effectiveUsd)}</span>
                  {row.voucherLabel ? <Chip>{row.voucherLabel}</Chip> : null}
                </li>
              ))}
            </ul>

            <dl className="grid grid-cols-1 gap-2 border-t border-line pt-2 sm:grid-cols-3">
              <div>
                <dt className="label-mono">{t('budget.sim.result')}</dt>
                <dd className="tnum text-ui text-text">{f.currency(withVouchersUsd)}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('budget.projection.without')}</dt>
                <dd className="tnum text-ui text-muted">{f.currency(withoutVouchersUsd)}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('budget.sim.savings')}</dt>
                <dd className="tnum text-ui text-accent">{f.currency(savingsUsd)}</dd>
              </div>
            </dl>

            <div>
              <Button variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw size={14} aria-hidden="true" />
                {t('budget.sim.reset')}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
