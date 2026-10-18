import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Select } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import type { Certification, ChecklistGroup, ChecklistItem, Recurrence } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { ItemInput } from '../actions';
import { GROUPS, RECURRENCES } from '../model';

export interface ItemFormModalProps {
  /** Ítem en edición; `null` para crear uno propio. */
  item: ChecklistItem | null;
  certifications: Certification[];
  /** Certificación preseleccionada al crear (la del filtro). */
  defaultCertId: string | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: ItemInput) => void;
}

/**
 * Crear/editar ítem propio (§7.10): título, certificación, grupo, fecha
 * opcional y recurrencia. Se monta solo cuando está abierto, así que el estado
 * inicial ya es el correcto.
 */
export function ItemFormModal({
  item,
  certifications,
  defaultCertId,
  busy,
  onClose,
  onSubmit,
}: ItemFormModalProps) {
  const { t } = useT();
  const initialCert = item?.certId ?? defaultCertId ?? certifications[0]?.id ?? '';
  const [certId, setCertId] = useState(
    certifications.some((cert) => cert.id === initialCert) ? initialCert : (certifications[0]?.id ?? ''),
  );
  const [groupId, setGroupId] = useState<ChecklistGroup>(item?.groupId ?? 'personal');
  const [title, setTitle] = useState(item?.title ?? '');
  const [dueDate, setDueDate] = useState(item?.dueDate ?? '');
  const [recurrence, setRecurrence] = useState<Recurrence>(item?.recurrence ?? 'ninguna');
  const [error, setError] = useState<string | null>(null);

  const noCerts = certifications.length === 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (noCerts) return;
    if (certId === '') {
      setError(t('checklist.form.certRequired'));
      return;
    }
    if (title.trim() === '') {
      setError(t('checklist.form.titleRequired'));
      return;
    }
    setError(null);
    onSubmit({
      certId,
      groupId,
      title: title.trim(),
      dueDate: dueDate === '' ? null : dueDate,
      recurrence,
    });
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={item ? t('checklist.form.editTitle') : t('checklist.form.newTitle')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" className="min-h-[44px]" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            glyph
            type="submit"
            form="checklist-item-form"
            className="min-h-[44px]"
            disabled={busy || noCerts}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      {noCerts ? <p className="mb-3 text-ui text-warn">{t('checklist.form.noCerts')}</p> : null}

      <form id="checklist-item-form" onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label={t('checklist.form.title')}
          htmlFor="checklist-form-title"
          error={error ?? undefined}
        >
          <Input
            id="checklist-form-title"
            value={title}
            placeholder={t('checklist.form.titlePlaceholder')}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('checklist.form.cert')} htmlFor="checklist-form-cert">
            <Select
              id="checklist-form-cert"
              value={certId}
              disabled={noCerts}
              onChange={(event) => setCertId(event.target.value)}
            >
              {certifications.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {t('checklist.form.certOption', { code: cert.code, name: cert.name })}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('checklist.form.group')} htmlFor="checklist-form-group">
            <Select
              id="checklist-form-group"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value as ChecklistGroup)}
            >
              {GROUPS.map((value) => (
                <option key={value} value={value}>
                  {t(`enum.group.${value}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t('checklist.form.due')}
            htmlFor="checklist-form-due"
            hint={t('common.optional')}
          >
            <Input
              id="checklist-form-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>

          <Field label={t('checklist.form.recurrence')} htmlFor="checklist-form-recurrence">
            <Select
              id="checklist-form-recurrence"
              value={recurrence}
              onChange={(event) => setRecurrence(event.target.value as Recurrence)}
            >
              {RECURRENCES.map((value) => (
                <option key={value} value={value}>
                  {t(`enum.recurrence.${value}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
