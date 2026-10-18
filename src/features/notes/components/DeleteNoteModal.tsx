import { useState } from 'react';
import { getDb } from '@/data/db';
import type { Note } from '@/data/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/useT';

export interface DeleteNoteModalProps {
  note: Note | null;
  onOpenChange: (open: boolean) => void;
  /** Se llama después de borrar: la vista decide a dónde ir. */
  onDeleted: () => void;
}

/** Borrado con confirmación explícita (§7.4 aplica el mismo criterio a notas). */
export function DeleteNoteModal({ note, onOpenChange, onDeleted }: DeleteNoteModalProps) {
  const { t } = useT();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!note) return;
    setBusy(true);
    try {
      await getDb().notes.delete(note.id);
      notify(t('notes.delete.done'), 'ok');
      onOpenChange(false);
      onDeleted();
    } catch (cause) {
      notify(t('notes.delete.error', { message: cause instanceof Error ? cause.message : String(cause) }), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={note !== null}
      onOpenChange={onOpenChange}
      title={t('notes.delete.action')}
      description={
        note ? t('common.confirmDelete', { name: note.title.trim().length > 0 ? note.title : t('notes.list.untitled') }) : undefined
      }
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={() => void confirm()} disabled={busy}>
            {t('common.delete')}
          </Button>
        </>
      }
    >
      <p className="text-ui text-muted">{t('notes.versions.note')}</p>
    </Modal>
  );
}
