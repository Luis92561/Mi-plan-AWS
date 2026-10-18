import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';
import {
  buildVault,
  certFolderName,
  renderCalendarNote,
  renderCertNote,
  renderChecklistNote,
  renderNote,
  renderRouteNote,
  sanitizeFilename,
  type VaultFile,
} from '@/domain/obsidian';
import { createVaultState, makeVaultProfile, VAULT_NOW } from './vaultFixtures';

const CERT_SUMMARY =
  'AWS/SAA-C03 — Solutions Architect Associate/SAA-C03 — Resumen.md';
const DOMAIN_NOTE =
  'AWS/SAA-C03 — Solutions Architect Associate/Dominios/01 — Design Secure Architectures.md';
const TOPIC_NOTE =
  'AWS/SAA-C03 — Solutions Architect Associate/Temas/S3 — Clases de almacenamiento.md';

function contentAt(files: VaultFile[], path: string): string {
  const found = files.find((file) => file.path === path);
  if (!found) throw new Error(`No existe el archivo ${path}`);
  return found.content;
}

function stripUpdated(content: string): string {
  return content.replace(/^updated: .*$/m, 'updated: <variable>');
}

function vaultContent(files: VaultFile[]): string {
  return files.map((file) => file.content).join('\n');
}

describe('sanitizeFilename', () => {
  it('sustituye los caracteres prohibidos por guiones', () => {
    expect(sanitizeFilename('a\\b/c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('conserva acentos y emojis', () => {
    expect(sanitizeFilename('Programación 🚀 en español')).toBe('Programación 🚀 en español');
  });

  it('normaliza a NFC, colapsa espacios y quita separadores colgando', () => {
    expect(sanitizeFilename('e\u0301  doble')).toBe('é doble');
    expect(sanitizeFilename('— Nombre —')).toBe('Nombre');
    expect(sanitizeFilename('- guion -')).toBe('guion');
  });

  it('corta a 100 caracteres sin dejar separadores colgando ni romper emojis', () => {
    const long = sanitizeFilename(`${'x'.repeat(150)} — cola`);
    expect(Array.from(long)).toHaveLength(100);
    expect(long.endsWith(' ')).toBe(false);
    expect(long.endsWith('-')).toBe(false);

    const cut = sanitizeFilename(`${'x'.repeat(99)} — cola`);
    expect(Array.from(cut)).toHaveLength(99);
    expect(cut.endsWith(' ')).toBe(false);
    expect(cut.endsWith('—')).toBe(false);

    const emoji = sanitizeFilename(`${'a'.repeat(99)}🚀 cola`);
    expect(Array.from(emoji)).toHaveLength(100);
    expect(emoji.endsWith('🚀')).toBe(true);
  });

  it('usa un nombre de reserva si todo desaparece', () => {
    expect(sanitizeFilename('///')).toBe('Sin título');
  });
});

describe('certFolderName', () => {
  it('usa el nombre corto y el separador — con espacios', () => {
    const state = createVaultState();
    const saa = state.certifications.find((cert) => cert.id === 'SAA-C03');
    if (!saa) throw new Error('Falta SAA-C03 en el fixture');
    expect(certFolderName(saa)).toBe('SAA-C03 — Solutions Architect Associate');
  });
});

describe('buildVault', () => {
  it('genera el árbol de archivos del Anexo C.1', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(files.map((file) => file.path).sort()).toMatchSnapshot();
  });

  it('genera la nota de certificación completa', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(contentAt(files, CERT_SUMMARY)).toMatchSnapshot();
  });

  it('genera la nota de dominio completa', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(contentAt(files, DOMAIN_NOTE)).toMatchSnapshot();
  });

  it('genera la nota de tema completa', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(contentAt(files, TOPIC_NOTE)).toMatchSnapshot();
  });

  it('produce frontmatter parseable con gray-matter en todas las notas', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
    });
    for (const file of files) {
      expect(() => matter(file.content), file.path).not.toThrow();
    }
    const cert = matter(contentAt(files, CERT_SUMMARY)).data;
    expect(cert.title).toBe('SAA-C03 — Solutions Architect Associate');
    expect(cert.type).toBe('aws-certification');
    expect(cert.code).toBe('SAA-C03');
    expect(cert.level).toBe('associate');
    expect(cert.phase).toBe(2);
    expect(cert.status).toBe('estudiando');
    expect(typeof cert.readiness).toBe('number');
    expect(cert.price_usd).toBe(150);
    expect(cert.passing_score).toBe(720);
    expect(cert.domains).toEqual([
      'Design Secure Architectures',
      'Design Resilient Architectures',
      'Design High-Performing Architectures',
      'Design Cost-Optimized Architectures',
    ]);
    expect(cert.lang).toBe('es');
    expect(cert.source).toBe('Mi Plan AWS');
    expect(cert.schema).toBe(1);
    expect(cert.updated).toBeInstanceOf(Date);
    expect(cert.updated instanceof Date ? cert.updated.toISOString() : '').toContain('2026-10-18');
  });

  it('es idempotente: mismo estado y mismo now ⇒ mismo resultado', () => {
    const state = createVaultState();
    const profile = makeVaultProfile();
    const first = buildVault({ state, profile, locale: 'es', now: VAULT_NOW });
    const second = buildVault({ state, profile, locale: 'es', now: VAULT_NOW });
    expect(second).toEqual(first);
  });

  it('solo cambia `updated` entre dos exportaciones del mismo estado', () => {
    const state = createVaultState();
    const profile = makeVaultProfile();
    const first = buildVault({ state, profile, locale: 'es', now: VAULT_NOW });
    const later = new Date(VAULT_NOW.getTime() + 26 * 3_600_000);
    const second = buildVault({ state, profile, locale: 'es', now: later });
    expect(second.map((file) => file.path)).toEqual(first.map((file) => file.path));
    expect(second.map((file) => stripUpdated(file.content))).toEqual(
      first.map((file) => stripUpdated(file.content)),
    );
    expect(second.map((file) => file.content)).not.toEqual(first.map((file) => file.content));
  });

  it('mantiene la integridad de todos los wikilinks del export', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
    });
    const names = new Set(
      files.map((file) => {
        const segment = file.path.split('/').pop() ?? file.path;
        return (segment.endsWith('.md') ? segment.slice(0, -3) : segment).toLowerCase();
      }),
    );
    for (const file of files) {
      for (const match of file.content.matchAll(/!?\[\[([^\]]+?)\]\]/g)) {
        const raw = match[1];
        const target = (raw.split(/\\?\|/)[0] ?? '')
          .split('#')[0]
          .replace(/\\$/, '')
          .split('/')
          .pop()
          ?.trim();
        expect(target, `${file.path}: ${raw}`).toBeTruthy();
        expect(names.has((target ?? '').toLowerCase()), `${file.path}: ${raw}`).toBe(true);
      }
    }
  });

  it('escribe UTF-8 sin BOM, sin CRLF y con salto final', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
    });
    for (const file of files) {
      expect(file.content.startsWith('\uFEFF'), file.path).toBe(false);
      expect(file.content.includes('\r'), file.path).toBe(false);
      expect(file.content.endsWith('\n'), file.path).toBe(true);
    }
  });

  it('respeta includeChecklist / includeSessions / includeNotes', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile({
        includeChecklist: false,
        includeSessions: false,
        includeNotes: false,
      }),
      locale: 'es',
      now: VAULT_NOW,
    });
    const paths = files.map((file) => file.path);
    expect(paths.some((path) => path.endsWith('_Checklist.md'))).toBe(false);
    expect(paths.some((path) => path.includes('/Sesiones/'))).toBe(false);
    expect(paths.some((path) => path.endsWith(' — Checklist.md'))).toBe(false);
    const cert = contentAt(files, CERT_SUMMARY);
    expect(cert).not.toContain('## Checklist');
    expect(cert).not.toContain('## Notas');
    expect(cert).not.toContain('![[2026-10-18]]');
    expect(paths).toContain('AWS/_Calendario.md');
  });

  it('respeta vaultRoot y una carpeta de perfil vacía', () => {
    const state = createVaultState();
    const rooted = buildVault({
      state,
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
      vaultRoot: 'MiVault',
    });
    expect(rooted.every((file) => file.path.startsWith('MiVault/'))).toBe(true);

    const flat = buildVault({
      state,
      profile: makeVaultProfile({ folder: '' }),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(flat[0]?.path).toBe('_Ruta AWS.md');
  });

  it('maneja un estado sin certificaciones planeadas', () => {
    const state = { ...createVaultState(), planItems: [] };
    const files = buildVault({
      state,
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(files.map((file) => file.path)).toEqual([
      'AWS/_Ruta AWS.md',
      'AWS/_Checklist.md',
      'AWS/_Calendario.md',
    ]);
    expect(contentAt(files, 'AWS/_Ruta AWS.md')).toContain('# Ruta AWS');
  });

  it('omite el presupuesto de la ruta cuando includeBudget es false', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile({ includeBudget: false }),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(contentAt(files, 'AWS/_Ruta AWS.md')).not.toContain('## Presupuesto');
  });

  it('degrada todos los enlaces cuando includeWikilinks es false', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile({ includeWikilinks: false, dataviewBlocks: false }),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(vaultContent(files)).not.toContain('[[');
  });

  it('incluye 📅 solo con taskDates y Dataview al final solo con dataviewBlocks', () => {
    const withDates = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile(),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(contentAt(withDates, CERT_SUMMARY)).toContain('📅 2026-10-20');

    const noDates = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile({ taskDates: false }),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(contentAt(noDates, CERT_SUMMARY)).not.toContain('📅');

    const noDataview = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile({ dataviewBlocks: false }),
      locale: 'es',
      now: VAULT_NOW,
    });
    expect(contentAt(noDataview, CERT_SUMMARY)).not.toContain('dataview');

    const cert = contentAt(withDates, CERT_SUMMARY);
    expect(cert).toContain('> ````dataview');
    expect(cert.trimEnd().endsWith('> ````')).toBe(true);
  });

  it('omite el frontmatter cuando includeFrontmatter es false', () => {
    const files = buildVault({
      state: createVaultState(),
      profile: makeVaultProfile({ includeFrontmatter: false }),
      locale: 'es',
      now: VAULT_NOW,
    });
    for (const file of files) {
      expect(file.content.startsWith('---\n'), file.path).toBe(false);
    }
    expect(contentAt(files, CERT_SUMMARY).startsWith('# SAA-C03 — Solutions Architect Associate')).toBe(
      true,
    );
  });

  it('mantiene la misma estructura en ES y EN, con encabezados traducidos', () => {
    const state = createVaultState();
    const profile = makeVaultProfile();
    const es = buildVault({ state, profile, locale: 'es', now: VAULT_NOW });
    const en = buildVault({ state, profile, locale: 'en', now: VAULT_NOW });
    expect(en.map((file) => file.path)).toEqual(es.map((file) => file.path));

    const certEs = contentAt(es, CERT_SUMMARY);
    const certEn = contentAt(en, CERT_SUMMARY);
    expect(certEs).toContain('## Dominios');
    expect(certEn).toContain('## Domains');
    expect(certEn).not.toContain('## Dominios');
    expect(matter(certEn).data.status).toBe('estudiando');
    expect(matter(certEn).data.lang).toBe('en');
    expect(certEn).toContain('Design Secure Architectures');
  });
});

