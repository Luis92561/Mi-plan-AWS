import { describe, expect, it, beforeAll } from 'vitest';
import { getDb } from '../db';
import { DEFAULT_EXPORT_PROFILES, ensureCatalog, loadDemoData } from '../seed';
import {
  buildBackupText,
  importBackup,
  parseBackupFile,
  readAppState,
} from '../backup';
import type { AppState, Note } from '../types';

/**
 * Round-trip exportar → importar (§11.1): lo que sale de `buildBackupText`
 * debe volver a la base idéntico, en ambos modos, y un archivo corrupto o con
 * forma inválida debe rechazarse sin escribir nada.
 */
const NOW = new Date('2026-10-18T15:00:00.000Z');

let original: AppState;
let backupText: string;

beforeAll(async () => {
  const db = getDb();
  await ensureCatalog(db);
  await db.exportProfiles.bulkPut(DEFAULT_EXPORT_PROFILES);
  await loadDemoData(db, NOW);
  original = await readAppState();
  backupText = buildBackupText(original, NOW);
  expect(original.notes.length).toBeGreaterThan(0);
  expect(original.studySessions.length).toBeGreaterThan(0);
  expect(original.settings).toBeTruthy();
});

function parseOrThrow(text: string): NonNullable<ReturnType<typeof parseBackupFile>['data']> {
  const parsed = parseBackupFile(text);
  if (!parsed.ok || !parsed.data) throw new Error(parsed.error ?? 'parse fallido');
  return parsed.data;
}

describe('round-trip del respaldo', () => {
  it('reemplazar: tras ensuciar la base, importar deja exactamente el estado exportado', async () => {
    const data = parseOrThrow(backupText);
    const db = getDb();

    // Basura deliberada que el modo reemplazar debe eliminar.
    await db.notes.clear();
    await db.studySessions.clear();
    await db.settings.clear();
    const junk: Note = {
      id: 'nota-basura',
      certId: null,
      domainId: null,
      topicId: null,
      title: 'No debería sobrevivir',
      bodyMd: '',
      tags: [],
      pinned: false,
      source: 'manual',
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    await db.notes.put(junk);

    const outcome = await importBackup(data, 'replace');
    expect(outcome.ok).toBe(true);
    expect(outcome.imported).toBeGreaterThan(0);

    const restored = await readAppState();
    expect(restored).toEqual(original);
    expect(restored.notes.some((note) => note.id === 'nota-basura')).toBe(false);
  });

  it('fusionar: gana el archivo por id y conserva las filas locales extra', async () => {
    const data = parseOrThrow(backupText);
    const db = getDb();

    const target = original.notes[0] as Note;
    await db.notes.put({ ...target, title: 'Editada en local, el archivo debe ganar' });
    const localOnly: Note = {
      id: 'nota-local-fusion',
      certId: null,
      domainId: null,
      topicId: null,
      title: 'Nota creada en local',
      bodyMd: 'se conserva al fusionar',
      tags: ['local'],
      pinned: false,
      source: 'manual',
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    await db.notes.put(localOnly);

    const outcome = await importBackup(data, 'merge');
    expect(outcome.ok).toBe(true);

    const state = await readAppState();
    expect(state.notes.find((note) => note.id === target.id)?.title).toBe(target.title);
    expect(state.notes.find((note) => note.id === localOnly.id)).toEqual(localOnly);
    expect(state.studySessions).toEqual(original.studySessions);
    expect(state.certifications).toEqual(original.certifications);
    expect(state.settings).toEqual(original.settings);

    // Deja la base como el archivo para el resto de la suite.
    await importBackup(data, 'replace');
  });

  it('rechaza un archivo que no es JSON válido', () => {
    const result = parseBackupFile('{esto no es json');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('El archivo no es JSON válido');
    expect(result.data).toBeUndefined();
  });

  it('rechaza un JSON con forma de respaldo inválida', () => {
    const wrongShape = JSON.stringify({ app: 'otra-app', schemaVersion: 3 });
    const result = parseBackupFile(wrongShape);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/^Esquema inválido en «/);
    expect(result.data).toBeUndefined();
  });

  it('el texto exportado trae conteos coherentes con el estado', () => {
    const parsed = parseBackupFile(backupText);
    expect(parsed.ok).toBe(true);
    expect(parsed.counts?.studySessions).toBe(original.studySessions.length);
    expect(parsed.counts?.notes).toBe(original.notes.length);
    expect(parsed.counts?.certifications).toBe(original.certifications.length);
  });
});
