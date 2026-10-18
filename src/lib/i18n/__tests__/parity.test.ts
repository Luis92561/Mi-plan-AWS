import { describe, expect, it } from 'vitest';
import { es } from '../es';
import { en } from '../en';
import { flatDictionaries, interpolate, translate } from '../translate';

function namespacesOf(dict: Record<string, Record<string, string>>): { ns: string; keys: string[] }[] {
  return Object.entries(dict).map(([ns, bucket]) => ({ ns, keys: Object.keys(bucket) }));
}

const esNamespaces = namespacesOf(es as unknown as Record<string, Record<string, string>>);
const enNamespaces = namespacesOf(en as unknown as Record<string, Record<string, string>>);

describe('paridad de diccionarios (§11.1)', () => {
  it('ES y EN tienen exactamente las mismas claves', () => {
    const esKeys = Object.keys(flatDictionaries.es).sort();
    const enKeys = Object.keys(flatDictionaries.en).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it('ningún valor está vacío', () => {
    const empty = Object.entries(flatDictionaries.es)
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);
    const emptyEn = Object.entries(flatDictionaries.en)
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);
    expect(empty).toEqual([]);
    expect(emptyEn).toEqual([]);
  });

  it('cada clave usa las mismas variables {x} en ambos idiomas', () => {
    const vars = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const mismatched = Object.keys(flatDictionaries.es).filter((key) => {
      const a = vars(flatDictionaries.es[key] ?? '');
      const b = vars(flatDictionaries.en[key] ?? '');
      return JSON.stringify(a) !== JSON.stringify(b);
    });
    expect(mismatched).toEqual([]);
  });

  it('no hay claves duplicadas entre namespaces', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const { ns, keys } of esNamespaces) {
      for (const key of keys) {
        if (seen.has(key)) duplicates.push(`${key} (${seen.get(key)} y ${ns})`);
        seen.set(key, ns);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('los mismos namespaces existen en ambos idiomas', () => {
    expect(enNamespaces.map((n) => n.ns).sort()).toEqual(esNamespaces.map((n) => n.ns).sort());
  });

  it('todo plural _one tiene su _other', () => {
    const keys = Object.keys(flatDictionaries.es);
    const orphans = keys.filter((key) => key.endsWith('_one') && !keys.includes(`${key.slice(0, -4)}_other`));
    expect(orphans).toEqual([]);
  });
});

describe('translate', () => {
  it('traduce claves simples en ambos idiomas', () => {
    expect(translate('es', 'nav.hoy')).toBe('Hoy');
    expect(translate('en', 'nav.hoy')).toBe('Today');
  });

  it('interpola variables', () => {
    expect(translate('es', 'common.copied', { n: 42 })).toBe('Copiado · 42 caracteres');
    expect(translate('en', 'common.copied', { n: 42 })).toBe('Copied · 42 characters');
  });

  it('elige el plural con Intl.PluralRules', () => {
    expect(translate('es', 'nav.pendingBadge', { count: 1, n: 1 })).toBe('1 pendiente');
    expect(translate('es', 'nav.pendingBadge', { count: 3, n: 3 })).toBe('3 pendientes');
    expect(translate('en', 'dashboard.streakValue', { count: 1, n: 1 })).toBe('1 day');
    expect(translate('en', 'dashboard.streakValue', { count: 5, n: 5 })).toBe('5 days');
  });

  it('devuelve la clave cuando no existe (nunca revienta la UI)', () => {
    expect(translate('es', 'no.existe')).toBe('no.existe');
  });

  it('interpolate deja intactas las variables sin valor', () => {
    expect(interpolate('hola {name}', {})).toBe('hola {name}');
    expect(interpolate('hola {name}', { name: 'Ana' })).toBe('hola Ana');
  });
});