describe('renderNote', () => {
  it('emite YAML con comillas solo donde hacen falta y parsea sin errores', () => {
    const note = renderNote({
      frontmatter: {
        title: 'SAA-C03 — Solutions Architect Associate',
        aliases: ['SAA-C03', 'Solutions Architect Associate'],
        type: 'aws-certification',
        code: 'SAA-C03',
        readiness: 62,
        price_usd: null,
        exam_date: '2026-12-05',
        domains: ['Design Secure Architectures'],
        tags: ['aws', 'aws/associate', 'cert/SAA-C03'],
        lang: 'es',
        updated: '2026-10-18T18:32:00-05:00',
        source: 'Mi Plan AWS',
        schema: 1,
      },
      body: '# SAA-C03 — Solutions Architect Associate\n\nTexto.',
    });
    const parsed = matter(note);
    expect(parsed.data.title).toBe('SAA-C03 — Solutions Architect Associate');
    expect(parsed.data.source).toBe('Mi Plan AWS');
    expect(parsed.data.updated).toBeInstanceOf(Date);
    expect(parsed.data.domains).toEqual(['Design Secure Architectures']);
    expect(parsed.content.trim()).toContain('# SAA-C03');
    expect(note).not.toContain('\r');
    expect(note.endsWith('\n')).toBe(true);
  });
});

