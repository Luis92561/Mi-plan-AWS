import type { Note } from '@/data/types';
import type { TKey } from '@/lib/i18n/shape';
import { localDate } from '@/lib/dates';

/* =============================================================================
   Modelo puro de Notas (§7.11). Sin React ni Dexie: todo lo de este archivo se
   puede razonar (y probar) sin navegador.
   ========================================================================== */

/** Campos editables de una nota. `id`, `source`, `createdAt` no se tocan aquí. */
export interface NoteDraft {
  title: string;
  bodyMd: string;
  certId: string | null;
  domainId: string | null;
  topicId: string | null;
  tags: string[];
  pinned: boolean;
}

export function draftOf(note: Note): NoteDraft {
  return {
    title: note.title,
    bodyMd: note.bodyMd,
    certId: note.certId,
    domainId: note.domainId,
    topicId: note.topicId,
    tags: [...note.tags],
    pinned: note.pinned,
  };
}

export function emptyDraft(patch: Partial<NoteDraft> = {}): NoteDraft {
  return {
    title: '',
    bodyMd: '',
    certId: null,
    domainId: null,
    topicId: null,
    tags: [],
    pinned: false,
    ...patch,
  };
}

/* ------------------------------------------------------------------ etiquetas */

/**
 * Etiquetas escritas a mano: separadas por comas o espacios, sin `#`, sin
 * duplicados (comparando sin distinguir mayúsculas) y sin vacías.
 */
export function tagsFromInput(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of raw.split(/[,\n]+/)) {
    for (const piece of chunk.split(/\s+/)) {
      const tag = piece.replace(/^#+/, '').trim();
      if (tag.length === 0) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}

export function tagsToInput(tags: string[]): string {
  return tags.join(', ');
}

/* ------------------------------------------------------------- búsqueda local */

/** Minúsculas y sin diacríticos: «Dominios» y «dominios» caen en el mismo saco. */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function queryTerms(query: string): string[] {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  return [...new Set(terms)];
}

/** Índice en memoria: título + cuerpo + etiquetas de cada nota. */
export function buildNoteIndex(notes: Note[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const note of notes) {
    index.set(note.id, normalizeSearch(`${note.title}\n${note.bodyMd}\n${note.tags.join(' ')}`));
  }
  return index;
}

/** Todas las palabras deben aparecer (AND): busca poco a poco, nunca a ciegas. */
export function matchesAllTerms(haystack: string, terms: string[]): boolean {
  return terms.every((term) => haystack.includes(normalizeSearch(term)));
}

export interface HighlightPart {
  text: string;
  hit: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parte un texto en trozos marcados/no marcados para resaltar el término.
 * El resaltado compara el texto tal cual (con acentos): si se buscó «region» y
 * la nota dice «región», la nota se encuentra igual, solo que no se subraya.
 */
export function highlightParts(text: string, terms: string[]): HighlightPart[] {
  const clean = terms
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .sort((a, b) => b.length - a.length);
  if (clean.length === 0 || text.length === 0) return [{ text, hit: false }];

  const pattern = new RegExp(`(${clean.map(escapeRegExp).join('|')})`, 'gi');
  const hits = new Set(clean.map((term) => term.toLowerCase()));
  return text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, hit: hits.has(part.toLowerCase()) }));
}

/** Primera línea útil del cuerpo, sin marcas de Markdown, para la lista. */
export function excerpt(bodyMd: string, max = 150): string {
  const plain = bodyMd
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

/** Día del producto (America/Bogota) a partir de un ISO; el original si no parsea. */
export function productDay(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : localDate(parsed);
}

/** Fijadas primero; después la más reciente. Orden estable por id. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/* ------------------------------------------------------------------ formato */

export const MARKDOWN_FORMATS = ['bold', 'code', 'list', 'checklist', 'link', 'heading2'] as const;

export type MarkdownFormat = (typeof MARKDOWN_FORMATS)[number];

export interface FormatResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

const WRAPPERS: Record<'bold' | 'code', readonly [string, string]> = {
  bold: ['**', '**'],
  code: ['`', '`'],
};

const PREFIXES: Record<'list' | 'checklist' | 'heading2', string> = {
  list: '- ',
  checklist: '- [ ] ',
  heading2: '## ',
};

function wrapSelection(value: string, start: number, end: number, before: string, after: string): FormatResult {
  const selected = value.slice(start, end);
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  return {
    value: next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
}

function linkSelection(value: string, start: number, end: number): FormatResult {
  const selected = value.slice(start, end);
  const next = `${value.slice(0, start)}[${selected}]()${value.slice(end)}`;
  const caret = start + selected.length + 3;
  return { value: next, selectionStart: caret, selectionEnd: caret };
}

function prefixLines(value: string, start: number, end: number, prefix: string): FormatResult {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const blockEnd = end > lineStart && value[end - 1] === '\n' ? end - 1 : end;
  const lines = value.slice(lineStart, blockEnd).split('\n');
  const replaced = lines.map((line) => `${prefix}${line}`).join('\n');
  const next = `${value.slice(0, lineStart)}${replaced}${value.slice(blockEnd)}`;
  const blockStart = lineStart;
  const blockStop = lineStart + replaced.length;

  return {
    value: next,
    // Con selección, queda seleccionado el bloque formateado; sin selección,
    // el cursor va justo después de la marca insertada.
    selectionStart: start === end ? start + prefix.length : blockStart,
    selectionEnd: start === end ? start + prefix.length : blockStop,
  };
}

/** Inserta la sintaxis Markdown sobre la selección del `textarea`. */
export function applyFormat(format: MarkdownFormat, value: string, start: number, end: number): FormatResult {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  switch (format) {
    case 'bold':
    case 'code': {
      const [before, after] = WRAPPERS[format];
      return wrapSelection(value, from, to, before, after);
    }
    case 'link':
      return linkSelection(value, from, to);
    case 'list':
    case 'checklist':
    case 'heading2':
      return prefixLines(value, from, to, PREFIXES[format]);
  }
}

/* ---------------------------------------------------------------- plantillas */

export type NoteTemplateId = 'domain' | 'mistake' | 'command' | 'question';

export interface NoteTemplate {
  id: NoteTemplateId;
  /** Título de la nota creada. */
  titleKey: TKey;
  /** Esqueleto del cuerpo. */
  bodyKey: TKey;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  { id: 'domain', titleKey: 'notes.templates.domain', bodyKey: 'notes.templates.domain.body' },
  { id: 'mistake', titleKey: 'notes.templates.mistake', bodyKey: 'notes.templates.mistake.body' },
  { id: 'command', titleKey: 'notes.templates.command', bodyKey: 'notes.templates.command.body' },
  { id: 'question', titleKey: 'notes.templates.question', bodyKey: 'notes.templates.question.body' },
];
