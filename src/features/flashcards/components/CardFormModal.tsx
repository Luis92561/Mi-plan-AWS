import { useState, type FormEvent } from 'react';
import { Button, Field, Select, Textarea } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import type { Certification, Flashcard } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { CardInput } from '../actions';

export interface CardFormModalProps {
  /** Tarjeta en edición; `null` para crear. */
  card: Flashcard | null;
  certifications: Certification[];
  /** Certificación preseleccionada al crear (la del filtro o la activa). */
  defaultCertId: string | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: CardInput) => void;
}

/**
 * Crear/editar tarjeta (§7.7). Se monta solo cuando está abierto (la página lo
 * desmonta al cerrar), así que el estado inicial ya es el correcto.
 */
export function CardFormModal({
  card,
  certifications,
  defaultCertId,
  busy,
  onClose,
  onSubmit,
}: CardFormModalProps) {
  const { t } = useT();
  const initialCert = card?.certId ?? defaultCertId ?? certifications[0]?.id ?? '';
  const [certId, setCertId] = useState(
    certifications.some((cert) => cert.id === initialCert) ? initialCert : (certifications[0]?.id ?? ''),
  );
  const [domainId, setDomainId] = useState<string | null>(card?.domainId ?? null);
  const [front, setFront] = useState(card?.front ?? '');
  const [back, setBack] = useState(card?.back ?? '');
  const [error, setError] = useState<string | null>(null);

  const domains = certifications.find((cert) => cert.id === certId)?.domains ?? [];
  const noCerts = certifications.length === 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (noCerts) return;
    if (certId === '') {
      setError(t('review.form.certRequired'));
      return;
    }
    if (front.trim() === '' || back.trim() === '') {
      setError(t('review.form.required'));
      return;
    }
    setError(null);
    onSubmit({ certId, domainId, front: front.trim(), back: back.trim() });
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={card ? t('review.form.editTitle') : t('review.form.newTitle')}
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
            form="card-form"
            className="min-h-[44px]"
            disabled={busy || noCerts}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      {noCerts ? <p className="mb-3 text-ui text-warn">{t('review.form.noCerts')}</p> : null}

      <form id="card-form" onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.certification')} htmlFor="card-form-cert">
            <Select
              id="card-form-cert"
              value={certId}
              disabled={noCerts}
              onChange={(event) => {
                setCertId(event.target.value);
                setDomainId(null);
              }}
            >
              {certifications.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {t('review.form.certOption', { code: cert.code, name: cert.name })}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t('common.domain')}
            htmlFor="card-form-domain"
            hint={t('common.optional')}
          >
            <Select
              id="card-form-domain"
              value={domainId ?? ''}
              disabled={domains.length === 0}
              onChange={(event) => setDomainId(event.target.value === '' ? null : event.target.value)}
            >
              <option value="">{t('common.none')}</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label={t('review.form.front')}
          htmlFor="card-form-front"
          hint={t('review.form.frontHint')}
          error={error ?? undefined}
        >
          <Textarea
            id="card-form-front"
            rows={3}
            value={front}
            placeholder={t('review.form.frontPlaceholder')}
            onChange={(event) => setFront(event.target.value)}
          />
        </Field>

        <Field
          label={t('review.form.back')}
          htmlFor="card-form-back"
          hint={t('review.form.backHint')}
        >
          <Textarea
            id="card-form-back"
            rows={3}
            value={back}
            placeholder={t('review.form.backPlaceholder')}
            onChange={(event) => setBack(event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