describe('API de notas sueltas', () => {
  it('renderCertNote coincide con la nota resumen del vault', () => {
    const state = createVaultState();
    const profile = makeVaultProfile({ includeSessions: false, dataviewBlocks: false });
    const vault = buildVault({ state, profile, locale: 'es', now: VAULT_NOW });
    expect(renderCertNote(state, 'SAA-C03', 'es', VAULT_NOW)).toBe(
      contentAt(vault, CERT_SUMMARY),
    );
  });

  it('renderRouteNote, renderChecklistNote y renderCalendarNote generan Markdown válido', () => {
    const state = createVaultState();
    const route = renderRouteNote(state, 'es', VAULT_NOW);
    expect(route).toContain('# Ruta AWS');
    expect(route).toContain('| 3 | [[SAA-C03 — Resumen\\|SAA-C03]] |');
    expect(route).toContain('## Lectura opcional');
    expect(route).toContain('> ````dataview');
    expect(route.trimEnd().endsWith('> ````')).toBe(true);
    expect(route).not.toContain('\r');

    const checklist = renderChecklistNote(state, 'es', VAULT_NOW);
    expect(checklist).toContain('# Checklist');
    expect(checklist).toContain('## Recurrentes');
    expect(checklist).toContain('- [ ] Simulacro semanal 📅 2026-10-20');

    const calendar = renderCalendarNote(state, 'es', VAULT_NOW);
    expect(calendar).toContain('# Calendario');
    expect(calendar).toContain('2026-10-21 · [[S3 — Clases de almacenamiento]]');
    expect(calendar).toContain('2026-12-05 · **Examen SAA-C03**');
  });

  it('funciona aunque la certificación no esté en el plan', () => {
    const state = createVaultState();
    const withoutPlan = { ...state, planItems: state.planItems.filter((item) => item.certId !== 'CLF-C02') };
    const note = renderCertNote(withoutPlan, 'CLF-C02', 'es', VAULT_NOW);
    expect(note).toContain('# CLF-C02 — Cloud Practitioner');
    expect(note).toContain('status: no_iniciado');
  });

  it('lanza un error si la certificación no existe', () => {
    const state = createVaultState();
    expect(() => renderCertNote(state, 'NO-EXISTE', 'es', VAULT_NOW)).toThrow(
      /Certificación no encontrada/,
    );
  });
});
