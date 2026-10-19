import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getDb } from '@/data/db';
import { DEFAULT_EXPORT_PROFILES, ensureCatalog, loadDemoData } from '@/data/seed';
import { readAppState } from '@/data/backup';
import { buildVault, degradeLinks, resolveWikiTarget } from '@/domain/obsidian';
import type { VaultFile } from '@/domain/obsidian';

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

    // §8.9 sobre la muestra recortada: los wikilinks degradados por el export
    // completo apuntan a archivos que quedaron fuera de la muestra; se degradan
    // de nuevo contra el set efectivo para entregar el demo sin enlaces rotos.
    const available = new Set(
      sample.map((relative) => relative.split('/').pop()?.replace(/\.md$/i, '').toLowerCase() ?? ''),
    );
    const written: VaultFile[] = sample.flatMap((relative) => {
      const file = files.find((candidate) => candidate.path.replace(/^AWS\//, '') === relative);
      if (!file) return [];
      return [{ path: relative, content: degradeLinks(file.content, available, true) }];
    });

    for (const file of written) {
      const target = join(ROOT, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content, 'utf8');
    }

    // Integridad: ningún wikilink de la muestra puede quedar sin destino.
    const broken: string[] = [];
    for (const file of written) {
      for (const match of file.content.matchAll(/(!?)\[\[([^\]]+?)\]\]/g)) {
        const raw = match[2] ?? '';
        const pipe = raw.indexOf('\\|') >= 0 ? raw.indexOf('\\|') : raw.indexOf('|');
        const rawTarget = pipe >= 0 ? raw.slice(0, pipe) : raw;
        const target = resolveWikiTarget(rawTarget);
        if (target.length === 0 || !available.has(target.toLowerCase())) {
          broken.push(`${file.path} → [[${raw}]]`);
        }
      }
    }
    expect(broken).toEqual([]);
  }, 60_000);
});
