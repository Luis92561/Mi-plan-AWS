import { buildChecklistForCert } from '@/data/seed';
import { newId } from '@/data/store';
import type {
  Certification,
  ChecklistGroup,
  ChecklistItem,
  PlanItem,
  Recurrence,
} from '@/data/types';

/** Filtros de la vista global del checklist (§7.10). */
export interface ChecklistFilters {
  certId: string | null;
  groupId: ChecklistGroup | null;
  overdueOnly: boolean;
  pendingOnly: boolean;
  showArchived: boolean;
}

export const EMPTY_FILTERS: ChecklistFilters = {
  certId: null,
  groupId: null,
  overdueOnly: false,
  pendingOnly: false,
  showArchived: false,
};

/** Los tres grupos fijos de §7.10 más el grupo propio. */
export const GROUPS: ChecklistGroup[] = ['preparacion', 'practica', 'examen', 'personal'];

export const RECURRENCES: Recurrence[] = ['ninguna', 'diaria', 'semanal', 'mensual'];

export function isFiltering(filters: ChecklistFilters): boolean {
  return (
    filters.certId !== null ||
    filters.groupId !== null ||
    filters.overdueOnly ||
    filters.pendingOnly ||
    filters.showArchived
  );
}

/** §7.10 — vencido = pendiente, con fecha y anterior a hoy. */
export function isOverdue(item: ChecklistItem, today: string): boolean {
  return !item.done && item.dueDate !== null && item.dueDate < today;
}

/** Orden estable: `order` y, a igualdad, el más antiguo primero. */
export function compareRows(a: ChecklistItem, b: ChecklistItem): number {
  if (a.order !== b.order) return a.order - b.order;
  return a.createdAt.localeCompare(b.createdAt);
}

export function filterItems(
  items: ChecklistItem[],
  filters: ChecklistFilters,
  today: string,
): ChecklistItem[] {
  return items.filter((item) => {
    if (!filters.showArchived && item.archived) return false;
    if (filters.certId !== null && item.certId !== filters.certId) return false;
    if (filters.groupId !== null && item.groupId !== filters.groupId) return false;
    if (filters.overdueOnly && !isOverdue(item, today)) return false;
    if (filters.pendingOnly && item.done) return false;
    return true;
  });
}

/** Certificaciones con ítems, en el orden del plan (y por código si no está planeada). */
export function certificationsWithItems(
  certifications: Certification[],
  planItems: PlanItem[],
  items: ChecklistItem[],
): Certification[] {
  const withItems = new Set(items.map((item) => item.certId));
  const plannedOrder = new Map(planItems.map((planItem) => [planItem.certId, planItem.order]));
  return certifications
    .filter((cert) => withItems.has(cert.id))
    .sort((a, b) => {
      const orderA = plannedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = plannedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.code.localeCompare(b.code);
    });
}

/** Siguiente `order` libre dentro de una certificación. */
export function nextOrder(items: ChecklistItem[], certId: string): number {
  return items.filter((item) => item.certId === certId).reduce((max, item) => Math.max(max, item.order), 0) + 1;
}

/**
 * §7.10 — reordenar dentro del mismo grupo con ↑/↓. Se intercambia `order` con
 * el vecino **visible** (la vista puede estar filtrada), así que el movimiento
 * siempre se nota aunque haya filas ocultas. Si los órdenes vienen duplicados
 * (datos importados) se normaliza el grupo entero. Devuelve solo las filas que
 * cambian, listas para `bulkPut`.
 */
export function moveRows(
  all: ChecklistItem[],
  item: ChecklistItem,
  direction: -1 | 1,
  visibleIds: string[],
): ChecklistItem[] {
  const siblings = all
    .filter((row) => row.certId === item.certId && row.groupId === item.groupId && !row.archived)
    .sort(compareRows);
  const visible = siblings.filter((row) => visibleIds.includes(row.id));
  const index = visible.findIndex((row) => row.id === item.id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= visible.length) return [];

  const neighbor = visible[target];
  if (item.order !== neighbor.order) {
    return [
      { ...item, order: neighbor.order },
      { ...neighbor, order: item.order },
    ];
  }

  const reordered = [...siblings];
  const from = reordered.findIndex((row) => row.id === item.id);
  const to = reordered.findIndex((row) => row.id === neighbor.id);
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);

  const base = siblings.reduce((min, row) => Math.min(min, row.order), siblings[0].order);
  const updates: ChecklistItem[] = [];
  reordered.forEach((row, position) => {
    const order = base + position;
    if (row.order !== order) updates.push({ ...row, order });
  });
  return updates;
}

/**
 * §7.10 — restaurar plantilla: `buildChecklistForCert` da la plantilla del nivel
 * y solo se añaden las claves que faltan (`templateKey`), así que nunca duplica
 * ni toca los ítems propios (`templateKey: null`).
 */
export function restoreTemplateRows(
  cert: Certification,
  existing: ChecklistItem[],
  now: Date,
): ChecklistItem[] {
  const present = new Set(
    existing.map((item) => item.templateKey).filter((key): key is string => key !== null),
  );
  let order = existing.reduce((max, item) => Math.max(max, item.order), 0);
  return buildChecklistForCert(cert, now)
    .filter((row) => !present.has(row.templateKey ?? ''))
    .map((row) => {
      order += 1;
      return { ...row, order, archived: false };
    });
}

/**
 * §7.10 — duplicar la plantilla de `source` en `target`. Se copia la plantilla
 * del nivel de `source`, con ids nuevos y sin repetir claves presentes en
 * `target`. Los ítems propios del destino no se tocan.
 */
export function duplicateTemplateRows(
  source: Certification,
  target: Certification,
  existingTarget: ChecklistItem[],
  now: Date,
): ChecklistItem[] {
  if (source.id === target.id) return [];
  const present = new Set(
    existingTarget.map((item) => item.templateKey).filter((key): key is string => key !== null),
  );
  const createdAt = now.toISOString();
  let order = existingTarget.reduce((max, item) => Math.max(max, item.order), 0);
  return buildChecklistForCert(source, now)
    .filter((row) => !present.has(row.templateKey ?? ''))
    .map((row) => {
      order += 1;
      return {
        ...row,
        id: newId('chk'),
        certId: target.id,
        order,
        createdAt,
        archived: false,
      };
    });
}
