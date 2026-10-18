/* =============================================================================
   Vault de Obsidian — §7.12, §8.9 y Anexo C.
   Generación determinista: mismo estado + mismo `now` ⇒ mismos archivos.
   El único campo variable entre dos exportaciones es `updated` del frontmatter.
   Sin `Date.now()`, sin DOM, sin red: funciones puras.
   ========================================================================== */

import type {
  AppState,
  Attempt,
  AttemptKind,
  CertLevel,
  Certification,
  ChecklistGroup,
  ChecklistItem,
  Domain,
  ExportProfile,
  Locale,
  Note,
  PlanItem,
  PlanStatus,
  StudySession,
  StudyType,
  Topic,
  TopicStatus,
} from '@/data/types';
import { localIso } from '@/lib/dates';
import { formatCurrency, formatPercent } from '@/lib/format';
import { budgetTotals } from './budget';
import { computeReadiness, type ReadinessResult } from './readiness';
import { attemptPassed, attemptScore } from './scoring';

/* =============================================================================
   API pública
   ========================================================================== */

export interface VaultFile {
  path: string;
  content: string;
}

export interface VaultOptions {
  state: AppState;
  profile: ExportProfile;
  locale: Locale;
  now: Date;
  vaultRoot?: string;
}

/* =============================================================================
   Nombres de archivo — §7.12 / C.1
   ========================================================================== */

