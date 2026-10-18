import { en } from './en';
import { es } from './es';
import type { TKey } from './shape';
import type { Locale } from '@/data/types';
import { plural } from '../format';

export type Vars = Record<string, string | number | null | undefined>;

/** Diccionarios aplanados: clave global → texto. */
function flatten(dict: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const bucket of Object.values(dict as Record<string, Record<string, string>>)) {
    for (const [key, value] of Object.entries(bucket ?? {})) {
      out[key] = value;
    }
  }
  return out;
}

export const flatDictionaries: Record<Locale, Record<string, string>> = {
  es: flatten(es),
  en: flatten(en),
};

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Traduce `key` al idioma activo.
 *  - Plurales: si `vars.count` existe y hay `clave_one` / `clave_other`, elige con
 *    `Intl.PluralRules` (nunca con `n === 1`).
 *  - Interpolación: `{nombre}`.
 *  - Clave inexistente: devuelve la clave (visible en pantalla) y avisa en desarrollo.
 */
export function translate(locale: Locale, key: string, vars?: Vars): string {
  const dict = flatDictionaries[locale] ?? flatDictionaries.es;
  const count = vars?.count;
  let template: string | undefined;

  if (typeof count === 'number') {
    const rule = plural(locale, count);
    template = dict[`${key}_${rule}`] ?? dict[`${key}_other`] ?? dict[key];
  } else {
    template = dict[key];
  }

  if (template === undefined) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] falta la clave "${key}" en "${locale}"`);
    }
    return key;
  }

  return interpolate(template, vars);
}

/** Verificación de que una cadena es una clave válida del diccionario. */
export function isTKey(key: string): key is TKey {
  return key in flatDictionaries.es;
}

/** Lista de claves de un namespace, para tests y herramientas. */
export function keysOfNamespace(namespace: string): string[] {
  return Object.keys(flatDictionaries.es).filter((k) => k.startsWith(`${namespace}.`));
}
