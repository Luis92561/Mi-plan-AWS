import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { Checkbox, Switch } from '@/components/ui/toggle';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId, useAppState } from '@/data/store';
import type { Resource } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import {
  RESOURCE_STATUSES,
  RESOURCE_TYPES,
  resourceFormSchema,
  toResource,
  toResourceFormValues,
  type ResourceFormValues,
} from '../helpers';

export interface ResourceFormModalProps {
  /** `null` = recurso nuevo. */
  resource: Resource | null;
  defaultCertId?: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Alta y edición de un recurso (§7.3, M6).
 * react-hook-form + zod: la URL debe ser http(s) y un recurso de pago exige coste.
 * Sin certificación = recurso de la fase 0 gratuita.
 */
export function ResourceFormModal({ resource, defaultCertId, onOpenChange }: ResourceFormModalProps) {
  const { t } = useT();
  const { notify } = useToast();
  const { state } = useAppState();

  const schema = useMemo(
    () =>
      resourceFormSchema({
        required: t('resources.form.err.required'),
        invalidUrl: t('resources.form.err.url'),
        invalidCost: t('resources.form.err.cost'),
        invalidMinutes: t('resources.form.err.minutes'),
      }),
    [t],
  );

  const { register, control, watch, setValue, getValues, handleSubmit, formState } =
    useForm<ResourceFormValues>({
      resolver: zodResolver(schema),
      defaultValues: toResourceFormValues(resource, defaultCertId),
    });

  const certId = watch('certId');
  const isFree = watch('isFree');
  const domainIds = watch('domainIds');
  const cert = state.certifications.find((item) => item.id === certId);
  const domains = cert?.domains ?? [];

  // Al cambiar de certificación se descartan los dominios que ya no pertenecen.
  useEffect(() => {
    const allowed = new Set(domains.map((domain) => domain.id));
    const current = getValues('domainIds');
    const next = current.filter((id) => allowed.has(id));
    if (next.length !== current.length) setValue('domainIds', next);
  }, [certId, domains, getValues, setValue]);

  const submit = handleSubmit(async (values) => {
    try {
      const row = toResource(values, resource?.id ?? newId('res'));
      await getDb().resources.put(row);
      notify(
        resource
          ? t('resources.form.updated', { title: row.title })
          : t('resources.form.saved', { title: row.title }),
        'ok',
      );
      onOpenChange(false);
    } catch (cause) {
      notify(t('resources.form.error', { message: (cause as Error).message }), 'err');
    }
  });

  const toggleDomain = (domainId: string, checked: boolean) => {
    const current = getValues('domainIds');
    setValue(
      'domainIds',
      checked ? [...current, domainId] : current.filter((id) => id !== domainId),
    );
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={resource ? t('resources.form.editTitle') : t('resources.form.newTitle')}
      description={t('resources.form.help')}
      closeLabel={t('common.close')}
      className="w-[min(680px,calc(100vw-24px))]"
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
            {t('resources.form.submit')}
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
          label={t('resources.form.title')}
          htmlFor="res-title"
          error={formState.errors.title?.message}
        >
          <Input
            id="res-title"
            placeholder={t('resources.form.titlePlaceholder')}
            {...register('title')}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t('resources.form.cert')}
            htmlFor="res-cert"
            hint={t('resources.form.certHint')}
          >
            <Select id="res-cert" {...register('certId')}>
              <option value="">{t('resources.certNone')}</option>
              {state.certifications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t('resources.form.provider')}
            htmlFor="res-provider"
            error={formState.errors.provider?.message}
          >
            <Input
              id="res-provider"
              placeholder={t('resources.form.providerPlaceholder')}
              {...register('provider')}
            />
          </Field>
        </div>

        <Field
          label={t('resources.form.url')}
          htmlFor="res-url"
          hint={t('resources.form.urlHint')}
          error={formState.errors.url?.message}
        >
          <Input id="res-url" inputMode="url" {...register('url')} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('resources.form.type')} htmlFor="res-type">
            <Select id="res-type" {...register('type')}>
              {RESOURCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`enum.resource.${value}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('resources.form.status')} htmlFor="res-status">
            <Select id="res-status" {...register('status')}>
              {RESOURCE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`enum.resourceStatus.${value}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-card border border-line bg-panel-2 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Controller
              control={control}
              name="isFree"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) setValue('cost', '0');
                  }}
                  label={t('resources.form.free')}
                />
              )}
            />
            <span className="text-ui text-text">{t('resources.form.free')}</span>
          </div>
          <p className="mt-1 text-meta text-muted">{t('resources.form.freeHint')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t('resources.form.cost')}
            htmlFor="res-cost"
            hint={t('resources.form.costHint')}
            error={formState.errors.cost?.message}
          >
            <Input
              id="res-cost"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              disabled={isFree}
              {...register('cost')}
            />
          </Field>

          <Field
            label={t('resources.form.minutes')}
            htmlFor="res-minutes"
            hint={t('resources.form.minutesHint')}
            error={formState.errors.estimatedMin?.message}
          >
            <Input
              id="res-minutes"
              type="number"
              min={0}
              // Escala 0,1,2,…: la misma regla que `isWholeMinutes` («minutos
              // enteros, 0 o más»). Con `step={1}` un valor como 7 caía fuera de
              // escala y, si el form perdiera `noValidate`, el navegador abortaría
              // el submit sin avisar (misma clase que el P-1 de «Hoy»).
              step={1}
              inputMode="numeric"
              {...register('estimatedMin')}
            />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="label-mono">{t('resources.form.domains')}</legend>
          <p className="text-meta text-muted">{t('resources.form.domainsHint')}</p>
          {domains.length === 0 ? (
            <p className="text-meta text-muted">{t('resources.form.domainsNone')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {domains.map((domain) => (
                <li key={domain.id} className="flex items-start gap-2.5">
                  <Checkbox
                    checked={domainIds.includes(domain.id)}
                    onCheckedChange={(checked) => toggleDomain(domain.id, checked)}
                    label={domain.name}
                    className="mt-0.5"
                  />
                  <span className="text-ui text-text">{domain.name}</span>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <Field label={t('resources.form.note')} htmlFor="res-note" hint={t('common.optional')}>
          <Textarea id="res-note" rows={3} {...register('note')} />
        </Field>
      </form>
    </Modal>
  );
}
