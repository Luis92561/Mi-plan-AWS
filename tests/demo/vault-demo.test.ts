import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getDb } from '@/data/db';
import { DEFAULT_EXPORT_PROFILES, ensureCatalog, loadDemoData } from '@/data/seed';
import { readAppState } from '@/data/backup';
import { buildVault } from '@/domain/obsidian';

/**
 * Genera `examples/vault-demo/`: un vault real ya exportado (Anexo C) para abrir
 * en Obsidian sin generar nada (§12.3). Se regenera con `npm run vault:demo`.
 * Se guarda una muestra legible: las tres notas raíz y la carpeta de SAA-C03
 * recortada a lo esencial.
 */
const ROOT = join(process.cwd(), 'examples', 'vault-demo');
const NOW = new Date('2026-10-18T15:00:00.000Z');
const CERT_FOLDER = 'SAA-C03 — Solutions Architect Associate/';

function pickSample(files: { path: string }[]): string[] {
  const chosen: string[] = [];
  const budgets: Record<string, number> = {
    Dominios: 2,
    Temas: 2,
    Sesiones: 2,
    Simulacros: 1,
  };
  for (const file of files) {
    const path = file.path.replace(/^AWS\//, '');
    if (path.startsWith('_')) {
      chosen.push(path);
      continue;
    }
    if (!path.startsWith(CERT_FOLDER)) continue;
    const rest = path.slice(CERT_FOLDER.length);
    if (!rest.includes('/')) {
      chosen.push(path); // Resumen y Checklist de la certificación
      continue;
    }
    const bucket = rest.split('/')[0] as keyof typeof budgets;
    if (!(bucket in budgets)) continue;
    if (budgets[bucket] > 0) {
      budgets[bucket] -= 1;
      chosen.push(path);
    }
  }
  return chosen;
}

describe('vault de ejemplo', () => {
  it('escribe examples/vault-demo con los archivos del Anexo C', async () => {
    const db = getDb();
    await ensureCatalog(db);
    await db.exportProfiles.bulkPut(DEFAULT_EXPORT_PROFILES);
    await loadDemoData(db, NOW);

    const state = await readAppState();
    const profile = state.exportProfiles[0] ?? { ...DEFAULT_EXPORT_PROFILES[0] };
    const files = buildVault({ state, profile, locale: 'es', now: NOW });
    const sample = pickSample(files);

    expect(sample.length).toBeGreaterThanOrEqual(6);
    expect(sample).toContain('_Ruta AWS.md');
    expect(sample).toContain(`${CERT_FOLDER}SAA-C03 — Resumen.md`);

    for (const relative of sample) {
      const file = files.find((candidate) => candidate.path.replace(/^AWS\//, '') === relative);
      if (!file) continue;
      const target = join(ROOT, relative);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content, 'utf8');
    }
  }, 60_000);
});
