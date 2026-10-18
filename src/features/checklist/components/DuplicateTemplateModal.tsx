import { useState } from 'react';
import { Button, Field, Select } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import type { Certification } from '@/data/types';
import { useT } from '@/lib/i18n/useT';

export interface DuplicateTemplateModalProps {
  source: Certification;
  certifications: Certification[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (target: Certification) => void;
}

/**
 * §7.10 — duplicar la plantilla de una certificación en otra. El destino nunca
 * es la propia origen y las claves ya presentes en el destino se omiten (lo
 * decide `duplicateTemplateRows`).
 */
export function DuplicateTemplateModal({
  source,
  certifications,
  busy,
  onClose,
  onConfirm,
}: DuplicateTemplateModalProps) {
  const { t } = useT();
  const candidates = certifications
    .filter((cert) => cert.id !== source.id)
    .sort((a, b) => a.code.localeCompare(b.code));
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? '');
  const target = candidates.find((cert) => cert.id === targetId) ?? null;

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('checklist.duplicate.title')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" className="min-h-[44px]" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            glyph
            className="min-h-[44px]"
            disabled={busy || target === null}
            onClick={() => {
              if (target) onConfirm(target);
            }}
          >
            {t('checklist.duplicate.confirm')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-ui text-muted">
          {t('checklist.duplicate.body', { source: source.code })}
        </p>
        <Field label={t('checklist.duplicate.target')} htmlFor="checklist-duplicate-target">
          <Select
            id="checklist-duplicate-target"
            value={targetId}
            disabled={candidates.length === 0}
            onChange={(event) => setTargetId(event.target.value)}
          >
            {candidates.length === 0 ? (
              <option value="">{t('checklist.duplicate.choose')}</option>
            ) : null}
            {candidates.map((cert) => (
              <option key={cert.id} value={cert.id}>
                {t('checklist.form.certOption', { code: cert.code, name: cert.name })}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
