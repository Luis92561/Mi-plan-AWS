import { Ellipsis } from 'lucide-react';
import { Chip, StatusGlyph, type GlyphState } from '@/components/ui/primitives';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import type { BudgetItem, BudgetStatus, Certification, Voucher } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';

export interface BudgetLedgerProps {
  items: BudgetItem[];
  certifications: Certification[];
  vouchers: Voucher[];
  onEdit: (item: BudgetItem) => void;
  onDelete: (item: BudgetItem) => void;
  onToggleStatus: (item: BudgetItem) => void;
}

function statusGlyph(status: BudgetStatus): GlyphState {
  return status === 'pagado' ? 'hecho' : 'pendiente';
}

/**
 * Ledger del presupuesto (§7.6, M7): concepto, certificación, tipo, importe en `f.currency`,
 * estado, fecha, voucher y nota. Tabla con `th scope` en desktop, tarjetas con label en móvil.
 */
export function BudgetLedger({
  items,
  certifications,
  vouchers,
  onEdit,
  onDelete,
  onToggleStatus,
}: BudgetLedgerProps) {
  const { t, f } = useT();

  const certOf = (item: BudgetItem): string =>
    item.certId === null
      ? t('budget.form.certNone')
      : (certifications.find((cert) => cert.id === item.certId)?.code ?? item.certId);

  const voucherOf = (item: BudgetItem): string =>
    item.voucherId === null
      ? t('budget.form.voucherNone')
      : (vouchers.find((voucher) => voucher.id === item.voucherId)?.label ?? item.voucherId);

  const actions = (item: BudgetItem, compact: boolean) => {
    const size = compact ? 'h-9 w-9' : 'h-11 w-11';
    return (
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label={t('budget.row.menu', { concept: item.concept })}
            className={`flex ${size} items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text`}
          >
            <Ellipsis size={16} aria-hidden="true" />
          </button>
        </MenuTrigger>
        <MenuContent ariaLabel={t('budget.row.menu', { concept: item.concept })}>
          <MenuItem onSelect={() => onEdit(item)}>{t('budget.row.edit')}</MenuItem>
          <MenuItem onSelect={() => onToggleStatus(item)}>
            {item.status === 'pagado' ? t('budget.row.markPlanned') : t('budget.row.markPaid')}
          </MenuItem>
          <MenuSeparator />
          <MenuItem danger onSelect={() => onDelete(item)}>
            {t('budget.row.delete')}
          </MenuItem>
        </MenuContent>
      </Menu>
    );
  };

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="ledger">
          <caption className="sr-only">{t('budget.ledger.title')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('budget.col.concept')}</th>
              <th scope="col">{t('budget.col.cert')}</th>
              <th scope="col">{t('budget.col.kind')}</th>
              <th scope="col" className="num">
                {t('budget.col.amount')}
              </th>
              <th scope="col">{t('budget.col.status')}</th>
              <th scope="col">{t('budget.col.date')}</th>
              <th scope="col">{t('budget.col.voucher')}</th>
              <th scope="col" className="num">
                {t('budget.col.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="text-text">{item.concept}</span>
                  {item.note ? <p className="mt-0.5 text-meta text-muted">{item.note}</p> : null}
                </td>
                <td>
                  <Chip>{certOf(item)}</Chip>
                </td>
                <td className="text-meta text-muted">
                  {t(`enum.budgetKind.${item.kind}` as TKey)}
                </td>
                <td className="num tnum text-text">{f.currency(item.amountUsd)}</td>
                <td>
                  <StatusGlyph
                    state={statusGlyph(item.status)}
                    label={t(`enum.budgetStatus.${item.status}` as TKey)}
                  />
                </td>
                <td className="tnum text-meta text-muted">
                  {item.date === null ? '—' : f.date(item.date)}
                </td>
                <td className="text-meta text-muted">{voucherOf(item)}</td>
                <td className="num">{actions(item, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {items.map((item) => (
          <li key={item.id} className="rounded-card border border-line bg-panel px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-ui text-text">{item.concept}</p>
              {actions(item, false)}
            </div>
            <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 text-meta">
              <div>
                <dt className="label-mono">{t('budget.col.amount')}</dt>
                <dd className="tnum text-text">{f.currency(item.amountUsd)}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('budget.col.cert')}</dt>
                <dd>
                  <Chip>{certOf(item)}</Chip>
                </dd>
              </div>
              <div>
                <dt className="label-mono">{t('budget.col.kind')}</dt>
                <dd className="text-text">{t(`enum.budgetKind.${item.kind}` as TKey)}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('budget.col.date')}</dt>
                <dd className="tnum text-text">{item.date === null ? '—' : f.date(item.date)}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('budget.col.voucher')}</dt>
                <dd className="text-text">{voucherOf(item)}</dd>
              </div>
            </dl>
            <div className="mt-1.5">
              <StatusGlyph
                state={statusGlyph(item.status)}
                label={t(`enum.budgetStatus.${item.status}` as TKey)}
              />
            </div>
            {item.note ? <p className="mt-1.5 text-meta text-muted">{item.note}</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
