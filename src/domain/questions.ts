import type { Certification, Question } from '@/data/types';

/**
 * F3.2 — banco de preguntas propio.
 *
 * Reglas duras:
 *  - Nunca se importan preguntas reales de examen ni material filtrado (§13): el
 *    formato está pensado para preguntas escritas por el usuario o de práctica
 *    pública, con su fuente declarada.
 *  - Los parsers son puros: reciben texto y devuelven datos + errores por línea.
 *  - La selección del simulacro respeta los pesos de dominio del examen.
 */

export interface ParsedQuestion {
  certId: string;
  domainId: string | null;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source: string;
  tags: string[];
}

export interface ParseIssue {
  /** Número de línea del archivo (1 = cabecera del CSV). */
  line: number;
  message: string;
}

export interface QuestionParseResult {
  items: ParsedQuestion[];
  issues: ParseIssue[];
}

export const CSV_COLUMNS = [
  'certId',
  'domainId',
  'prompt',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correct',
  'explanation',
  'source',
] as const;

/** Plantilla descargable para el usuario (sin contenido de examen). */
export function questionsCsvTemplate(): string {
  return [
    CSV_COLUMNS.join(','),
    'SAA-C03,secure,"¿Qué servicio administra claves y rotación de forma nativa?","AWS KMS","AWS Secrets Manager","AWS CloudHSM","IAM",A,"KMS administra claves gestionadas con rotación automática.","Propio (repaso de la guía oficial)"',
    'SAA-C03,resilient,"¿Qué patrón evita perder datos al fallar una AZ?","Instancia única grande","Réplica multi-AZ","Snapshot manual","Cola FIFO",B,"Multi-AZ replica los datos en una segunda zona de disponibilidad.","Propio (repaso de la guía oficial)"',
  ].join('\n');
}

/** Parser CSV con soporte de comillas dobles y campos con comas/saltos. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

function parseCorrectValue(raw: string): number | null {
  const value = raw.trim().toUpperCase();
  if (/^[A-F]$/.test(value)) return value.charCodeAt(0) - 65;
  if (/^[1-6]$/.test(value)) return Number(value) - 1;
  return null;
}

function normalizeDomain(certId: string, rawDomain: string, certifications: Certification[]): string | null {
  const value = rawDomain.trim();
  if (value.length === 0) return null;
  const cert = certifications.find((candidate) => candidate.id === certId);
  if (!cert) return value;
  const byId = cert.domains.find((domain) => domain.id === value);
  if (byId) return byId.id;
  const lowered = value.toLowerCase();
  const byName = cert.domains.find((domain) => domain.name.toLowerCase() === lowered);
  if (byName) return byName.id;
  const partial = cert.domains.find((domain) => domain.name.toLowerCase().includes(lowered));
  return partial ? partial.id : null;
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[;|]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export interface ParseOptions {
  certifications: Certification[];
  /** Certificación por defecto si el CSV no trae la columna o viene vacía. */
  defaultCertId?: string;
}

