import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { MiPlanDb, SCHEMA_V1 } from '../db';
import { convertLegacyTasks } from '../migrations';

describe('convertLegacyTasks', () => {
  it('convierte cada tarea en un ítem de checklist del grupo personal', () => {
    const items = convertLegacyTasks(
      [
        { id: 1, title: 'Repasar VPC', done: true, dueDate: '2026-10-20' },
        { id: 2, title: 'Ver clase de S3' },
      ],
      '2026-10-18T15:00:00.000Z',
    );
    expect(items).toHaveLength(2);
    expect(items[0].groupId).toBe('personal');
    expect(items[0].done).toBe(true);
    expect(items[0].doneAt).toBe('2026-10-18T15:00:00.000Z');
    expect(items[1].done).toBe(false);
    expect(items[1].doneAt).toBeNull();
    expect(items[1].certId).toBe('GENERAL');
    expect(items.map((i) => i.order)).toEqual([0, 1]);
    expect(items.every((i) => i.recurrence === 'ninguna')).toBe(true);
  });

  it('sin tareas devuelve un array vacío', () => {
    expect(convertLegacyTasks([], '2026-10-18T15:00:00.000Z')).toEqual([]);
  });
});

describe('migración Dexie 1 → 2', () => {
  it('mueve las tareas heredadas a checklistItems y no pierde datos del usuario', async () => {
    const name = `migration-test-${Date.now()}`;

    // Base "vieja" en v1 con tareas del usuario.
    const legacy = new Dexie(name);
    legacy.version(1).stores(SCHEMA_V1);
    await legacy.table('tasks').bulkAdd([
      { title: 'Repasar VPC endpoints', done: true, dueDate: '2026-10-20' },
      { title: 'Leer guía SAA-C03' },
    ]);
    await legacy.table('notes').put({
      id: 'n1',
      certId: null,
      domainId: null,
      topicId: null,
      title: 'Nota previa',
      bodyMd: 'contenido',
      tags: [],
      pinned: false,
      source: 'manual',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    });
    legacy.close();

    // Abrir con el esquema v2 dispara la migración.
    const db = new MiPlanDb(name);
    const checklist = await db.checklistItems.toArray();
    const notes = await db.notes.toArray();

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('Nota previa');
    expect(checklist).toHaveLength(2);
    expect(checklist.map((item) => item.title)).toEqual(
      expect.arrayContaining(['Repasar VPC endpoints', 'Leer guía SAA-C03']),
    );
    expect(checklist.every((item) => item.groupId === 'personal')).toBe(true);
    expect(checklist.some((item) => item.done)).toBe(true);

    await db.delete();
  });

  it('no crea ítems cuando la base heredada no tiene tareas', async () => {
    const name = `migration-empty-${Date.now()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores(SCHEMA_V1);
    await legacy.open();
    legacy.close();

    const db = new MiPlanDb(name);
    expect(await db.checklistItems.count()).toBe(0);
    await db.delete();
  });
});