const FORBIDDEN_FILENAME = /[\\/:*?"<>|]/g;
const MAX_FILENAME_LENGTH = 100;

/**
 * Sanea un nombre de archivo:
 *  - `[\\/:*?"<>|]` → `-`
 *  - NFC, espacios colapsados, sin separadores colgando
 *  - conserva acentos y emojis
 *  - máximo 100 puntos de código (no rompe pares sustitutos)
 */
export function sanitizeFilename(name: string): string {
  const normalized = name.replace(/^\uFEFF/, '').replace(/\r\n?/g, ' ').normalize('NFC');
  const replaced = normalized.replace(FORBIDDEN_FILENAME, '-');
  const collapsed = replaced.replace(/\s+/g, ' ').trim();
  const trimmed = collapsed.replace(/^[\s\-–—]+/, '').replace(/[\s\-–—]+$/, '');
  const cut = Array.from(trimmed).slice(0, MAX_FILENAME_LENGTH).join('');
  const clean = cut.replace(/^[\s\-–—]+/, '').replace(/[\s\-–—]+$/, '');
  return clean.length > 0 ? clean : 'Sin título';
}

/** Nombre corto oficial de la certificación, sin `AWS Certified` ni guiones de nivel. */
function certShortName(cert: Certification): string {
  let name = cert.name.replace(/^\uFEFF/, '').trim();
  name = name.replace(/^AWS Certified\s+/i, '');
  for (const prefix of [`${cert.code} — `, `${cert.code} - `, `${cert.code}: `]) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length);
      break;
    }
  }
  return name
    .replace(/[–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `SAA-C03 — Solutions Architect Associate` (carpeta y título de la nota resumen). */
export function certFolderName(cert: Certification): string {
  const short = certShortName(cert);
  const title = short.length > 0 && short !== cert.code ? `${cert.code} — ${short}` : cert.code;
  return sanitizeFilename(title);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function domainBaseName(index: number, domain: Domain): string {
  return sanitizeFilename(`${pad2(index + 1)} — ${domain.name}`);
}

function uniqueBase(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let counter = 2;
  for (;;) {
    const suffix = ` (${counter})`;
    const room = MAX_FILENAME_LENGTH - Array.from(suffix).length;
    const head = Array.from(base).slice(0, room).join('').replace(/[\s\-–—]+$/, '');
    const candidate = `${head}${suffix}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    counter += 1;
  }
}

/* =============================================================================
   YAML + renderNote
   ========================================================================== */

const YAML_PLAIN = /^[A-Za-z0-9_][A-Za-z0-9_./-]*$/;
const YAML_DATE = /^\d{4}-\d{2}-\d{2}$/;
const YAML_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)$/;
const YAML_RESERVED = /^(?:true|false|null|yes|no|on|off|y|n|~|nan|inf)$/i;
const YAML_NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;

function yamlScalar(value: unknown, forceQuote = false): string {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 'null' : value.toISOString();
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'string') {
    const plain =
      !forceQuote &&
      value.length > 0 &&
      (YAML_PLAIN.test(value) || YAML_DATE.test(value) || YAML_TIMESTAMP.test(value)) &&
      !YAML_RESERVED.test(value) &&
      !YAML_NUMBER.test(value);
    if (plain) return value;
    return JSON.stringify(value) ?? '""';
  }
  throw new Error(`Valor YAML no soportado: ${typeof value}`);
}

function yamlArray(
  key: string,
  values: unknown[],
  style: 'inline' | 'block',
  forceQuoteItems: boolean,
): string {
  if (values.length === 0) return `${key}: []`;
  if (style === 'inline') {
    return `${key}: [${values.map((value) => yamlScalar(value, forceQuoteItems)).join(', ')}]`;
  }
  const rows = values.map((value) => `  - ${yamlScalar(value, forceQuoteItems)}`);
  return `${key}:\n${rows.join('\n')}`;
}

function normalizeBody(body: string): string {
  return body
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/**
 * Serializa frontmatter + cuerpo. El YAML usa comillas dobles solo cuando hacen
 * falta y siempre es parseable por `gray-matter`. Termina en `\n`.
 */
export function renderNote(input: {
  frontmatter: Record<string, unknown>;
  body: string;
}): string {
  const body = normalizeBody(input.body);
  const entries = Object.entries(input.frontmatter).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return body.length > 0 ? `${body}\n` : '';

  const isCertification = input.frontmatter.type === 'aws-certification';
  const lines: string[] = [];
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      const block = isCertification && (key === 'tags' || key === 'domains');
      const forceQuoteItems = key === 'aliases' || key === 'domains';
      lines.push(yamlArray(key, value, block ? 'block' : 'inline', forceQuoteItems));
      continue;
    }
    lines.push(`${key}: ${yamlScalar(value, key === 'title')}`);
  }
  const header = `---\n${lines.join('\n')}\n---`;
  return body.length > 0 ? `${header}\n\n${body}\n` : `${header}\n`;
}

/* =============================================================================
   Textos por idioma (el contenido oficial de AWS no se traduce)
   ========================================================================== */

interface VaultCopy {
  examFacts: string;
  level: string;
  phase: string;
  price: string;
  duration: string;
  questions: string;
  passing: string;
  officialGuide: string;
  status: string;
  readiness: string;
  domains: string;
  domain: string;
  weight: string;
  practice: string;
  state: string;
  checklist: string;
  topics: string;
  mocks: string;
  notes: string;
  sessions: string;
  date: string;
  source: string;
  correct: string;
  estimated: string;
  estimatedScore: string;
  minimum: string;
  metric: string;
  value: string;
  byDomain: string;
  mistakes: string;
  whatToKnow: string;
  openQuestions: string;
  pending: string;
  review: string;
  nextReview: string;
  confidence: string;
  whatIDid: string;
  next: string;
  exam: string;
  routeTitle: string;
  certification: string;
  phase0: string;
  budget: string;
  planned: string;
  paid: string;
  remaining: string;
  total: string;
  kind: string;
  calendarTitle: string;
  upcomingReviews: string;
  optionalReading: string;
  dataview: string;
  recurring: string;
  preliminary: string;
  noData: string;
  progress: string;
  groups: Record<ChecklistGroup, string>;
  topicStatuses: Record<TopicStatus, string>;
  studyTypes: Record<StudyType, string>;
  attemptKinds: Record<AttemptKind, string>;
}

const ES: VaultCopy = {
  examFacts: 'Datos del examen',
  level: 'Nivel',
  phase: 'Fase',
  price: 'Precio',
  duration: 'Duración',
  questions: 'Preguntas',
  passing: 'Aprueba',
  officialGuide: 'Guía oficial',
  status: 'Estado',
  readiness: 'Readiness',
  domains: 'Dominios',
  domain: 'Dominio',
  weight: 'Peso',
  practice: 'Práctica',
  state: 'Estado',
  checklist: 'Checklist',
  topics: 'Temas',
  mocks: 'Simulacros',
  notes: 'Notas',
  sessions: 'Sesiones',
  date: 'Fecha',
  source: 'Fuente',
  correct: 'Aciertos',
  estimated: 'Estimado',
  estimatedScore: 'Puntaje estimado',
  minimum: 'Mínimo',
  metric: 'Métrica',
  value: 'Valor',
  byDomain: 'Por dominio',
  mistakes: 'Errores a repasar',
  whatToKnow: 'Qué debo saber',
  openQuestions: 'Dudas abiertas',
  pending: 'Pendientes',
  review: 'Repaso',
  nextReview: 'Próxima revisión',
  confidence: 'Confianza',
  whatIDid: 'Qué hice',
  next: 'Siguiente',
  exam: 'Examen',
  routeTitle: 'Ruta AWS',
  certification: 'Certificación',
  phase0: 'Fase 0 — gratis, antes de pagar',
  budget: 'Presupuesto',
  planned: 'Planeado',
  paid: 'Pagado',
  remaining: 'Pendiente',
  total: 'Total',
  kind: 'Tipo',
  calendarTitle: 'Calendario',
  upcomingReviews: 'Próximas revisiones (exportadas también en `miplan-aws.ics`):',
  optionalReading: 'Lectura opcional',
  dataview: 'Si usas Dataview',
  recurring: 'Recurrentes',
  preliminary: 'estimación preliminar',
  noData: '—',
  progress: 'Progreso',
  groups: {
    preparacion: 'Preparación',
    practica: 'Práctica',
    examen: 'Examen',
    personal: 'Personal',
  },
  topicStatuses: {
    pendiente: 'pendiente',
    estudiando: 'en curso',
    repasando: 'repaso',
    dominado: 'dominado',
    archivado: 'archivado',
  },
  studyTypes: {
    lectura: 'lectura',
    video: 'video',
    lab: 'laboratorio',
    practica: 'práctica',
    repaso: 'repaso',
    proyecto: 'proyecto',
  },
  attemptKinds: {
    practice_set: 'set de práctica',
    practice_exam: 'simulacro oficial',
    mock: 'simulacro',
    real: 'examen real',
  },
};

const EN: VaultCopy = {
  examFacts: 'Exam facts',
  level: 'Level',
  phase: 'Phase',
  price: 'Price',
  duration: 'Duration',
  questions: 'Questions',
  passing: 'Passing score',
  officialGuide: 'Official guide',
  status: 'Status',
  readiness: 'Readiness',
  domains: 'Domains',
  domain: 'Domain',
  weight: 'Weight',
  practice: 'Practice',
  state: 'Status',
  checklist: 'Checklist',
  topics: 'Topics',
  mocks: 'Mock exams',
  notes: 'Notes',
  sessions: 'Sessions',
  date: 'Date',
  source: 'Source',
  correct: 'Correct',
  estimated: 'Estimated',
  estimatedScore: 'Estimated score',
  minimum: 'Minimum',
  metric: 'Metric',
  value: 'Value',
  byDomain: 'By domain',
  mistakes: 'Mistakes to review',
  whatToKnow: 'What I need to know',
  openQuestions: 'Open questions',
  pending: 'Pending',
  review: 'Review',
  nextReview: 'Next review',
  confidence: 'Confidence',
  whatIDid: 'What I did',
  next: 'Next',
  exam: 'Exam',
  routeTitle: 'AWS Route',
  certification: 'Certification',
  phase0: 'Phase 0 — free, before paying',
  budget: 'Budget',
  planned: 'Planned',
  paid: 'Paid',
  remaining: 'Remaining',
  total: 'Total',
  kind: 'Type',
  calendarTitle: 'Calendar',
  upcomingReviews: 'Upcoming reviews (also exported in `miplan-aws.ics`):',
  optionalReading: 'Optional reading',
  dataview: 'If you use Dataview',
  recurring: 'Recurring',
  preliminary: 'preliminary estimate',
  noData: '—',
  progress: 'Progress',
  groups: {
    preparacion: 'Preparation',
    practica: 'Practice',
    examen: 'Exam',
    personal: 'Personal',
  },
  topicStatuses: {
    pendiente: 'pending',
    estudiando: 'in progress',
    repasando: 'review',
    dominado: 'mastered',
    archivado: 'archived',
  },
  studyTypes: {
    lectura: 'reading',
    video: 'video',
    lab: 'lab',
    practica: 'practice',
    repaso: 'review',
    proyecto: 'project',
  },
  attemptKinds: {
    practice_set: 'practice set',
    practice_exam: 'official practice exam',
    mock: 'mock exam',
    real: 'real exam',
  },
};

function copyFor(locale: Locale): VaultCopy {
  return locale === 'en' ? EN : ES;
}

const LEVEL_LABELS: Record<CertLevel, string> = {
  foundational: 'Foundational',
  associate: 'Associate',
  professional: 'Professional',
  specialty: 'Specialty',
  business: 'Business',
};

const PLAN_GLYPHS: Record<PlanStatus, string> = {
  no_iniciado: '○',
  estudiando: '◐',
  listo: '◐',
  agendado: '◐',
  aprobado: '●',
  reprobado: '▲',
  saltado: '›',
};

const GLYPH_PROGRESS = '◐';
const GLYPH_PENDING = '○';
const GLYPH_ALERT = '▲';
const GLYPH_NEXT = '›';
const GLYPH_CHECK = '✓';

function topicGlyph(status: TopicStatus): string {
  switch (status) {
    case 'dominado':
      return GLYPH_CHECK;
    case 'estudiando':
    case 'repasando':
      return GLYPH_PROGRESS;
    case 'archivado':
      return GLYPH_NEXT;
    case 'pendiente':
    default:
      return GLYPH_PENDING;
  }
}

function domainGlyph(accuracy: number | null, topics: Topic[]): string {
  if (accuracy !== null) {
    return accuracy >= 0.8 ? GLYPH_CHECK : accuracy > 0 ? GLYPH_PROGRESS : GLYPH_PENDING;
  }
  if (topics.some((topic) => topic.status === 'dominado')) return GLYPH_CHECK;
  if (topics.some((topic) => topic.status === 'estudiando' || topic.status === 'repasando')) {
    return GLYPH_PROGRESS;
  }
  return GLYPH_PENDING;
}

function domainStatus(topics: Topic[]): TopicStatus {
  const active = topics.filter((topic) => topic.status !== 'archivado');
  if (active.length > 0 && active.every((topic) => topic.status === 'dominado')) return 'dominado';
  if (active.some((topic) => topic.status === 'repasando')) return 'repasando';
  if (active.some((topic) => topic.status === 'estudiando')) return 'estudiando';
  return 'pendiente';
}

/* =============================================================================
   Utilidades de texto
   ========================================================================== */

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function oneLine(text: string): string {
  return stripHtmlTags(text)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cell(text: string): string {
  return oneLine(text).replace(/\|/g, '\\|');
}

/** Limpia el Markdown del usuario: sin HTML crudo, sin CRLF, sin BOM. */
function sanitizeMarkdown(text: string): string {
  return stripHtmlTags(text)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function dateOnly(value: string | null): string | null {
  if (!value) return null;
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  return match ? match[0] : null;
}

function bulletsFromText(text: string): string {
  const lines = sanitizeMarkdown(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return '';
  if (lines.every((line) => /^(?:[-*+]|\d+\.)\s+/.test(line))) return lines.join('\n');
  return lines.map((line) => `- ${line}`).join('\n');
}

function joinPath(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/^[/\\]+|[/\\]+$/g, ''))
    .filter((part) => part.length > 0)
    .join('/');
}

function normalizeRoot(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, ' ')
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
    .map((segment) => sanitizeFilename(segment))
    .join('/');
}

function baseName(path: string): string {
  const segment = path.split('/').pop() ?? path;
  return segment.endsWith('.md') ? segment.slice(0, -3) : segment;
}

/* =============================================================================
   Opciones de perfil
   ========================================================================== */

interface RenderOptions {
  includeFrontmatter: boolean;
  includeWikilinks: boolean;
  includeNotes: boolean;
  includeSessions: boolean;
  includeBudget: boolean;
  includeChecklist: boolean;
  dataviewBlocks: boolean;
  taskDates: boolean;
}

function optionsFromProfile(profile: ExportProfile): RenderOptions {
  return {
    includeFrontmatter: profile.includeFrontmatter,
    includeWikilinks: profile.includeWikilinks,
    includeNotes: profile.includeNotes,
    includeSessions: profile.includeSessions,
    includeBudget: profile.includeBudget,
    includeChecklist: profile.includeChecklist,
    dataviewBlocks: profile.dataviewBlocks,
    taskDates: profile.taskDates,
  };
}

const STANDALONE_PROFILE: ExportProfile = {
  id: 'standalone',
  name: 'Copiar para Obsidian',
  folder: '',
  includeFrontmatter: true,
  includeWikilinks: true,
  includeNotes: true,
  includeSessions: false,
  includeBudget: false,
  includeChecklist: true,
  dataviewBlocks: false,
  taskDates: true,
  createdAt: '2026-01-01T00:00:00Z',
};

/** «Copiar ruta» reproduce C.8, incluida la lectura opcional de Dataview. */
const ROUTE_PROFILE: ExportProfile = { ...STANDALONE_PROFILE, dataviewBlocks: true };

/* =============================================================================
   Índice del vault
   ========================================================================== */

interface VaultContext {
  state: AppState;
  locale: Locale;
  now: Date;
  copy: VaultCopy;
  options: RenderOptions;
  root: string;
  certs: Certification[];
  plan: PlanItem[];
  planByCert: Map<string, PlanItem>;
  readiness: Map<string, ReadinessResult>;
  domainNames: Map<string, string>;
  topicNames: Map<string, string>;
  sessionNames: Map<string, string>;
  attemptNames: Map<string, string>;
  summaryNames: Map<string, string>;
  sessionGroups: Map<string, StudySession[]>;
}

function sortedTopics(topics: Topic[]): Topic[] {
  return [...topics].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const byTitle = compareText(a.title, b.title);
    return byTitle !== 0 ? byTitle : compareText(a.id, b.id);
  });
}

function sortedChecklist(items: ChecklistItem[]): ChecklistItem[] {
  const groupOrder: Record<ChecklistGroup, number> = {
    preparacion: 0,
    practica: 1,
    examen: 2,
    personal: 3,
  };
  return [...items].sort((a, b) => {
    if (groupOrder[a.groupId] !== groupOrder[b.groupId]) {
      return groupOrder[a.groupId] - groupOrder[b.groupId];
    }
    if (a.order !== b.order) return a.order - b.order;
    const byTitle = compareText(a.title, b.title);
    return byTitle !== 0 ? byTitle : compareText(a.id, b.id);
  });
}

function sortedAttempts(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return compareText(a.id, b.id);
  });
}

function sortedSessions(sessions: StudySession[]): StudySession[] {
  return [...sessions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return compareText(a.id, b.id);
  });
}

function createContext(
  state: AppState,
  locale: Locale,
  now: Date,
  profile: ExportProfile,
  root: string,
  ensureCertId?: string,
): VaultContext {
  const certById = new Map(state.certifications.map((cert) => [cert.id, cert]));
  const planByCert = new Map<string, PlanItem>();
  for (const item of state.planItems) {
    if (!planByCert.has(item.certId)) planByCert.set(item.certId, item);
  }
  if (ensureCertId && !planByCert.has(ensureCertId) && certById.has(ensureCertId)) {
    planByCert.set(ensureCertId, {
      id: `standalone-${ensureCertId}`,
      certId: ensureCertId,
      order: Number.MAX_SAFE_INTEGER,
      status: 'no_iniciado',
      targetDate: null,
      hoursPlanned: 0,
      hoursDone: 0,
      createdAt: '',
      updatedAt: '',
    });
  }
  const pairs: { item: PlanItem; cert: Certification }[] = [];
  for (const item of planByCert.values()) {
    const cert = certById.get(item.certId);
    if (cert) pairs.push({ item, cert });
  }
  pairs.sort((a, b) => {
    if (a.cert.phase !== b.cert.phase) return a.cert.phase - b.cert.phase;
    if (a.item.order !== b.item.order) return a.item.order - b.item.order;
    const byCode = compareText(a.cert.code, b.cert.code);
    return byCode !== 0 ? byCode : compareText(a.item.id, b.item.id);
  });

  const options = optionsFromProfile(profile);
  const domainNames = new Map<string, string>();
  const topicNames = new Map<string, string>();
  const sessionNames = new Map<string, string>();
  const attemptNames = new Map<string, string>();
  const summaryNames = new Map<string, string>();
  const sessionGroups = new Map<string, StudySession[]>();
  const copy = copyFor(locale);

  for (const { cert } of pairs) {
    summaryNames.set(cert.id, `${cert.code} — Resumen`);

    const usedDomains = new Set<string>();
    cert.domains.forEach((domain, index) => {
      const base = uniqueBase(domainBaseName(index, domain), usedDomains);
      domainNames.set(`${cert.id}|${domain.id}`, base);
    });

    const usedTopics = new Set<string>();
    const certTopics = sortedTopics(state.topics.filter((topic) => topic.certId === cert.id));
    for (const topic of certTopics) {
      topicNames.set(topic.id, uniqueBase(sanitizeFilename(topic.title), usedTopics));
    }

    const usedAttempts = new Set<string>();
    const certAttempts = [...state.attempts]
      .filter((attempt) => attempt.certId === cert.id)
      .sort((a, b) => (a.date === b.date ? compareText(a.id, b.id) : a.date < b.date ? -1 : 1));
    for (const attempt of certAttempts) {
      const label = attempt.source.trim().length > 0 ? attempt.source : copy.attemptKinds[attempt.kind];
      const base = uniqueBase(
        sanitizeFilename(`${attempt.date} — ${label}`),
        usedAttempts,
      );
      attemptNames.set(attempt.id, base);
    }

    if (options.includeSessions) {
      const usedSessions = new Set<string>();
      const certSessions = sortedSessions(
        state.studySessions.filter((session) => session.certId === cert.id),
      );
      for (const session of certSessions) {
        const key = `${cert.id}|${session.date}`;
        const group = sessionGroups.get(key) ?? [];
        group.push(session);
        sessionGroups.set(key, group);
        if (!sessionNames.has(key)) {
          sessionNames.set(key, uniqueBase(sanitizeFilename(session.date), usedSessions));
        }
      }
    }
  }

  const readiness = new Map<string, ReadinessResult>();
  for (const { cert, item } of pairs) {
    readiness.set(
      cert.id,
      computeReadiness({
        cert,
        planItem: item,
        attempts: state.attempts.filter((attempt) => attempt.certId === cert.id),
        resources: state.resources,
        sessions: state.studySessions,
      }),
    );
  }

  return {
    state,
    locale,
    now,
    copy,
    options,
    root,
    certs: pairs.map((pair) => pair.cert),
    plan: pairs.map((pair) => pair.item),
    planByCert,
    readiness,
    domainNames,
    topicNames,
    sessionNames,
    attemptNames,
    summaryNames,
    sessionGroups,
  };
}

/* =============================================================================
   Consultas derivadas
   ========================================================================== */

function certOf(ctx: VaultContext, certId: string): Certification | null {
  return ctx.certs.find((cert) => cert.id === certId) ?? null;
}

function topicsOf(ctx: VaultContext, certId: string): Topic[] {
  return sortedTopics(ctx.state.topics.filter((topic) => topic.certId === certId));
}

function topicsOfDomain(ctx: VaultContext, certId: string, domainId: string): Topic[] {
  return topicsOf(ctx, certId).filter((topic) => topic.domainId === domainId);
}

function attemptsOf(ctx: VaultContext, certId: string): Attempt[] {
  return sortedAttempts(ctx.state.attempts.filter((attempt) => attempt.certId === certId));
}

function checklistOf(ctx: VaultContext, certId: string): ChecklistItem[] {
  return sortedChecklist(ctx.state.checklistItems.filter((item) => item.certId === certId));
}

function notesOf(ctx: VaultContext, certId: string): Note[] {
  return [...ctx.state.notes]
    .filter((note) => note.certId === certId)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
      return compareText(a.id, b.id);
    });
}

function sessionsOf(ctx: VaultContext, certId: string): StudySession[] {
  return sortedSessions(ctx.state.studySessions.filter((session) => session.certId === certId));
}

function sessionGroupsOf(ctx: VaultContext, certId: string): { key: string; group: StudySession[] }[] {
  const keys = [...ctx.sessionGroups.keys()]
    .filter((key) => key.startsWith(`${certId}|`))
    .sort((a, b) => compareText(a, b));
  return keys.map((key) => ({ key, group: ctx.sessionGroups.get(key) ?? [] }));
}

function domainOf(cert: Certification, domainId: string | null): Domain | null {
  if (!domainId) return null;
  return cert.domains.find((domain) => domain.id === domainId) ?? null;
}

function readinessOf(ctx: VaultContext, certId: string): ReadinessResult {
  const found = ctx.readiness.get(certId);
  if (found) return found;
  const cert = certOf(ctx, certId);
  if (!cert) {
    return {
      score: 0,
      preliminary: true,
      breakdown: {
        domainCoverage: 0,
        mockPerformance: 0,
        resourcesDone: 0,
        hoursVsPlan: 0,
      },
      accuracyByDomain: {},
      attemptsCount: 0,
    };
  }
  return computeReadiness({
    cert,
    planItem: ctx.planByCert.get(cert.id) ?? null,
    attempts: ctx.state.attempts.filter((attempt) => attempt.certId === cert.id),
    resources: ctx.state.resources,
    sessions: ctx.state.studySessions,
  });
}

/* =============================================================================
   Enlaces
   ========================================================================== */

function link(ctx: VaultContext, target: string, label?: string, inTable = false): string {
  const text = label ?? target;
  if (!ctx.options.includeWikilinks || target.length === 0) return text;
  if (inTable) return label ? `[[${target}\\|${label}]]` : `[[${target}]]`;
  return label ? `[[${target}|${label}]]` : `[[${target}]]`;
}

function embed(ctx: VaultContext, target: string): string {
  if (!ctx.options.includeWikilinks) return target;
  return `![[${target}]]`;
}

function taskLine(ctx: VaultContext, item: ChecklistItem): string {
  const check = item.done ? '[x]' : '[ ]';
  const due = ctx.options.taskDates && item.dueDate ? ` 📅 ${item.dueDate}` : '';
  return `- ${check} ${cell(item.title)}${due}`;
}

function dataviewBlock(title: string, query: string): string {
  const rows = query
    .trim()
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  return `> [!note]- ${title}\n> \`\`\`\`dataview\n${rows}\n> \`\`\`\``;
}

/* =============================================================================
   Nota de certificación — C.2 / C.3
   ========================================================================== */

function certFrontmatter(
  ctx: VaultContext,
  cert: Certification,
  planItem: PlanItem | null,
  readiness: ReadinessResult,
): Record<string, unknown> {
  const aliases = [cert.code];
  const short = certShortName(cert);
  if (short.length > 0 && !aliases.includes(short)) aliases.push(short);
  return {
    title: certFolderName(cert),
    aliases,
    type: 'aws-certification',
    code: cert.code,
    level: cert.level,
    phase: cert.phase,
    status: planItem?.status ?? 'no_iniciado',
    readiness: readiness.score,
    price_usd: cert.priceUsd,
    passing_score: cert.passingScore,
    exam_date: planItem?.targetDate ?? null,
    domains: cert.domains.map((domain) => domain.name),
    tags: ['aws', `aws/${cert.level}`, `cert/${cert.code}`],
    lang: ctx.locale,
    updated: localIso(ctx.now),
    source: 'Mi Plan AWS',
    schema: 1,
  };
}

function certFactsCallout(
  ctx: VaultContext,
  cert: Certification,
  planItem: PlanItem | null,
  readiness: ReadinessResult,
): string {
  const { copy, locale } = ctx;
  const lines: string[] = [`> [!info] ${copy.examFacts}`];
  lines.push(`> - **${copy.level}:** ${LEVEL_LABELS[cert.level]} · **${copy.phase}:** ${cert.phase}`);
  const meta: string[] = [];
  if (cert.priceUsd !== null) meta.push(`**${copy.price}:** ${cert.priceUsd} USD`);
  meta.push(`**${copy.duration}:** ${cert.durationMin} min`);
  meta.push(`**${copy.questions}:** ${cert.questions}`);
  meta.push(`**${copy.passing}:** ${cert.passingScore}`);
  lines.push(`> - ${meta.join(' · ')}`);
  const guide = cert.examGuideUrl || cert.officialUrl;
  if (guide.length > 0) lines.push(`> - **${copy.officialGuide}:** ${guide}`);
  const preliminary = readiness.preliminary ? ` (${copy.preliminary})` : '';
  lines.push(
    `> - **${copy.status}:** ${planItem?.status ?? 'no_iniciado'} · **${copy.readiness}:** ${formatPercent(
      readiness.score / 100,
      locale,
    )}${preliminary}`,
  );
  return lines.join('\n');
}

function certDomainsTable(ctx: VaultContext, cert: Certification): string {
  if (cert.domains.length === 0) return '';
  const { copy, locale } = ctx;
  const accuracy = readinessOf(ctx, cert.id).accuracyByDomain;
  const rows = cert.domains.map((domain, index) => {
    const base =
      ctx.domainNames.get(`${cert.id}|${domain.id}`) ?? domainBaseName(index, domain);
    const value = accuracy[domain.id] ?? null;
    const practice = value === null ? copy.noData : formatPercent(value, locale);
    const topics = topicsOfDomain(ctx, cert.id, domain.id);
    return `| ${link(ctx, base, undefined, true)} | ${formatPercent(
      domain.weight,
      locale,
    )} | ${practice} | ${domainGlyph(value, topics)} |`;
  });
  return [
    `| ${copy.domain} | ${copy.weight} | ${copy.practice} | ${copy.state} |`,
    '|---|---:|---:|:--:|',
    ...rows,
  ].join('\n');
}

function certChecklistBlocks(ctx: VaultContext, certId: string): string {
  if (!ctx.options.includeChecklist) return '';
  const items = checklistOf(ctx, certId);
  if (items.length === 0) return '';
  const { copy } = ctx;
  const groups: ChecklistGroup[] = ['preparacion', 'practica', 'examen', 'personal'];
  const blocks: string[] = [];
  for (const group of groups) {
    const groupItems = items.filter((item) => item.groupId === group);
    if (groupItems.length === 0) continue;
    blocks.push(
      [`> [!todo] ${copy.groups[group]}`, ...groupItems.map((item) => `> ${taskLine(ctx, item)}`)].join(
        '\n',
      ),
    );
  }
  return blocks.join('\n\n');
}

function certTopicsList(ctx: VaultContext, certId: string): string {
  const topics = topicsOf(ctx, certId).filter((topic) => topic.status !== 'archivado');
  if (topics.length === 0) return '';
  const { copy } = ctx;
  return topics
    .map((topic) => {
      const base = ctx.topicNames.get(topic.id) ?? sanitizeFilename(topic.title);
      const review = dateOnly(topic.nextReviewAt);
      const state = review
        ? `${copy.topicStatuses.repasando} ${review}`
        : copy.topicStatuses[topic.status];
      return `- ${link(ctx, base)} · ${state}`;
    })
    .join('\n');
}

function certAttemptsTable(ctx: VaultContext, cert: Certification): string {
  const attempts = attemptsOf(ctx, cert.id);
  if (attempts.length === 0) return '';
  const { copy } = ctx;
  const rows = attempts.map((attempt) => {
    const correct =
      attempt.correct !== null && attempt.total !== null
        ? `${attempt.correct}/${attempt.total}`
        : copy.noData;
    const score = attemptScore(attempt);
    const passed = attempt.passed ?? attemptPassed(attempt, cert.passingScore);
    const glyph = passed === true ? GLYPH_CHECK : passed === false ? GLYPH_ALERT : GLYPH_PENDING;
    const source = attempt.source.trim().length > 0 ? attempt.source : copy.attemptKinds[attempt.kind];
    return `| ${attempt.date} | ${cell(source)} | ${correct} | ${score ?? copy.noData} | ${glyph} |`;
  });
  return [
    `| ${copy.date} | ${copy.source} | ${copy.correct} | ${copy.estimated} | ${copy.state} |`,
    '|---|---|---:|---:|:--:|',
    ...rows,
  ].join('\n');
}

function certNotesBlock(ctx: VaultContext, cert: Certification): string {
  if (!ctx.options.includeNotes) return '';
  const pieces: string[] = [];
  for (const note of notesOf(ctx, cert.id)) {
    const body = sanitizeMarkdown(note.bodyMd);
    pieces.push(`### ${oneLine(note.title)}`);
    if (body.length > 0) pieces.push(body);
  }
  if (ctx.options.includeSessions) {
    const groups = sessionGroupsOf(ctx, cert.id).slice(-3).reverse();
    for (const { key } of groups) {
      const base = ctx.sessionNames.get(key);
      if (base) pieces.push(embed(ctx, base));
    }
  }
  return pieces.join('\n\n');
}

function certDataviewQuery(ctx: VaultContext, cert: Certification): string {
  const folder = joinPath(ctx.root, certFolderName(cert));
  const from = joinPath(folder, 'Dominios');
  return [
    `TABLE weight AS ${ctx.copy.weight}, accuracy AS ${ctx.copy.practice}, status AS ${ctx.copy.status}`,
    `FROM "${from}"`,
    'WHERE type = "aws-domain"',
    'SORT weight DESC',
  ].join('\n');
}

function renderCertContent(ctx: VaultContext, cert: Certification): string {
  const planItem = ctx.planByCert.get(cert.id) ?? null;
  const readiness = readinessOf(ctx, cert.id);
  const { copy, options } = ctx;
  const blocks: string[] = [`# ${certFolderName(cert)}`];
  blocks.push(certFactsCallout(ctx, cert, planItem, readiness));

  const domains = certDomainsTable(ctx, cert);
  if (domains.length > 0) blocks.push(`## ${copy.domains}\n\n${domains}`);

  const checklist = certChecklistBlocks(ctx, cert.id);
  if (checklist.length > 0) blocks.push(`## ${copy.checklist}\n\n${checklist}`);

  const topics = certTopicsList(ctx, cert.id);
  if (topics.length > 0) blocks.push(`## ${copy.topics}\n\n${topics}`);

  const attempts = certAttemptsTable(ctx, cert);
  if (attempts.length > 0) blocks.push(`## ${copy.mocks}\n\n${attempts}`);

  const notes = certNotesBlock(ctx, cert);
  if (notes.length > 0) blocks.push(`## ${copy.notes}\n\n${notes}`);

  if (options.dataviewBlocks) {
    blocks.push(dataviewBlock(copy.dataview, certDataviewQuery(ctx, cert)));
  }

  const body = blocks.join('\n\n');
  if (!options.includeFrontmatter) return renderNote({ frontmatter: {}, body });
  return renderNote({ frontmatter: certFrontmatter(ctx, cert, planItem, readiness), body });
}

/* =============================================================================
   Nota de dominio — C.4
   ========================================================================== */

function domainFrontmatter(
  ctx: VaultContext,
  cert: Certification,
  domain: Domain,
  base: string,
  accuracy: number | null,
  status: TopicStatus,
): Record<string, unknown> {
  const frontmatter: Record<string, unknown> = {
    title: base,
    aliases: [domain.name],
    type: 'aws-domain',
    cert: cert.code,
    weight: domain.weight,
  };
  if (accuracy !== null) frontmatter.accuracy = Math.round(accuracy * 100) / 100;
  frontmatter.status = status;
  frontmatter.tags = ['aws', `cert/${cert.code}`];
  frontmatter.lang = ctx.locale;
  frontmatter.updated = localIso(ctx.now);
  frontmatter.source = 'Mi Plan AWS';
  frontmatter.schema = 1;
  return frontmatter;
}

function domainDataviewQuery(ctx: VaultContext, cert: Certification, domain: Domain): string {
  const folder = joinPath(ctx.root, certFolderName(cert), 'Temas');
  return [
    `TABLE status AS ${ctx.copy.status}, confidence AS ${ctx.copy.confidence}, next_review AS ${ctx.copy.nextReview}`,
    `FROM "${folder}"`,
    `WHERE type = "aws-topic" AND domain = "${domain.name.replace(/"/g, '\\"')}"`,
    'SORT priority ASC',
  ].join('\n');
}

function renderDomainContent(
  ctx: VaultContext,
  cert: Certification,
  domain: Domain,
  index: number,
): string {
  const base = ctx.domainNames.get(`${cert.id}|${domain.id}`) ?? domainBaseName(index, domain);
  const readiness = readinessOf(ctx, cert.id);
  const accuracy = readiness.accuracyByDomain[domain.id] ?? null;
  const topics = topicsOfDomain(ctx, cert.id, domain.id);
  const status = domainStatus(topics);
  const { copy, options } = ctx;
  const summary = ctx.summaryNames.get(cert.id) ?? `${cert.code} — Resumen`;
  const blocks: string[] = [`# ${base}`];

  const accuracyText = accuracy === null ? copy.noData : formatPercent(accuracy, ctx.locale);
  blocks.push(
    `${link(ctx, summary)} · ${copy.weight} **${formatPercent(
      domain.weight,
      ctx.locale,
    )}** · ${copy.practice} **${accuracyText}** · ${copy.state} ${domainGlyph(accuracy, topics)}`,
  );

  const activeTopics = topics.filter((topic) => topic.status !== 'archivado');
  if (activeTopics.length > 0) {
    const lines = activeTopics.map((topic) => {
      const topicBase = ctx.topicNames.get(topic.id) ?? sanitizeFilename(topic.title);
      return `- ${link(ctx, topicBase)} · ${topicGlyph(topic.status)} ${copy.topicStatuses[topic.status]}`;
    });
    blocks.push(`## ${copy.topics}\n\n${lines.join('\n')}`);
  }

  if (options.includeChecklist) {
    const pending = checklistOf(ctx, cert.id).filter(
      (item) =>
        !item.done && item.topicId !== null && topics.some((topic) => topic.id === item.topicId),
    );
    if (pending.length > 0) {
      blocks.push(`## ${copy.pending}\n\n${pending.map((item) => taskLine(ctx, item)).join('\n')}`);
    }
  }

  if (options.includeSessions) {
    const sessions = sessionsOf(ctx, cert.id).filter((session) => session.domainId === domain.id);
    if (sessions.length > 0) {
      const lines = sessions.map((session) => {
        const sessionBase = ctx.sessionNames.get(`${cert.id}|${session.date}`) ?? session.date;
        return `- ${link(ctx, sessionBase)} · ${session.minutes} min`;
      });
      blocks.push(`## ${copy.sessions}\n\n${lines.join('\n')}`);
    }
  }

  if (options.includeNotes) {
    const notes = notesOf(ctx, cert.id).filter((note) => note.domainId === domain.id);
    if (notes.length > 0) {
      const lines = notes.map((note) => {
        const body = sanitizeMarkdown(note.bodyMd);
        return [`### ${oneLine(note.title)}`, body].filter((line) => line.length > 0).join('\n\n');
      });
      blocks.push(`## ${copy.notes}\n\n${lines.join('\n\n')}`);
    }
  }

  if (options.dataviewBlocks) {
    blocks.push(dataviewBlock(copy.dataview, domainDataviewQuery(ctx, cert, domain)));
  }

  const body = blocks.join('\n\n');
  if (!options.includeFrontmatter) return renderNote({ frontmatter: {}, body });
  return renderNote({
    frontmatter: domainFrontmatter(ctx, cert, domain, base, accuracy, status),
    body,
  });
}

/* =============================================================================
   Nota de tema — C.5
   ========================================================================== */

function topicTag(title: string): string {
  const head = title.split(/\s+[—–]\s+|\s+-\s+/)[0] ?? title;
  const tag = oneLine(head).replace(/[\\/:*?"<>|#^[\]\s]+/g, '-').replace(/-{2,}/g, '-');
  return tag.replace(/^[-–—]+|[-–—]+$/g, '') || 'tema';
}

function topicFrontmatter(
  ctx: VaultContext,
  cert: Certification,
  topic: Topic,
  base: string,
  domain: Domain | null,
): Record<string, unknown> {
  const topicAlias = oneLine(topic.title);
  const uniqueAliases = topicAlias === base ? [base] : [topicAlias, base];
  const frontmatter: Record<string, unknown> = {
    title: base,
    aliases: uniqueAliases,
    type: 'aws-topic',
    cert: cert.code,
  };
  if (domain) frontmatter.domain = domain.name;
  frontmatter.status = topic.status;
  if (topic.confidence !== null) frontmatter.confidence = topic.confidence;
  frontmatter.interval_days = topic.intervalDays;
  const review = dateOnly(topic.nextReviewAt);
  if (review) frontmatter.next_review = review;
  frontmatter.tags = ['aws', `cert/${cert.code}`, `topic/${topicTag(topic.title)}`];
  frontmatter.lang = ctx.locale;
  frontmatter.updated = localIso(ctx.now);
  frontmatter.source = 'Mi Plan AWS';
  frontmatter.schema = 1;
  return frontmatter;
}

function topicDataviewQuery(ctx: VaultContext, cert: Certification, domain: Domain): string {
  const folder = joinPath(ctx.root, certFolderName(cert), 'Temas');
  return [
    `TABLE status AS ${ctx.copy.status}, confidence AS ${ctx.copy.confidence}, next_review AS ${ctx.copy.nextReview}`,
    `FROM "${folder}"`,
    `WHERE type = "aws-topic" AND domain = "${domain.name.replace(/"/g, '\\"')}"`,
    'SORT priority ASC',
  ].join('\n');
}

function renderTopicContent(ctx: VaultContext, cert: Certification, topic: Topic): string {
  const base = ctx.topicNames.get(topic.id) ?? sanitizeFilename(topic.title);
  const domain = domainOf(cert, topic.domainId);
  const { copy, options } = ctx;
  const summary = ctx.summaryNames.get(cert.id) ?? `${cert.code} — Resumen`;
  const breadcrumb: string[] = [link(ctx, summary)];
  if (domain) {
    const domainBase = ctx.domainNames.get(`${cert.id}|${domain.id}`);
    if (domainBase) breadcrumb.push(link(ctx, domainBase));
  }
  const blocks: string[] = [`# ${base}`, breadcrumb.join(' · ')];

  const description = sanitizeMarkdown(topic.descriptionMd);
  if (description.length > 0) blocks.push(`## ${copy.whatToKnow}\n\n${description}`);

  const review = dateOnly(topic.nextReviewAt);
  if (review || topic.confidence !== null) {
    const parts: string[] = [];
    if (review) parts.push(review);
    if (topic.confidence !== null) parts.push(`${copy.confidence}: ${topic.confidence}/5`);
    blocks.push(`## ${copy.review}\n\n> [!tip] ${copy.nextReview}\n> ${parts.join(' · ')}`);
  }

  if (options.includeChecklist) {
    const pending = checklistOf(ctx, cert.id).filter(
      (item) => !item.done && item.topicId === topic.id,
    );
    if (pending.length > 0) {
      blocks.push(`## ${copy.openQuestions}\n\n${pending.map((item) => taskLine(ctx, item)).join('\n')}`);
    }
  }

  if (options.includeNotes) {
    const notes = notesOf(ctx, cert.id).filter((note) => note.topicId === topic.id);
    if (notes.length > 0) {
      const lines = notes.map((note) => {
        const body = sanitizeMarkdown(note.bodyMd);
        return [`### ${oneLine(note.title)}`, body].filter((line) => line.length > 0).join('\n\n');
      });
      blocks.push(`## ${copy.notes}\n\n${lines.join('\n\n')}`);
    }
  }

  if (options.dataviewBlocks && domain) {
    blocks.push(dataviewBlock(copy.dataview, topicDataviewQuery(ctx, cert, domain)));
  }

  const body = blocks.join('\n\n');
  if (!options.includeFrontmatter) return renderNote({ frontmatter: {}, body });
  return renderNote({
    frontmatter: topicFrontmatter(ctx, cert, topic, base, domain),
    body,
  });
}

/* =============================================================================
   Nota de sesión — C.6
   ========================================================================== */

function sessionFrontmatter(
  ctx: VaultContext,
  cert: Certification,
  group: StudySession[],
  base: string,
): Record<string, unknown> {
  const first = group[0];
  const minutes = group.reduce((sum, session) => sum + session.minutes, 0);
  return {
    title: base,
    aliases: [base],
    type: 'aws-session',
    date: first?.date ?? base,
    cert: cert.code,
    minutes,
    kind: first?.type ?? 'lectura',
    confidence: first?.confidence ?? 3,
    tags: ['aws', 'sesion'],
    lang: ctx.locale,
    updated: localIso(ctx.now),
    source: 'Mi Plan AWS',
    schema: 1,
  };
}

function renderSessionContent(
  ctx: VaultContext,
  cert: Certification,
  group: StudySession[],
  base: string,
): string {
  const first = group[0];
  const { copy, options } = ctx;
  const minutes = group.reduce((sum, session) => sum + session.minutes, 0);
  const blocks: string[] = [`# ${base}`];

  const meta: string[] = [
    `**${minutes} min**`,
    cert.code,
    copy.studyTypes[first?.type ?? 'lectura'],
    `${copy.confidence.toLowerCase()} ${first?.confidence ?? 3}/5`,
  ];
  const domain = domainOf(cert, first?.domainId ?? null);
  if (domain) {
    const domainBase = ctx.domainNames.get(`${cert.id}|${domain.id}`);
    if (domainBase) meta.push(link(ctx, domainBase));
  }
  blocks.push(meta.join(' · '));

  if (group.length === 1) {
    const notes = bulletsFromText(first?.notes ?? '');
    if (notes.length > 0) blocks.push(`## ${copy.whatIDid}\n\n${notes}`);
  } else {
    const lines = group.map((session) => {
      const notes = oneLine(session.notes);
      const detail = notes.length > 0 ? ` · ${notes}` : '';
      return `- **${session.minutes} min** · ${copy.studyTypes[session.type]}${detail}`;
    });
    blocks.push(`## ${copy.whatIDid}\n\n${lines.join('\n')}`);
  }

  const nextTopic = topicsOf(ctx, cert.id)
    .filter((topic) => topic.status !== 'archivado')
    .sort((a, b) => {
      const da = dateOnly(a.nextReviewAt) ?? '9999-99-99';
      const db = dateOnly(b.nextReviewAt) ?? '9999-99-99';
      if (da !== db) return compareText(da, db);
      if (a.priority !== b.priority) return a.priority - b.priority;
      return compareText(a.id, b.id);
    })[0];
  if (nextTopic) {
    const topicBase = ctx.topicNames.get(nextTopic.id) ?? sanitizeFilename(nextTopic.title);
    const review = dateOnly(nextTopic.nextReviewAt);
    blocks.push(
      `## ${copy.next}\n\n- ${link(ctx, topicBase)}${
        review ? ` → ${copy.review.toLowerCase()} ${review}` : ''
      }`,
    );
  }

  const body = blocks.join('\n\n');
  if (!options.includeFrontmatter) return renderNote({ frontmatter: {}, body });
  return renderNote({ frontmatter: sessionFrontmatter(ctx, cert, group, base), body });
}

/* =============================================================================
   Nota de simulacro — C.7
   ========================================================================== */

function attemptFrontmatter(
  ctx: VaultContext,
  cert: Certification,
  attempt: Attempt,
  base: string,
): Record<string, unknown> {
  return {
    title: base,
    aliases: [attempt.date, base],
    type: 'aws-attempt',
    cert: cert.code,
    date: attempt.date,
    kind: attempt.kind,
    correct: attempt.correct,
    total: attempt.total,
    estimated_score: attemptScore(attempt),
    passing_score: cert.passingScore,
    passed: attempt.passed ?? attemptPassed(attempt, cert.passingScore),
    duration_min: attempt.durationMin,
    tags: ['aws', 'simulacro'],
    lang: ctx.locale,
    updated: localIso(ctx.now),
    source: 'Mi Plan AWS',
    schema: 1,
  };
}

function attemptMetricsTable(ctx: VaultContext, cert: Certification, attempt: Attempt): string {
  const { copy } = ctx;
  const score = attemptScore(attempt);
  const correct =
    attempt.correct !== null && attempt.total !== null
      ? `${attempt.correct}/${attempt.total}`
      : copy.noData;
  const rows: string[][] = [
    [copy.correct, correct],
    [copy.estimatedScore, score === null ? copy.noData : `**${score}**`],
    [copy.minimum, String(cert.passingScore)],
    [copy.duration, `${attempt.durationMin} min`],
  ];
  return [
    `| ${copy.metric} | ${copy.value} |`,
    '|---|---:|',
    ...rows.map(([label, value]) => `| ${label} | ${value} |`),
  ].join('\n');
}

function attemptDomainTable(ctx: VaultContext, cert: Certification, attempt: Attempt): string {
  if (attempt.breakdown.length === 0) return '';
  const { copy } = ctx;
  const rows = attempt.breakdown.map((row) => {
    const domain = cert.domains.find((item) => item.id === row.domainId);
    const name = domain?.name ?? row.domainId;
    const percent = row.total > 0 ? formatPercent(row.correct / row.total, ctx.locale) : copy.noData;
    return `| ${cell(name)} | ${row.correct}/${row.total} | ${percent} |`;
  });
  return [
    `| ${copy.domain} | ${copy.correct} | % |`,
    '|---|---:|---:|',
    ...rows,
  ].join('\n');
}

function attemptMistakes(ctx: VaultContext, cert: Certification): string {
  const candidates = topicsOf(ctx, cert.id)
    .filter(
      (topic) =>
        topic.status !== 'archivado' &&
        (topic.status === 'repasando' || (topic.confidence !== null && topic.confidence <= 3)),
    )
    .slice(0, 5);
  if (candidates.length === 0) return '';
  return candidates
    .map((topic) => {
      const base = ctx.topicNames.get(topic.id) ?? sanitizeFilename(topic.title);
      return `- ${link(ctx, base)}`;
    })
    .join('\n');
}

function renderAttemptContent(ctx: VaultContext, cert: Certification, attempt: Attempt): string {
  const base = ctx.attemptNames.get(attempt.id) ?? sanitizeFilename(`${attempt.date} — ${attempt.source}`);
  const { copy, options } = ctx;
  const blocks: string[] = [`# ${base}`, attemptMetricsTable(ctx, cert, attempt)];

  const domains = attemptDomainTable(ctx, cert, attempt);
  if (domains.length > 0) blocks.push(`## ${copy.byDomain}\n\n${domains}`);

  const mistakes = attemptMistakes(ctx, cert);
  if (mistakes.length > 0) blocks.push(`## ${copy.mistakes}\n\n${mistakes}`);

  const notes = sanitizeMarkdown(attempt.notes);
  if (notes.length > 0) blocks.push(`## ${copy.notes}\n\n${notes}`);

  const body = blocks.join('\n\n');
  if (!options.includeFrontmatter) return renderNote({ frontmatter: {}, body });
  return renderNote({ frontmatter: attemptFrontmatter(ctx, cert, attempt, base), body });
}

/* =============================================================================
   _Ruta AWS.md — C.8
   ========================================================================== */

function routeFrontmatter(ctx: VaultContext): Record<string, unknown> {
  return {
    type: 'aws-roadmap',
    tags: ['aws', 'ruta'],
    updated: localIso(ctx.now),
    source: 'Mi Plan AWS',
  };
}

function routeTable(ctx: VaultContext): string {
  const { copy, locale } = ctx;
  const rows = ctx.certs.map((cert, index) => {
    const item = ctx.plan[index];
    const readiness = readinessOf(ctx, cert.id);
    const summary = ctx.summaryNames.get(cert.id) ?? `${cert.code} — Resumen`;
    return `| ${item.order} | ${link(ctx, summary, cert.code, true)} | ${
      LEVEL_LABELS[cert.level]
    } | ${PLAN_GLYPHS[item.status]} | ${formatPercent(readiness.score / 100, locale)} | ${
      item.targetDate ?? copy.noData
    } |`;
  });
  return [
    `| # | ${copy.certification} | ${copy.level} | ${copy.status} | ${copy.readiness} | ${copy.exam} |`,
    '|--:|---|---|:--:|---:|---|',
    ...rows,
  ].join('\n');
}

function routePhaseZero(ctx: VaultContext): string {
  const { copy } = ctx;
  const phaseZero = ctx.certs.filter((cert) => cert.phase === 0);
  if (phaseZero.length === 0) return '';
  const certIds = new Set(phaseZero.map((cert) => cert.id));
  const items = sortedChecklist(
    ctx.state.checklistItems.filter((item) => certIds.has(item.certId)),
  );
  if (ctx.options.includeChecklist && items.length > 0) {
    return `## ${copy.phase0}\n\n${items.map((item) => taskLine(ctx, item)).join('\n')}`;
  }
  const lines = phaseZero.map((cert) => {
    const item = ctx.planByCert.get(cert.id);
    const done = item?.status === 'aprobado' || item?.status === 'saltado';
    return `- [${done ? 'x' : ' '}] ${cert.code} — ${certShortName(cert)}`;
  });
  return `## ${copy.phase0}\n\n${lines.join('\n')}`;
}

function routeBudget(ctx: VaultContext): string {
  if (!ctx.options.includeBudget || ctx.state.budgetItems.length === 0) return '';
  const totals = budgetTotals(ctx.state.budgetItems);
  const { copy, locale } = ctx;
  return [
    `## ${copy.budget}`,
    '',
    `- **${copy.planned}:** ${formatCurrency(totals.plannedUsd, locale)}`,
    `- **${copy.paid}:** ${formatCurrency(totals.paidUsd, locale)}`,
    `- **${copy.total}:** ${formatCurrency(totals.plannedUsd + totals.paidUsd, locale)}`,
  ].join('\n');
}

function routeDataviewQuery(ctx: VaultContext): string {
  const from = ctx.root.length > 0 ? ctx.root : '.';
  return [
    `TABLE level AS ${ctx.copy.level}, status AS ${ctx.copy.status}, readiness AS "%", exam_date AS ${ctx.copy.exam}`,
    `FROM "${from}"`,
    'WHERE type = "aws-certification"',
    'SORT phase ASC, order ASC',
  ].join('\n');
}

function renderRouteContent(ctx: VaultContext): string {
  const { copy, options } = ctx;
  const blocks: string[] = [`# ${copy.routeTitle}`];
  if (ctx.certs.length > 0) blocks.push(routeTable(ctx));
  const phaseZero = routePhaseZero(ctx);
  if (phaseZero.length > 0) blocks.push(phaseZero);
  const budget = routeBudget(ctx);
  if (budget.length > 0) blocks.push(budget);
  if (options.dataviewBlocks) {
    blocks.push(
      `## ${copy.optionalReading}\n\n${dataviewBlock(copy.dataview, routeDataviewQuery(ctx))}`,
    );
  }
  const body = blocks.join('\n\n');
  if (!options.includeFrontmatter) return renderNote({ frontmatter: {}, body });
  return renderNote({ frontmatter: routeFrontmatter(ctx), body });
}

/* =============================================================================
   _Checklist.md — C.9
   ========================================================================== */

function checklistDataviewQuery(ctx: VaultContext, certId: string | null): string {
  const cert = certId ? certOf(ctx, certId) : null;
  const from = cert
    ? joinPath(ctx.root, certFolderName(cert))
    : ctx.root.length > 0
      ? ctx.root
      : '.';
  return ['TASK', `FROM "${from}"`, 'WHERE !completed'].join('\n');
}

function renderChecklistContent(ctx: VaultContext, certId: string | null): string {
  const { copy, options } = ctx;
  const certs = certId
    ? ctx.certs.filter((cert) => cert.id === certId)
    : ctx.certs;
  const blocks: string[] = ['# Checklist'];
  const recurring: ChecklistItem[] = [];

  for (const cert of certs) {
    const items = checklistOf(ctx, cert.id);
    const regular = items.filter((item) => item.recurrence === 'ninguna');
    recurring.push(...items.filter((item) => item.recurrence !== 'ninguna'));
    if (regular.length > 0) {
      blocks.push(
        `## ${cert.code}\n\n${[`> [!todo]`, ...regular.map((item) => `> ${taskLine(ctx, item)}`)].join(
          '\n',
        )}`,
      );
    }
  }

  if (recurring.length > 0) {
    blocks.push(
      `## ${copy.recurring}\n\n${[`> [!todo]`, ...recurring.map((item) => `> ${taskLine(ctx, item)}`)].join(
        '\n',
      )}`,
    );
  }

  if (options.dataviewBlocks) {
    blocks.push(dataviewBlock(copy.dataview, checklistDataviewQuery(ctx, certId)));
  }

  return renderNote({ frontmatter: {}, body: blocks.join('\n\n') });
}

/* =============================================================================
   _Calendario.md — C.9
   ========================================================================== */

function calendarEntries(ctx: VaultContext): string[] {
  // Sin filtro por `now`: el vault debe ser idéntico salvo `updated` (§8.9).
  const reviews: { date: string; line: string }[] = [];
  for (const cert of ctx.certs) {
    for (const topic of topicsOf(ctx, cert.id)) {
      if (topic.status === 'archivado') continue;
      const date = dateOnly(topic.nextReviewAt);
      if (!date) continue;
      const base = ctx.topicNames.get(topic.id) ?? sanitizeFilename(topic.title);
      reviews.push({ date, line: `- ${date} · ${link(ctx, base)}` });
    }
  }
  ctx.certs.forEach((cert, index) => {
    const item = ctx.plan[index];
    if (!item.targetDate) return;
    reviews.push({
      date: item.targetDate,
      line: `- ${item.targetDate} · **${ctx.copy.exam} ${cert.code}**`,
    });
  });
  reviews.sort((a, b) => {
    if (a.date !== b.date) return compareText(a.date, b.date);
    return compareText(a.line, b.line);
  });
  return reviews.map((entry) => entry.line);
}

function calendarDataviewQuery(ctx: VaultContext): string {
  const from = ctx.root.length > 0 ? ctx.root : '.';
  return [
    `TABLE date AS ${ctx.copy.date}, minutes AS "${ctx.copy.duration}", kind AS "${ctx.copy.kind}"`,
    `FROM "${from}"`,
    'WHERE type = "aws-session"',
    'SORT date DESC',
  ].join('\n');
}

function renderCalendarContent(ctx: VaultContext): string {
  const { copy, options } = ctx;
  const blocks: string[] = [`# ${copy.calendarTitle}`];
  const entries = calendarEntries(ctx);
  if (entries.length > 0) {
    blocks.push(`${copy.upcomingReviews}\n\n${entries.join('\n')}`);
  }
  if (options.dataviewBlocks && options.includeSessions) {
    blocks.push(dataviewBlock(copy.dataview, calendarDataviewQuery(ctx)));
  }
  return renderNote({ frontmatter: {}, body: blocks.join('\n\n') });
}

/* =============================================================================
   Integridad de enlaces — §8.9
   ========================================================================== */

function resolveWikiTarget(raw: string): string {
  const withoutHeading = (raw.split('#')[0] ?? '').replace(/\\$/, '');
  const segment = withoutHeading.replace(/\\/g, '/').split('/').pop() ?? '';
  return segment.replace(/\.md$/i, '').trim();
}

function degradeLinks(content: string, available: Set<string>, keepLinks: boolean): string {
  return content.replace(/(!?)\[\[([^\]]+?)\]\]/g, (match, bang: string, raw: string) => {
    const escapedPipe = raw.indexOf('\\|');
    const pipe = raw.indexOf('|');
    let rawTarget = raw;
    let label = '';
    if (escapedPipe >= 0) {
      rawTarget = raw.slice(0, escapedPipe);
      label = raw.slice(escapedPipe + 2);
    } else if (pipe >= 0) {
      rawTarget = raw.slice(0, pipe);
      label = raw.slice(pipe + 1);
    }
    const target = resolveWikiTarget(rawTarget);
    const keep = keepLinks && target.length > 0 && available.has(target.toLowerCase());
    if (keep) return match;
    const text = (label || target || raw).trim();
    return bang.length > 0 ? text : text;
  });
}

function stripHtmlTags(text: string): string {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[A-Za-z][^>]*>/g, '');
}

function finalize(content: string): string {
  const text = stripHtmlTags(content).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trimEnd();
  return text.length > 0 ? `${text}\n` : '';
}

/* =============================================================================
   API pública de notas y vault
   ========================================================================== */

/** Nota de certificación — equivale a «Copiar para Obsidian». */
export function renderCertNote(
  state: AppState,
  certId: string,
  locale: Locale,
  now: Date,
): string {
  const ctx = createContext(state, locale, now, STANDALONE_PROFILE, '', certId);
  const cert = certOf(ctx, certId);
  if (!cert) throw new Error(`Certificación no encontrada: ${certId}`);

  const available = new Set<string>();
  const summary = ctx.summaryNames.get(cert.id);
  if (summary) available.add(summary.toLowerCase());
  for (const domain of cert.domains) {
    const base = ctx.domainNames.get(`${cert.id}|${domain.id}`);
    if (base) available.add(base.toLowerCase());
  }
  for (const topic of topicsOf(ctx, cert.id)) {
    const base = ctx.topicNames.get(topic.id);
    if (base) available.add(base.toLowerCase());
  }
  for (const attempt of attemptsOf(ctx, cert.id)) {
    const base = ctx.attemptNames.get(attempt.id);
    if (base) available.add(base.toLowerCase());
  }

  return finalize(degradeLinks(renderCertContent(ctx, cert), available, true));
}

/** `_Ruta AWS.md` — equivale a «Copiar ruta». */
export function renderRouteNote(state: AppState, locale: Locale, now: Date): string {
  const ctx = createContext(state, locale, now, ROUTE_PROFILE, 'AWS');
  return finalize(renderRouteContent(ctx));
}

/** `_Checklist.md` — todas las certificaciones planeadas. */
export function renderChecklistNote(state: AppState, locale: Locale, now: Date): string {
  const ctx = createContext(state, locale, now, STANDALONE_PROFILE, '');
  return finalize(renderChecklistContent(ctx, null));
}

/** `_Calendario.md` — revisiones y exámenes. */
export function renderCalendarNote(state: AppState, locale: Locale, now: Date): string {
  const ctx = createContext(state, locale, now, STANDALONE_PROFILE, '');
  return finalize(renderCalendarContent(ctx));
}

/** Construye el árbol completo del vault según el perfil elegido. */
export function buildVault(options: VaultOptions): VaultFile[] {
  const root = normalizeRoot(options.vaultRoot ?? options.profile.folder);
  const ctx = createContext(options.state, options.locale, options.now, options.profile, root);
  const files: VaultFile[] = [];

  files.push({ path: joinPath(root, '_Ruta AWS.md'), content: renderRouteContent(ctx) });
  if (options.profile.includeChecklist) {
    files.push({
      path: joinPath(root, '_Checklist.md'),
      content: renderChecklistContent(ctx, null),
    });
  }
  files.push({
    path: joinPath(root, '_Calendario.md'),
    content: renderCalendarContent(ctx),
  });

  for (const cert of ctx.certs) {
    const folder = joinPath(root, certFolderName(cert));
    files.push({
      path: joinPath(folder, `${cert.code} — Resumen.md`),
      content: renderCertContent(ctx, cert),
    });

    if (options.profile.includeChecklist) {
      files.push({
        path: joinPath(folder, `${cert.code} — Checklist.md`),
        content: renderChecklistContent(ctx, cert.id),
      });
    }

    cert.domains.forEach((domain, index) => {
      const base = ctx.domainNames.get(`${cert.id}|${domain.id}`) ?? domainBaseName(index, domain);
      files.push({
        path: joinPath(folder, 'Dominios', `${base}.md`),
        content: renderDomainContent(ctx, cert, domain, index),
      });
    });

    for (const topic of topicsOf(ctx, cert.id)) {
      const base = ctx.topicNames.get(topic.id) ?? sanitizeFilename(topic.title);
      files.push({
        path: joinPath(folder, 'Temas', `${base}.md`),
        content: renderTopicContent(ctx, cert, topic),
      });
    }

    if (options.profile.includeSessions) {
      for (const { key, group } of sessionGroupsOf(ctx, cert.id)) {
        const base = ctx.sessionNames.get(key) ?? group[0]?.date ?? 'sesion';
        files.push({
          path: joinPath(folder, 'Sesiones', (group[0]?.date ?? base).slice(0, 4), `${base}.md`),
          content: renderSessionContent(ctx, cert, group, base),
        });
      }
    }

    for (const attempt of attemptsOf(ctx, cert.id)) {
      const base =
        ctx.attemptNames.get(attempt.id) ??
        sanitizeFilename(`${attempt.date} — ${attempt.source || ctx.copy.attemptKinds[attempt.kind]}`);
      files.push({
        path: joinPath(folder, 'Simulacros', `${base}.md`),
        content: renderAttemptContent(ctx, cert, attempt),
      });
    }
  }

  const available = new Set(files.map((file) => baseName(file.path).toLowerCase()));
  return files.map((file) => ({
    path: file.path,
    content: finalize(degradeLinks(file.content, available, options.profile.includeWikilinks)),
  }));
}