/** Importa el banco desde CSV (`certId,domainId,prompt,optionA..D,correct,explanation,source`). */
export function parseQuestionsCsv(text: string, options: ParseOptions): QuestionParseResult {
  const rows = parseCsvRows(text);
  const issues: ParseIssue[] = [];
  const items: ParsedQuestion[] = [];
  if (rows.length === 0) return { items, issues: [{ line: 1, message: 'El archivo está vacío.' }] };

  const header = rows[0].map((cell) => cell.trim());
  const index = (name: string) => header.findIndex((cell) => cell.toLowerCase() === name.toLowerCase());
  const idxCert = index('certId');
  const idxDomain = index('domainId');
  const idxPrompt = index('prompt');
  const idxCorrect = index('correct');
  const optionIndexes = ['optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'optionF']
    .map(index)
    .filter((position) => position >= 0);
  const idxExplanation = index('explanation');
  const idxSource = index('source');
  const idxTags = index('tags');

  if (idxPrompt < 0 || optionIndexes.length < 2 || idxCorrect < 0) {
    return {
      items,
      issues: [{ line: 1, message: 'Faltan columnas obligatorias: prompt, optionA, optionB y correct.' }],
    };
  }

  rows.slice(1).forEach((cells, position) => {
    const line = position + 2;
    const certId = (idxCert >= 0 ? cells[idxCert] : options.defaultCertId ?? '').trim();
    const prompt = (cells[idxPrompt] ?? '').trim();
    const correctRaw = (cells[idxCorrect] ?? '').trim();
    const optionValues = optionIndexes
      .map((optionIndex) => (cells[optionIndex] ?? '').trim())
      .filter((value) => value.length > 0);

    if (!certId) {
      issues.push({ line, message: 'Falta certId.' });
      return;
    }
    if (!prompt) {
      issues.push({ line, message: 'Falta el enunciado (prompt).' });
      return;
    }
    if (optionValues.length < 2) {
      issues.push({ line, message: 'Se necesitan al menos dos opciones.' });
      return;
    }
    const correctIndex = parseCorrectValue(correctRaw);
    if (correctIndex === null) {
      issues.push({ line, message: `Valor de «correct» inválido: "${correctRaw}". Usa A–F o 1–6.` });
      return;
    }
    if (correctIndex >= optionValues.length) {
      issues.push({ line, message: `«correct» apunta a una opción que no existe (${correctRaw}).` });
      return;
    }

    items.push({
      certId,
      domainId: idxDomain >= 0 ? normalizeDomain(certId, cells[idxDomain] ?? '', options.certifications) : null,
      prompt,
      options: optionValues,
      correctIndex,
      explanation: (idxExplanation >= 0 ? cells[idxExplanation] ?? '' : '').trim(),
      source: (idxSource >= 0 ? cells[idxSource] ?? '' : '').trim() || 'Importado',
      tags: idxTags >= 0 ? parseTags(cells[idxTags] ?? '') : [],
    });
  });

  return { items, issues };
}

/** Importa el banco desde JSON: un array de objetos o `{ questions: [...] }`. */
export function parseQuestionsJson(text: string, options: ParseOptions): QuestionParseResult {
  const issues: ParseIssue[] = [];
  const items: ParsedQuestion[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { items, issues: [{ line: 1, message: `JSON inválido: ${(error as Error).message}` }] };
  }
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && raw !== null && Array.isArray((raw as { questions?: unknown[] }).questions)
      ? (raw as { questions: unknown[] }).questions
      : null;
  if (!list) {
    return { items, issues: [{ line: 1, message: 'Se esperaba un array o un objeto con la clave «questions».' }] };
  }

  list.forEach((entry, position) => {
    const line = position + 1;
    if (typeof entry !== 'object' || entry === null) {
      issues.push({ line, message: 'Cada pregunta debe ser un objeto.' });
      return;
    }
    const record = entry as Record<string, unknown>;
    const certId = String(record.certId ?? options.defaultCertId ?? '').trim();
    const prompt = String(record.prompt ?? '').trim();
    const options_ = Array.isArray(record.options) ? record.options.map((value) => String(value).trim()) : [];
    const correctRaw = record.correct ?? record.correctIndex ?? record.answer;
    const correctIndex =
      typeof correctRaw === 'number' ? correctRaw : correctRaw === undefined ? null : parseCorrectValue(String(correctRaw));

    if (!certId) {
      issues.push({ line, message: 'Falta certId.' });
      return;
    }
    if (!prompt) {
      issues.push({ line, message: 'Falta el enunciado (prompt).' });
      return;
    }
    if (options_.filter((value) => value.length > 0).length < 2) {
      issues.push({ line, message: 'Se necesitan al menos dos opciones.' });
      return;
    }
    if (correctIndex === null || correctIndex < 0 || correctIndex >= options_.length) {
      issues.push({ line, message: '«correct» no apunta a una opción válida.' });
      return;
    }

    items.push({
      certId,
      domainId: normalizeDomain(
        certId,
        String(record.domainId ?? record.domain ?? ''),
        options.certifications,
      ),
      prompt,
      options: options_.filter((value) => value.length > 0),
      correctIndex: typeof correctRaw === 'number' ? correctRaw : (correctIndex as number),
      explanation: String(record.explanation ?? '').trim(),
      source: String(record.source ?? '').trim() || 'Importado',
      tags: Array.isArray(record.tags) ? record.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    });
  });

  return { items, issues };
}

/** Convierte lo parseado en registros listos para Dexie (ids deterministas por contenido). */
export function buildQuestions(
  parsed: ParsedQuestion[],
  now: Date,
  existing: Question[] = [],
  idPrefix = 'q',
): Question[] {
  const known = new Set(existing.map((question) => fingerprint(question)));
  return parsed
    .map((item, index) => {
      const question: Question = {
        id: `${idPrefix}-${now.getTime().toString(36)}-${index}`,
        certId: item.certId,
        domainId: item.domainId,
        prompt: item.prompt,
        options: item.options,
        correctIndex: item.correctIndex,
        explanation: item.explanation,
        source: item.source,
        tags: item.tags,
        createdAt: now.toISOString(),
      };
      return question;
    })
    .filter((question) => {
      const key = fingerprint(question);
      if (known.has(key)) return false; // no duplica al reimportar
      known.add(key);
      return true;
    });
}

function fingerprint(question: Pick<Question, 'certId' | 'prompt'>): string {
  return `${question.certId}::${question.prompt.trim().toLowerCase()}`;
}

/** PRNG determinista (mulberry32) para que los tests y los simulacros sean reproducibles. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PickInput {
  questions: Question[];
  cert: Certification;
  count: number;
  /** Semilla del PRNG; por defecto el tamaño del banco (estable entre llamadas). */
  seed?: number;
}

