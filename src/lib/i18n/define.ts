/**
 * Helper para declarar un namespace de traducciones con ES y EN en el mismo archivo.
 * `en` se tipa contra `es`: si falta una clave o sobra otra, la compilación falla.
 */
export interface NamespaceInput<S extends Record<string, string>> {
  ns: string;
  es: S;
  en: { readonly [K in keyof S]: string };
}

export interface Namespace<S extends Record<string, string>> {
  ns: string;
  es: S;
  en: { readonly [K in keyof S]: string };
}

export function defineNamespace<const S extends Record<string, string>>(
  input: NamespaceInput<S>,
): Namespace<S> {
  return input;
}

/** Aplana un namespace a `Record<clave, string>` para el tipo `Dict`. */
export type Flat<S> = { readonly [K in keyof S]: string };
