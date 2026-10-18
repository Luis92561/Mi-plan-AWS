import { z } from 'zod';
import type { GlyphState } from '@/components/ui/primitives';
import type { Certification, Resource, ResourceStatus, ResourceType } from '@/data/types';

/** Tipos y estados en orden de presentación (los valores canónicos no se traducen). */
export const RESOURCE_TYPES = [
  'curso',
  'lab',
  'workshop',
  'badge',
  'practice_questions',
  'practice_exam',
  'video',
  'libro',
  'doc',
] as const satisfies readonly ResourceType[];

export const RESOURCE_STATUSES = [
  'pendiente',
  'en_curso',
  'completado',
  'descartado',
] as const satisfies readonly ResourceStatus[];

/** Valor del filtro «sin certificación» (recursos de la fase 0 gratuita). */
export const CERT_FILTER_NONE = 'none';

export interface ResourceFilters {
  /** `''` todas · `'none'` sin certificación · id de certificación. */
  cert: string;
  /** `''` todos los tipos. */
  type: string;
  cost: 'all' | 'free' | 'paid';
  /** `''` todos los estados. */
  status: string;
}

export const EMPTY_FILTERS: ResourceFilters = { cert: '', type: '', cost: 'all', status: '' };

export function hasActiveFilters(filters: ResourceFilters): boolean {
  return filters.cert !== '' || filters.type !== '' || filters.cost !== 'all' || filters.status !== '';
}

/** Filtra por certificación, tipo, gratis/pago y estado. */
export function filterResources(list: Resource[], filters: ResourceFilters): Resource[] {
  return list.filter((resource) => {
    if (filters.cert === CERT_FILTER_NONE && resource.certId !== null) return false;
    if (filters.cert !== '' && filters.cert !== CERT_FILTER_NONE && resource.certId !== filters.cert) return false;
    if (filters.type !== '' && resource.type !== filters.type) return false;
    if (filters.cost === 'free' && !resource.isFree) return false;
    if (filters.cost === 'paid' && resource.isFree) return false;
    if (filters.status !== '' && resource.status !== filters.status) return false;
    return true;
  });
}

const STATUS_WEIGHT: Record<ResourceStatus, number> = {
  en_curso: 0,
  pendiente: 1,
  completado: 2,
  descartado: 3,
};

/** Orden estable: certificación (código), estado de trabajo y título. */
export function sortResources(list: Resource[], certifications: Certification[]): Resource[] {
  const codeOf = (certId: string | null): string =>
    certId === null ? '' : (certifications.find((cert) => cert.id === certId)?.code ?? certId);
  return [...list].sort((a, b) => {
    const codeA = codeOf(a.certId);
    const codeB = codeOf(b.certId);
    if (codeA !== codeB) return codeA.localeCompare(codeB);
    const weightA = STATUS_WEIGHT[a.status];
    const weightB = STATUS_WEIGHT[b.status];
    if (weightA !== weightB) return weightA - weightB;
    return a.title.localeCompare(b.title);
  });
}

export interface ResourceCertTotal {
  certId: string | null;
  code: string | null;
  done: number;
  total: number;
}

/** Completados / total por certificación; los descartados no cuentan (§7.3). */
export function totalsByCert(list: Resource[], certifications: Certification[]): ResourceCertTotal[] {
  const buckets = new Map<string, { certId: string | null; done: number; total: number }>();
  for (const resource of list) {
    if (resource.status === 'descartado') continue;
    const key = resource.certId ?? CERT_FILTER_NONE;
    const bucket = buckets.get(key) ?? { certId: resource.certId, done: 0, total: 0 };
    bucket.total += 1;
    if (resource.status === 'completado') bucket.done += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.values()]
    .map((bucket) => ({
      certId: bucket.certId,
      code:
        bucket.certId === null
          ? null
          : (certifications.find((cert) => cert.id === bucket.certId)?.code ?? bucket.certId),
      done: bucket.done,
      total: bucket.total,
    }))
    .sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''));
}

/** Glifo de estado: siempre acompañado de texto (§9.6). */
export function resourceGlyph(status: ResourceStatus): GlyphState {
  switch (status) {
    case 'completado':
      return 'hecho';
    case 'en_curso':
      return 'enCurso';
    case 'descartado':
      return 'bloqueado';
    default:
      return 'pendiente';
  }
}

/* ------------------------------------------------------ formulario (zod) --- */

export interface ResourceFormMessages {
  required: string;
  invalidUrl: string;
  invalidCost: string;
  invalidMinutes: string;
}

const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;

function isNonNegative(value: string): boolean {
  if (value.trim() === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isWholeMinutes(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && Number.isInteger(parsed);
}

export function resourceFormSchema(messages: ResourceFormMessages) {
  return z
    .object({
      title: z.string().trim().min(1, messages.required),
      certId: z.string(),
      provider: z.string().trim().min(1, messages.required),
      url: z.string().trim().min(1, messages.required).regex(URL_RE, messages.invalidUrl),
      type: z.enum(RESOURCE_TYPES),
      isFree: z.boolean(),
      cost: z.string(),
      domainIds: z.array(z.string()),
      status: z.enum(RESOURCE_STATUSES),
      estimatedMin: z.string(),
      note: z.string(),
    })
    .superRefine((values, ctx) => {
      if (!values.isFree && !isNonNegative(values.cost)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cost'], message: messages.invalidCost });
      }
      if (values.estimatedMin.trim() !== '' && !isWholeMinutes(values.estimatedMin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['estimatedMin'],
          message: messages.invalidMinutes,
        });
      }
    });
}

export type ResourceFormValues = z.infer<ReturnType<typeof resourceFormSchema>>;

export function toResourceFormValues(resource: Resource | null, defaultCertId?: string): ResourceFormValues {
  if (!resource) {
    return {
      title: '',
      certId: defaultCertId ?? '',
      provider: '',
      url: '',
      type: 'curso',
      isFree: true,
      cost: '0',
      domainIds: [],
      status: 'pendiente',
      estimatedMin: '',
      note: '',
    };
  }
  return {
    title: resource.title,
    certId: resource.certId ?? '',
    provider: resource.provider,
    url: resource.url,
    type: resource.type,
    isFree: resource.isFree,
    cost: String(resource.costUsd),
    domainIds: [...resource.domainIds],
    status: resource.status,
    estimatedMin: resource.estimatedMin === null ? '' : String(resource.estimatedMin),
    note: resource.note,
  };
}

/** Valores del formulario → fila de `resources`. Un recurso gratis no suma gasto. */
export function toResource(values: ResourceFormValues, id: string): Resource {
  const cost = Number(values.cost);
  return {
    id,
    certId: values.certId === '' ? null : values.certId,
    title: values.title.trim(),
    provider: values.provider.trim(),
    url: values.url.trim(),
    type: values.type,
    isFree: values.isFree,
    costUsd: values.isFree ? 0 : Math.round((Number.isFinite(cost) ? Math.max(0, cost) : 0) * 100) / 100,
    domainIds: values.certId === '' ? [] : values.domainIds,
    status: values.status,
    estimatedMin: values.estimatedMin.trim() === '' ? null : Math.round(Number(values.estimatedMin)),
    note: values.note.trim(),
  };
}
