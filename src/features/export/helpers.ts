import type { AppState, Certification, ExportProfile } from '@/data/types';
import type { TKey } from '@/lib/i18n/shape';

/**
 * Auxiliares de la pantalla `/exportar` (§7.12): perfil de reserva, catálogo de
 * banderas del perfil y utilidades compartidas por las secciones.
 */

/** Texto de un error desconocido, sin `any` y sin `console`. */
export function messageOf(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  return String(cause);
}

/** Banderas de contenido de un perfil, en el orden en que se muestran. */
export type ProfileFlagKey =
  | 'includeFrontmatter'
  | 'includeWikilinks'
  | 'includeNotes'
  | 'includeSessions'
  | 'includeBudget'
  | 'includeChecklist'
  | 'dataviewBlocks'
  | 'taskDates';

export interface ProfileFlag {
  key: ProfileFlagKey;
  labelKey: TKey;
}

export const PROFILE_FLAGS: ProfileFlag[] = [
  { key: 'includeFrontmatter', labelKey: 'exporter.field.frontmatter' },
  { key: 'includeWikilinks', labelKey: 'exporter.field.wikilinks' },
  { key: 'includeNotes', labelKey: 'exporter.field.notes' },
  { key: 'includeSessions', labelKey: 'exporter.field.sessions' },
  { key: 'includeBudget', labelKey: 'exporter.field.budget' },
  { key: 'includeChecklist', labelKey: 'exporter.field.checklist' },
  { key: 'dataviewBlocks', labelKey: 'exporter.field.dataview' },
  { key: 'taskDates', labelKey: 'exporter.field.taskDates' },
];

/** Datos editables de un perfil: todo menos `id` y `createdAt`. */
export type ProfileDraft = Omit<ExportProfile, 'id' | 'createdAt'>;

export const blankDraft: ProfileDraft = {
  name: '',
  folder: 'AWS',
  includeFrontmatter: true,
  includeWikilinks: true,
  includeNotes: true,
  includeSessions: true,
  includeBudget: true,
  includeChecklist: true,
  dataviewBlocks: false,
  taskDates: true,
};

/**
 * Perfil que se usa cuando la base todavía no tiene ninguno (primer arranque sin
 * catálogo). Coincide con el perfil sembrado por `DEFAULT_EXPORT_PROFILES`.
 */
export const FALLBACK_PROFILE: ExportProfile = {
  id: 'perfil-temporal',
  createdAt: '2000-01-01T00:00:00.000Z',
  ...blankDraft,
  dataviewBlocks: true,
};

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Certificaciones que se pueden copiar: primero las de la ruta (en su orden, sin
 * duplicados) y, si la ruta está vacía, el catálogo completo por código.
 */
export function copyableCerts(state: AppState): Certification[] {
  const byId = new Map(state.certifications.map((cert) => [cert.id, cert]));
  const planned: Certification[] = [];
  const seen = new Set<string>();
  for (const item of [...state.planItems].sort((a, b) =>
    a.order !== b.order ? a.order - b.order : compareText(a.id, b.id),
  )) {
    if (seen.has(item.certId)) continue;
    const cert = byId.get(item.certId);
    if (!cert) continue;
    seen.add(item.certId);
    planned.push(cert);
  }
  if (planned.length > 0) return planned;
  return [...state.certifications].sort((a, b) => compareText(a.code, b.code) || compareText(a.id, b.id));
}

export function profileComparer(a: ExportProfile, b: ExportProfile): number {
  return compareText(a.name, b.name) || compareText(a.id, b.id);
}
