import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId } from '@/data/store';
import type {
  AppState,
  Certification,
  ChecklistGroup,
  ChecklistItem,
  Recurrence,
} from '@/data/types';
import { completeItem } from '@/domain/checklist';
import { useT } from '@/lib/i18n/useT';
import { duplicateTemplateRows, moveRows, nextOrder, restoreTemplateRows } from './model';

/** Campos editables de un ítem propio (§7.10). */
export interface ItemInput {
  certId: string;
  groupId: ChecklistGroup;
  title: string;
  dueDate: string | null;
  recurrence: Recurrence;
}

export interface ChecklistActions {
  /** §8.9 — completa/descompleta y crea la siguiente instancia si es recurrente. */
  toggle: (item: ChecklistItem) => Promise<void>;
  create: (input: ItemInput) => Promise<boolean>;
  update: (item: ChecklistItem, input: ItemInput) => Promise<boolean>;
  remove: (item: ChecklistItem) => Promise<boolean>;
  move: (item: ChecklistItem, direction: -1 | 1, visibleIds: string[]) => Promise<void>;
  /** Archiva en bloque los completados (del ámbito recibido). */
  archiveCompleted: (certId: string | null) => Promise<void>;
  unarchive: (item: ChecklistItem) => Promise<void>;
  /** Vuelve a sembrar la plantilla del nivel sin duplicar ni tocar ítems propios. */
  restore: (cert: Certification) => Promise<void>;
  /** Copia la plantilla de `source` en `target`. */
  duplicate: (source: Certification, target: Certification) => Promise<boolean>;
  /** Último resultado de escritura; lo anuncia la región `aria-live` de la página. */
  status: string;
  busyId: string | null;
}

/**
 * Escrituras del Checklist. Ninguna usa la red ni navega: la vista se entera de
 * los cambios por `useAppState()` (LiveQuery sobre IndexedDB).
 */
export function useChecklistActions(state: AppState): ChecklistActions {
  const { t, f } = useT();
  const { notify } = useToast();
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fail = useCallback(
    (cause: unknown) => {
      const reason = cause instanceof Error ? cause.message : String(cause);
      const message = t('checklist.error', { message: reason });
      setStatus(message);
      notify(message, 'err');
    },
    [notify, t],
  );

  const succeed = useCallback(
    (message: string) => {
      setStatus(message);
      notify(message, 'ok');
    },
    [notify],
  );

  const toggle = useCallback(
    async (item: ChecklistItem): Promise<void> => {
      setBusyId(item.id);
      try {
        const db = getDb();
        const now = new Date();
        const result = completeItem(item, state.checklistItems, now);
        await db.transaction('rw', db.checklistItems, async () => {
          await db.checklistItems.put(result.updated);
          if (result.spawned) await db.checklistItems.put(result.spawned);
        });
        if (!item.done) {
          succeed(
            result.spawned && result.spawned.dueDate
              ? t('checklist.completedRecurring', {
                  title: item.title,
                  date: f.date(result.spawned.dueDate),
                })
              : t('checklist.completed', { title: item.title }),
          );
        } else {
          setStatus(t('checklist.updated'));
        }
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, f, state.checklistItems, succeed, t],
  );

  const create = useCallback(
    async (input: ItemInput): Promise<boolean> => {
      setBusyId('new');
      try {
        const now = new Date();
        const item: ChecklistItem = {
          id: newId('chk'),
          certId: input.certId,
          topicId: null,
          groupId: input.groupId,
          title: input.title,
          done: false,
          doneAt: null,
          dueDate: input.dueDate,
          order: nextOrder(state.checklistItems, input.certId),
          recurrence: input.recurrence,
          templateKey: null,
          createdAt: now.toISOString(),
          archived: false,
        };
        await getDb().checklistItems.put(item);
        succeed(t('checklist.created'));
        return true;
      } catch (cause) {
        fail(cause);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [fail, state.checklistItems, succeed, t],
  );

  const update = useCallback(
    async (item: ChecklistItem, input: ItemInput): Promise<boolean> => {
      setBusyId(item.id);
      try {
        const movedCert = item.certId !== input.certId;
        await getDb().checklistItems.put({
          ...item,
          certId: input.certId,
          groupId: input.groupId,
          title: input.title,
          dueDate: input.dueDate,
          recurrence: input.recurrence,
          order: movedCert ? nextOrder(state.checklistItems, input.certId) : item.order,
        });
        succeed(t('checklist.updated'));
        return true;
      } catch (cause) {
        fail(cause);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [fail, state.checklistItems, succeed, t],
  );

  const remove = useCallback(
    async (item: ChecklistItem): Promise<boolean> => {
      setBusyId(item.id);
      try {
        await getDb().checklistItems.delete(item.id);
        succeed(t('checklist.deleted'));
        return true;
      } catch (cause) {
        fail(cause);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [fail, succeed, t],
  );

  const move = useCallback(
    async (item: ChecklistItem, direction: -1 | 1, visibleIds: string[]): Promise<void> => {
      setBusyId(item.id);
      try {
        const updates = moveRows(state.checklistItems, item, direction, visibleIds);
        if (updates.length > 0) await getDb().checklistItems.bulkPut(updates);
        setStatus(t('checklist.moved', { title: item.title }));
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, state.checklistItems, t],
  );

  const archiveCompleted = useCallback(
    async (certId: string | null): Promise<void> => {
      setBusyId('archive');
      try {
        const targets = state.checklistItems.filter(
          (item) => !item.archived && item.done && (certId === null || item.certId === certId),
        );
        if (targets.length === 0) {
          notify(t('checklist.archivedNone'), 'neutral');
          return;
        }
        await getDb().checklistItems.bulkPut(
          targets.map((item) => ({ ...item, archived: true })),
        );
        succeed(t('checklist.archivedDone', { count: targets.length }));
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, notify, state.checklistItems, succeed, t],
  );

  const unarchive = useCallback(
    async (item: ChecklistItem): Promise<void> => {
      setBusyId(item.id);
      try {
        await getDb().checklistItems.put({ ...item, archived: false });
        succeed(t('checklist.unarchived'));
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, succeed, t],
  );

  const restore = useCallback(
    async (cert: Certification): Promise<void> => {
      setBusyId(`restore-${cert.id}`);
      try {
        const rows = restoreTemplateRows(
          cert,
          state.checklistItems.filter((item) => item.certId === cert.id),
          new Date(),
        );
        if (rows.length === 0) {
          notify(t('checklist.restore.none'), 'neutral');
          return;
        }
        await getDb().checklistItems.bulkPut(rows);
        succeed(t('checklist.restore.done', { count: rows.length }));
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, notify, state.checklistItems, succeed, t],
  );

  const duplicate = useCallback(
    async (source: Certification, target: Certification): Promise<boolean> => {
      setBusyId(`duplicate-${source.id}`);
      try {
        const rows = duplicateTemplateRows(
          source,
          target,
          state.checklistItems.filter((item) => item.certId === target.id),
          new Date(),
        );
        if (rows.length === 0) {
          notify(t('checklist.duplicate.none', { cert: target.code }), 'neutral');
          return false;
        }
        await getDb().checklistItems.bulkPut(rows);
        succeed(t('checklist.duplicate.done', { count: rows.length, cert: target.code }));
        return true;
      } catch (cause) {
        fail(cause);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [fail, notify, state.checklistItems, succeed, t],
  );

  return {
    toggle,
    create,
    update,
    remove,
    move,
    archiveCompleted,
    unarchive,
    restore,
    duplicate,
    status,
    busyId,
  };
}
