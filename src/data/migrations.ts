import type { ChecklistItem } from './types';

/** Forma de la tabla `tasks` de la versión anterior de la app. */
export interface LegacyTask {
  id?: number;
  title: string;
  done?: boolean;
  createdAt?: string;
  dueDate?: string | null;
  certId?: string | null;
  notes?: string;
}

/**
 * Convierte las tareas de la versión anterior en ítems de checklist del grupo `personal`.
 * Función pura: entra un array, sale un array. Nunca borra ni transforma datos del usuario.
 */
export function convertLegacyTasks(tasks: LegacyTask[], nowIso: string): ChecklistItem[] {
  return tasks.map((task, index) => ({
    id: `chk-legacy-${task.id ?? index}`,
    certId: task.certId ?? 'GENERAL',
    topicId: null,
    groupId: 'personal',
    title: task.title,
    done: Boolean(task.done),
    doneAt: task.done ? nowIso : null,
    dueDate: task.dueDate ?? null,
    order: index,
    recurrence: 'ninguna',
    templateKey: null,
    createdAt: task.createdAt ?? nowIso,
  }));
}
