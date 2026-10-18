import { useMemo, useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Button, EmptyState, Field, Select, StatusGlyph, type GlyphState } from '@/components/ui/primitives';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import type { UpcomingVoucher } from '@/domain/budget';
import type { Certification, Voucher, VoucherStatus } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';

export interface VouchersPanelProps {
  vouchers: Voucher[];
  /** Vouchers que vencen en ≤30 días (`vouchersExpiringSoon`). */
  upcoming: UpcomingVoucher[];
  certifications: Certification[];
  defaultCertId?: string;
  onEdit: (voucher: Voucher) => void;
  onDelete: (voucher: Voucher) => void;
  onToggleStatus: (voucher: Voucher) => void;
  onExpireAll: () => void;
  onAddApproval: (certId: string) => void;
}

function voucherGlyph(status: VoucherStatus): GlyphState {
  if (status === 'usado') return 'hecho';
  if (status === 'vencido') return 'alerta';
  return 'pendiente';
}

/**
 * Registro de vouchers (§7.6, M7): etiqueta, porcentaje, origen, expiración y estado.
 * `▲` cuando vence en ≤30 días y acción «marcar vencidos» con `expireVouchers`.
 */
export function VouchersPanel({
  vouchers,
  upcoming,
  certifications,
  defaultCertId,
  onEdit,
  onDelete,
  onToggleStatus,
  onExpireAll,
  onAddApproval,
}: VouchersPanelProps) {
  const { t, f } = useT();
  const [approvalCert, setApprovalCert] = useState(defaultCertId ?? certifications[0]?.id ?? '');

  const daysLeft = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of upcoming) map.set(entry.voucher.id, entry.daysLeft);
    return map;
  }, [upcoming]);

  const expiringBadge = (voucher: Voucher) => {
    const days = daysLeft.get(voucher.id);
    if (days === undefined) return null;
    return (
      <span className="inline-flex items-center gap-1 text-meta text-warn">
        <span aria-hidden="true">▲</span>
        <span>{t('budget.vouchers.expiring', { count: days })}</span>
      </span>
    );
  };

  const actions = (voucher: Voucher, compact: boolean) => {
    const size = compact ? 'h-9 w-9' : 'h-11 w-11';
    return (
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label={t('budget.vouchers.menu', { label: voucher.label })}
            className={`flex ${size} items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text`}
          >
            <Ellipsis size={16} aria-hidden="true" />
          </button>
        </MenuTrigger>
        <MenuContent ariaLabel={t('budget.vouchers.menu', { label: voucher.label })}>
          <MenuItem onSelect={() => onEdit(voucher)}>{t('budget.vouchers.edit')}</MenuItem>
          <MenuItem onSelect={() => onToggleStatus(voucher)}>
            {voucher.status === 'usado' ? t('budget.vouchers.markAvailable') : t('budget.vouchers.markUsed')}
          </MenuItem>
          <MenuSeparator />
          <MenuItem danger onSelect={() => onDelete(voucher)}>
            {t('budget.vouchers.delete')}
          </MenuItem>
        </MenuContent>
      </Menu>
    );
  };

  const approvals = (
    <div className="flex flex-col gap-1.5 rounded-card border border-line bg-panel-2 px-3 py-2.5">
      <span className="label-mono">{t('budget.vouchers.approval.title')}</span>
      <p className="text-meta text-muted">{t('budget.vouchers.approval.hint')}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field
          label={t('budget.vouchers.approval.cert')}
          htmlFor="vch-approval-cert"
          className="min-w-0 flex-1"
        >
          <Select
            id="vch-approval-cert"
            value={approvalCert}
            onChange={(event) => setApprovalCert(event.target.value)}
          >
            {certifications.map((cert) => (
              <option key={cert.id} value={cert.id}>
                {cert.code} · {cert.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          variant="secondary"
          disabled={approvalCert === ''}
          onClick={() => onAddApproval(approvalCert)}
        >
          {t('budget.vouchers.approval.add')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-prose text-meta text-muted">{t('budget.vouchers.hint')}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onExpireAll}>
            {t('budget.vouchers.expire.action')}
          </Button>
        </div>
      </div>

      {vouchers.length === 0 ? (
        <EmptyState title={t('budget.vouchers.empty.title')} body={t('budget.vouchers.empty.body')} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="ledger">
              <caption className="sr-only">{t('budget.vouchers.title')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('budget.vouchers.col.label')}</th>
                  <th scope="col" className="num">
                    {t('budget.vouchers.col.percent')}
                  </th>
                  <th scope="col">{t('budget.vouchers.col.source')}</th>
                  <th scope="col">{t('budget.vouchers.col.expires')}</th>
                  <th scope="col">{t('budget.vouchers.col.status')}</th>
                  <th scope="col" className="num">
                    {t('budget.vouchers.col.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td className="text-text">{voucher.label}</td>
                    <td className="num tnum">{f.percent(voucher.percent / 100)}</td>
                    <td className="text-meta text-muted">
                      {t(`enum.voucherSource.${voucher.source}` as TKey)}
                    </td>
                    <td>
                      <span className="tnum text-meta text-muted">
                        {voucher.expiresAt === null
                          ? t('budget.vouchers.noExpiry')
                          : f.date(voucher.expiresAt)}
                      </span>
                      <div className="mt-0.5">{expiringBadge(voucher)}</div>
                    </td>
                    <td>
                      <StatusGlyph
                        state={voucherGlyph(voucher.status)}
                        label={t(`enum.voucherStatus.${voucher.status}` as TKey)}
                      />
                    </td>
                    <td className="num">{actions(voucher, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {vouchers.map((voucher) => (
              <li key={voucher.id} className="rounded-card border border-line bg-panel px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-ui text-text">{voucher.label}</p>
                    <p className="text-meta text-muted">
                      {t(`enum.voucherSource.${voucher.source}` as TKey)}
                    </p>
                  </div>
                  {actions(voucher, false)}
                </div>
                <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-meta">
                  <div>
                    <dt className="label-mono">{t('budget.vouchers.col.percent')}</dt>
                    <dd className="tnum text-text">{f.percent(voucher.percent / 100)}</dd>
                  </div>
                  <div>
                    <dt className="label-mono">{t('budget.vouchers.col.expires')}</dt>
                    <dd className="tnum text-text">
                      {voucher.expiresAt === null
                        ? t('budget.vouchers.noExpiry')
                        : f.date(voucher.expiresAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-mono">{t('budget.vouchers.col.status')}</dt>
                    <dd>
                      <StatusGlyph
                        state={voucherGlyph(voucher.status)}
                        label={t(`enum.voucherStatus.${voucher.status}` as TKey)}
                      />
                    </dd>
                  </div>
                </dl>
                <div className="mt-1">{expiringBadge(voucher)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {certifications.length > 0 ? approvals : null}
    </div>
  );
}
