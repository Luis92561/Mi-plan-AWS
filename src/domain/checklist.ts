import type { ChecklistItem } from '@/data/types';
import { addDaysToDate } from '@/lib/dates';

export interface ChecklistProgress {
  done: number;
  pending: number;
  total: number;
  /** hechos / (hechos + pendientes) — 0 si no hay ítems */
  ratio: number;
}

/** §8.9 — Progreso del checklist: hechos / (hechos + pendientes). Excluye archivados. */
export function checklistProgress(items: ChecklistItem[]): ChecklistProgress {
  const live = items.filter((item) => !item.archived);
  const done = live.filter((item) => item.done).length;
  const pending = live.length - done;
  return { done, pending, total: live.length, ratio: live.length > 0 ? done / live.length : 0 };
}

export function nextDueDate(date: string, recurrence: ChecklistItem['recurrence']): string | null {
  switch (recurrence) {
    case 'diaria':
      return addDaysToDate(date, 1);
    case 'semanal':
      return addDaysToDate(date, 7);
    case 'mensual':
      return addDaysToDate(date, 30);
    default:
      return null;
  }
}

export interface CompleteResult {
  updated: ChecklistItem;
  /** Siguiente instancia si el ítem es recurrente y no existe ya una pendiente igual. */
  spawned: ChecklistItem | null;
}

/**
 * §8.9 — Completar un ítem. Si es recurrente, crea la siguiente instancia con
 * `dueDate + periodo`, salvo que ya exista una pendiente con el mismo `title` y `dueDate`.
 */
export function completeItem(item: ChecklistItem, all: ChecklistItem[], now: Date): CompleteResult {
  const doneAt = now.toISOString();
  if (!item.done) {
    const updated: ChecklistItem = { ...item, done: true, doneAt };
    let spawned: ChecklistItem | null = null;
    if (item.recurrence !== 'ninguna') {
      const base = item.dueDate ?? doneAt.slice(0, 10);
      const dueDate = nextDueDate(base, item.recurrence);
      const duplicate = all.some(
        (other) =>
          other.id !== item.id &&
          other.title === item.title &&
          other.certId === item.certId &&
          !other.done &&
          other.dueDate === dueDate,
      );
      if (dueDate && !duplicate) {
        spawned = {
          ...item,
          id: `${item.id}-r${doneAt.slice(0, 10)}`,
          done: false,
          doneAt: null,
          dueDate,
          createdAt: doneAt,
          archived: false,
        };
      }
    }
    return { updated, spawned };
  }
  return { updated: { ...item, done: false, doneAt: null }, spawned: null };
}

/** Ítems pendientes de hoy: vencidos o sin fecha. */
export function pendingForToday(items: ChecklistItem[], today: string, certIds: string[]): ChecklistItem[] {
  return items
    .filter(
      (item) =>
        !item.done &&
        !item.archived &&
        certIds.includes(item.certId) &&
        (item.dueDate === null || item.dueDate <= today),
    )
    .sort((a, b) => {
      if (a.dueDate === null && b.dueDate !== null) return 1;
      if (a.dueDate !== null && b.dueDate === null) return -1;
      if (a.dueDate !== b.dueDate) return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
      return a.order - b.order;
    });
}

/** Agrupa por el grupo fijo del checklist (§7.10). */
export function groupChecklist(
  items: ChecklistItem[],
): { groupId: ChecklistItem['groupId']; items: ChecklistItem[] }[] {
  const order: ChecklistItem['groupId'][] = ['preparacion', 'practica', 'examen', 'personal'];
  return order
    .map((groupId) => ({
      groupId,
      items: items.filter((item) => item.groupId === groupId && !item.archived).sort((a, b) => a.order - b.order),
    }))
    .filter((group) => group.items.length > 0);
}
