import { useT } from '@/lib/i18n/useT';
import type { ProjectionRowView } from '../helpers';

export interface RouteProjectionProps {
  rows: ProjectionRowView[];
  withVouchersUsd: number;
  withoutVouchersUsd: number;
  savingsUsd: number;
  emptyText: string;
}

/**
 * Proyección de la ruta restante (§7.6, §8.3): por certificación, precio de lista,
 * voucher aplicado y coste efectivo; debajo, la comparativa sin/con vouchers.
 */
export function RouteProjection({
  rows,
  withVouchersUsd,
  withoutVouchersUsd,
  savingsUsd,
  emptyText,
}: RouteProjectionProps) {
  const { t, f } = useT();

  const priceText = (row: ProjectionRowView): string =>
    row.priceUsd === null ? t('budget.projection.priceUnknown') : f.currency(row.priceUsd);

  const totals = (
    <dl className="mt-3 grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-3">
      <div>
        <dt className="label-mono">{t('budget.projection.without')}</dt>
        <dd className="tnum text-ui text-text">{f.currency(withoutVouchersUsd)}</dd>
      </div>
      <div>
        <dt className="label-mono">{t('budget.projection.with')}</dt>
        <dd className="tnum text-ui text-text">{f.currency(withVouchersUsd)}</dd>
      </div>
      <div>
        <dt className="label-mono">{t('budget.projection.savings')}</dt>
        <dd className="tnum text-ui text-accent">{f.currency(savingsUsd)}</dd>
      </div>
    </dl>
  );

  if (rows.length === 0) {
    return <p className="rounded-card border border-dashed border-line px-3 py-6 text-center text-ui text-muted">{emptyText}</p>;
  }

  return (
    <div className="flex flex-col">
      <div className="hidden overflow-x-auto md:block">
        <table className="ledger">
          <caption className="sr-only">{t('budget.projection.label')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('budget.projection.col.cert')}</th>
              <th scope="col" className="num">
                {t('budget.projection.col.price')}
              </th>
              <th scope="col">{t('budget.projection.col.voucher')}</th>
              <th scope="col" className="num">
                {t('budget.projection.col.effective')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.certId}>
                <td>
                  <span className="text-text">{row.code}</span>
                  {row.name ? <p className="mt-0.5 text-meta text-muted">{row.name}</p> : null}
                </td>
                <td className="num tnum text-muted">{priceText(row)}</td>
                <td className="text-meta text-muted">
                  {row.voucherLabel ?? t('budget.projection.noVoucher')}
                </td>
                <td className="num tnum text-text">{f.currency(row.effectiveUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li
            key={row.certId}
            className="rounded-card border border-line bg-panel px-3 py-2.5"
          >
            <p className="text-ui text-text">{row.code}</p>
            {row.name ? <p className="text-meta text-muted">{row.name}</p> : null}
            <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-meta">
              <div>
                <dt className="label-mono">{t('budget.projection.col.price')}</dt>
                <dd className="tnum text-text">{priceText(row)}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('budget.projection.col.voucher')}</dt>
                <dd className="text-text">{row.voucherLabel ?? t('budget.projection.noVoucher')}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('budget.projection.col.effective')}</dt>
                <dd className="tnum text-text">{f.currency(row.effectiveUsd)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {totals}
    </div>
  );
}
