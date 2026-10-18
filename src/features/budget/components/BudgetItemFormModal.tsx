import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId, useAppState } from '@/data/store';
import type { BudgetItem } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import {
  BUDGET_KINDS,
  BUDGET_STATUSES,
  budgetItemFormSchema,
  toBudgetItem,
  toBudgetItemFormValues,
  type BudgetItemFormValues,
} from '../helpers';

export interface BudgetItemFormModalProps {
  /** `null` = movimiento nuevo. */
  item: BudgetItem | null;
  defaultCertId?: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Alta y edición de un movimiento del presupuesto (§7.6, M7).
 * react-hook-form + zod: concepto e importe obligatorios; fecha opcional.
 */
export function BudgetItemFormModal({ item, defaultCertId, onOpenChange }: BudgetItemFormModalProps) {
  const { t, f } = useT();
  const { notify } = useToast();
  const { state } = useAppState();

  const schema = useMemo(
    () =>
      budgetItemFormSchema({
        concept: t('budget.form.err.concept'),
        amount: t('budget.form.err.amount'),
        date: t('budget.form.err.date'),
      }),
    [t],
  );

  const { register, handleSubmit, formState } = useForm<BudgetItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toBudgetItemFormValues(item, defaultCertId),
  });

  const submit = handleSubmit(async (values) => {
    try {
      const row = toBudgetItem(values, item?.id ?? newId('bud'));
      await getDb().budgetItems.put(row);
      notify(
        item
          ? t('budget.form.updated', { concept: row.concept })
          : t('budget.form.saved', { concept: row.concept }),
        'ok',
      );
      onOpenChange(false);
    } catch (cause) {
      notify(t('budget.form.error', { message: (cause as Error).message }), 'err');
    }
  });

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={item ? t('budget.form.editTitle') : t('budget.form.newTitle')}
      description={t('budget.form.help')}
      closeLabel={t('common.close')}
      className="w-[min(660px,calc(100vw-24px))]"
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
            {t('budget.form.submit')}
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
          label={t('budget.form.concept')}
          htmlFor="bud-concept"
          error={formState.errors.concept?.message}
        >
          <Input
            id="bud-concept"
            placeholder={t('budget.form.conceptPlaceholder')}
            {...register('concept')}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('budget.form.cert')} htmlFor="bud-cert">
            <Select id="bud-cert" {...register('certId')}>
              <option value="">{t('budget.form.certNone')}</option>
              {state.certifications.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.code} · {cert.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('budget.form.kind')} htmlFor="bud-kind">
            <Select id="bud-kind" {...register('kind')}>
              {BUDGET_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`enum.budgetKind.${kind}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field
            label={t('budget.form.amount')}
            htmlFor="bud-amount"
            error={formState.errors.amount?.message}
          >
            <Input
              id="bud-amount"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              {...register('amount')}
            />
          </Field>

          <Field label={t('budget.form.status')} htmlFor="bud-status">
            <Select id="bud-status" {...register('status')}>
              {BUDGET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`enum.budgetStatus.${status}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t('budget.form.date')}
            htmlFor="bud-date"
            hint={t('common.optional')}
            error={formState.errors.date?.message}
          >
            <Input id="bud-date" type="date" {...register('date')} />
          </Field>
        </div>

        <Field label={t('budget.form.voucher')} htmlFor="bud-voucher" hint={t('common.optional')}>
          <Select id="bud-voucher" {...register('voucherId')}>
            <option value="">{t('budget.form.voucherNone')}</option>
            {state.vouchers.map((voucher) => (
              <option key={voucher.id} value={voucher.id}>
                {voucher.label} · {f.percent(voucher.percent / 100)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t('budget.form.note')} htmlFor="bud-note" hint={t('common.optional')}>
          <Textarea id="bud-note" rows={3} {...register('note')} />
        </Field>
      </form>
    </Modal>
  );
}
