import { describe, expect, it } from 'vitest';
import { checklistProgress, completeItem, groupChecklist, nextDueDate, pendingForToday } from '../checklist';
import type { ChecklistItem } from '@/data/types';

const NOW = new Date('2026-10-18T15:00:00.000Z');

function item(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: 'chk1',
    certId: 'SAA-C03',
    topicId: null,
    groupId: 'preparacion',
    title: 'Leer la guía oficial',
    done: false,
    doneAt: null,
    dueDate: null,
    order: 1,
    recurrence: 'ninguna',
    templateKey: 'guide',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('checklistProgress §8.9', () => {
  it('progreso = hechos / (hechos + pendientes)', () => {
    const progress = checklistProgress([item({ done: true }), item({ id: 'b' }), item({ id: 'c' })]);
    expect(progress).toEqual({ done: 1, pending: 2, total: 3, ratio: 1 / 3 });
  });

  it('excluye los archivados', () => {
    const progress = checklistProgress([
      item({ done: true }),
      item({ id: 'b', archived: true }),
      item({ id: 'c', done: true, archived: true }),
    ]);
    expect(progress).toEqual({ done: 1, pending: 0, total: 1, ratio: 1 });
  });

  it('sin ítems el ratio es 0', () => {
    expect(checklistProgress([]).ratio).toBe(0);
  });
});

describe('nextDueDate', () => {
  it('suma el periodo de la recurrencia', () => {
    expect(nextDueDate('2026-10-18', 'diaria')).toBe('2026-10-19');
    expect(nextDueDate('2026-10-18', 'semanal')).toBe('2026-10-25');
    expect(nextDueDate('2026-10-18', 'mensual')).toBe('2026-11-17');
    expect(nextDueDate('2026-10-18', 'ninguna')).toBeNull();
  });
});

describe('completeItem', () => {
  it('marca hecho con fecha', () => {
    const { updated, spawned } = completeItem(item(), [item()], NOW);
    expect(updated.done).toBe(true);
    expect(updated.doneAt).toBe(NOW.toISOString());
    expect(spawned).toBeNull();
  });

  it('un ítem semanal completado crea la instancia de la próxima semana', () => {
    const recurring = item({ recurrence: 'semanal', dueDate: '2026-10-13', title: 'Simulacro semanal' });
    const { updated, spawned } = completeItem(recurring, [recurring], NOW);
    expect(updated.done).toBe(true);
    expect(spawned).not.toBeNull();
    expect(spawned?.dueDate).toBe('2026-10-20');
    expect(spawned?.done).toBe(false);
    expect(spawned?.title).toBe('Simulacro semanal');
    expect(spawned?.templateKey).toBe('guide');
  });

  it('no duplica si ya existe una pendiente con el mismo título y fecha', () => {
    const recurring = item({ recurrence: 'semanal', dueDate: '2026-10-13', title: 'Simulacro semanal' });
    const existing = item({ id: 'next', done: false, dueDate: '2026-10-20', title: 'Simulacro semanal' });
    const { spawned } = completeItem(recurring, [recurring, existing], NOW);
    expect(spawned).toBeNull();
  });

  it('desmarcar limpia doneAt y no genera instancias', () => {
    const done = item({ done: true, doneAt: '2026-10-10T10:00:00.000Z', recurrence: 'diaria' });
    const { updated, spawned } = completeItem(done, [done], NOW);
    expect(updated.done).toBe(false);
    expect(updated.doneAt).toBeNull();
    expect(spawned).toBeNull();
  });
});

describe('pendingForToday', () => {
  it('incluye vencidos y sin fecha de las certificaciones activas', () => {
    const items = [
      item({ id: 'overdue', dueDate: '2026-10-01' }),
      item({ id: 'today', dueDate: '2026-10-18' }),
      item({ id: 'future', dueDate: '2026-11-01' }),
      item({ id: 'nodate', dueDate: null }),
      item({ id: 'other-cert', certId: 'CLF-C02', dueDate: '2026-10-01' }),
      item({ id: 'done', done: true, dueDate: '2026-10-01' }),
    ];
    expect(pendingForToday(items, '2026-10-18', ['SAA-C03']).map((i) => i.id)).toEqual([
      'overdue',
      'today',
      'nodate',
    ]);
  });
});

describe('groupChecklist', () => {
  it('agrupa en el orden fijo y omite grupos vacíos', () => {
    const groups = groupChecklist([
      item({ id: 'a', groupId: 'examen' }),
      item({ id: 'b', groupId: 'preparacion' }),
      item({ id: 'c', groupId: 'personal', archived: true }),
    ]);
    expect(groups.map((g) => g.groupId)).toEqual(['preparacion', 'examen']);
  });
});
