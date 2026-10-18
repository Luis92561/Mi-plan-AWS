import { Button } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useT } from '@/lib/i18n/useT';

export interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmación explícita antes de borrar (contrato §1.8 y §7.4: nunca borrar en
 * silencio). Se monta solo cuando hace falta, así que siempre abre abierto.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useT();

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={title}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" className="min-h-[44px]" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="secondary"
            className="min-h-[44px] border-err/40 text-err"
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-ui text-muted">{body}</p>
    </Modal>
  );
}