export interface PickResult {
  questions: Question[];
  /** Reparto pedido por dominio (pesos del examen) frente al disponible. */
  requestedByDomain: { domainId: string; requested: number; available: number }[];
  /** true si no había preguntas suficientes y el simulacro sale más corto. */
  short: boolean;
}

/**
 * Reparte las preguntas por dominio según los pesos del examen (resto mayor) y
 * rellena los huecos con lo que quede del banco. Nunca inventa preguntas.
 */
export function pickMockQuestions(input: PickInput): PickResult {
  const { cert } = input;
  const pool = input.questions.filter(
    (question) => question.certId === cert.id && !question.archived,
  );
  const count = Math.min(input.count, pool.length);
  const random = mulberry32(input.seed ?? pool.length + count);

  const byDomain = new Map<string, Question[]>();
  for (const question of pool) {
    const key = question.domainId ?? 'sin-dominio';
    byDomain.set(key, [...(byDomain.get(key) ?? []), question]);
  }

  const domains = cert.domains.map((domain) => ({
    id: domain.id,
    weight: domain.weight,
    available: (byDomain.get(domain.id) ?? []).length,
  }));

  // Resto mayor sobre los pesos del examen.
  const raw = domains.map((domain) => ({ id: domain.id, exact: domain.weight * count }));
  const allocation = raw.map((entry) => ({ id: entry.id, value: Math.floor(entry.exact), rest: entry.exact }));
  let assigned = allocation.reduce((sum, entry) => sum + entry.value, 0);
  const byRest = [...allocation].sort((a, b) => b.rest - Math.floor(b.rest) - (a.rest - Math.floor(a.rest)));
  for (const entry of byRest) {
    if (assigned >= count) break;
    entry.value += 1;
    assigned += 1;
  }

  const chosen: Question[] = [];
  const requested: PickResult['requestedByDomain'] = [];
  for (const domain of domains) {
    const ask = allocation.find((entry) => entry.id === domain.id)?.value ?? 0;
    const available = [...(byDomain.get(domain.id) ?? [])];
    const take = Math.min(ask, available.length);
    requested.push({ domainId: domain.id, requested: ask, available: available.length });
    for (let index = 0; index < take; index += 1) {
      const pick = available.splice(Math.floor(random() * available.length), 1)[0];
      if (pick) chosen.push({ ...pick });
    }
  }

  // Huecos: sin dominio asignado y dominios sin peso (o con déficit).
  if (chosen.length < count) {
    const used = new Set(chosen.map((question) => question.id));
    const rest = pool.filter((question) => !used.has(question.id));
    while (chosen.length < count && rest.length > 0) {
      const pick = rest.splice(Math.floor(random() * rest.length), 1)[0];
      if (pick) chosen.push({ ...pick });
    }
  }

  // Orden barajado para no agrupar por dominio.
  for (let index = chosen.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const tmp = chosen[index];
    chosen[index] = chosen[swap];
    chosen[swap] = tmp;
  }

  return { questions: chosen, requestedByDomain: requested, short: pool.length < input.count };
}

export interface MockAnswer {
  question: Question;
  chosenIndex: number | null;
}

export interface MockScore {
  correct: number;
  total: number;
  breakdown: { domainId: string; correct: number; total: number }[];
}

/** Corrige un simulacro y devuelve el desglose por dominio que guarda `attempts`. */
export function scoreMock(answers: MockAnswer[]): MockScore {
  const totals = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  for (const answer of answers) {
    const domainId = answer.question.domainId ?? 'sin-dominio';
    const bucket = totals.get(domainId) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (answer.chosenIndex === answer.question.correctIndex) {
      bucket.correct += 1;
      correct += 1;
    }
    totals.set(domainId, bucket);
  }
  return {
    correct,
    total: answers.length,
    breakdown: [...totals.entries()].map(([domainId, value]) => ({ domainId, ...value })),
  };
}

/** Preguntas disponibles por dominio (para la UI del banco). */
export function questionsByDomain(questions: Question[], cert: Certification): { domainId: string; name: string; count: number }[] {
  return cert.domains.map((domain) => ({
    domainId: domain.id,
    name: domain.name,
    count: questions.filter((question) => question.certId === cert.id && question.domainId === domain.id && !question.archived)
      .length,
  }));
}
