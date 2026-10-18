import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, Input, Select } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId } from '@/data/store';
import type { Voucher } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import {
  VOUCHER_SOURCES,
  VOUCHER_STATUSES,
  toVoucher,
  toVoucherFormValues,
  voucherFormSchema,
  type VoucherFormValues,
} from '../helpers';

export interface VoucherFormModalProps {
  /** `null` = voucher nuevo. */
  voucher: Voucher | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Alta y edición de vouchers (§7.6, M7): etiqueta, porcentaje, origen,
 * expiración y estado. Solo los `disponible` se aplican en la proyección.
 */
export function VoucherFormModal({ voucher, onOpenChange }: VoucherFormModalProps) {
  const { t } = useT();
  const { notify } = useToast();

  const schema = useMemo(
    () =>
      voucherFormSchema({
        label: t('budget.voucherForm.err.label'),
        percent: t('budget.voucherForm.err.percent'),
        date: t('budget.form.err.date'),
      }),
    [t],
  );

  const { register, handleSubmit, formState } = useForm<VoucherFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toVoucherFormValues(voucher),
  });

  const submit = handleSubmit(async (values) => {
    try {
      const row = toVoucher(values, voucher?.id ?? newId('vch'));
      await getDb().vouchers.put(row);
      notify(
        voucher
          ? t('budget.voucherForm.updated', { label: row.label })
          : t('budget.voucherForm.saved', { label: row.label }),
        'ok',
      );
      onOpenChange(false);
    } catch (cause) {
      notify(t('budget.voucherForm.error', { message: (cause as Error).message }), 'err');
    }
  });

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={voucher ? t('budget.voucherForm.editTitle') : t('budget.voucherForm.newTitle')}
      description={t('budget.voucherForm.help')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            glyph
            disabled={formState.isSubmitting}
            onClick={() => {
              void submit();
            }}
          >
            {t('budget.voucherForm.submit')}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <Field
          label={t('budget.voucherForm.label')}
          htmlFor="vch-label"
          error={formState.errors.label?.message}
        >
          <Input
            id="vch-label"
            placeholder={t('budget.voucherForm.labelPlaceholder')}
            {...register('label')}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t('budget.voucherForm.percent')}
            htmlFor="vch-percent"
            error={formState.errors.percent?.message}
          >
            <Input
              id="vch-percent"
              type="number"
              min={1}
              max={100}
              step="1"
              inputMode="numeric"
              {...register('percent')}
            />
          </Field>

          <Field label={t('budget.voucherForm.source')} htmlFor="vch-source">
            <Select id="vch-source" {...register('source')}>
              {VOUCHER_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {t(`enum.voucherSource.${source}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t('budget.voucherForm.expires')}
            htmlFor="vch-expires"
            hint={t('common.optional')}
            error={formState.errors.expiresAt?.message}
          >
            <Input id="vch-expires" type="date" {...register('expiresAt')} />
          </Field>

          <Field
            label={t('budget.voucherForm.status')}
            htmlFor="vch-status"
            hint={t('budget.voucherForm.statusHint')}
          >
            <Select id="vch-status" {...register('status')}>
              {VOUCHER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`enum.voucherStatus.${status}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
