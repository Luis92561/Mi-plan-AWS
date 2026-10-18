import type { AppState, Locale, Note } from '@/data/types';
import { renderCertNote } from '@/domain/obsidian';

/**
 * «Copiar nota» (§7.12): el Markdown de la nota, sin frontmatter.
 * Lo que la persona escribió se copia tal cual: sin envoltorios ni cabeceras
 * añadidas por la app.
 */
export function noteMarkdown(note: Note): string {
  return note.bodyMd;
}

export interface ObsidianCopy {
  text: string;
  /** `true` si se copió la nota de certificación completa (frontmatter + wikilinks). */
  usedCert: boolean;
}

/**
 * «Copiar para Obsidian» (§7.12): la nota de certificación completa, con
 * frontmatter y wikilinks, cuando la nota está ligada a una certificación que
 * existe en el plan. Si no hay certificación —o el render falla— se degrada al
 * Markdown de la nota para no dejar a la persona sin nada en el portapapeles.
 */
export function obsidianMarkdown(state: AppState, note: Note, locale: Locale, now: Date): ObsidianCopy {
  const certId = note.certId;
  if (!certId || !state.certifications.some((cert) => cert.id === certId)) {
    return { text: noteMarkdown(note), usedCert: false };
  }
  try {
    const text = renderCertNote(state, certId, locale, now);
    if (text.trim().length === 0) return { text: noteMarkdown(note), usedCert: false };
    return { text, usedCert: true };
  } catch {
    // Una certificación sin datos suficientes no debe romper el botón.
    return { text: noteMarkdown(note), usedCert: false };
  }
}
