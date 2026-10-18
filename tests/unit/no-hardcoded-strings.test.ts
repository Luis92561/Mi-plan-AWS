import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * §11.1 — Escaneo heurístico: ningún archivo `.tsx` de `src` debe contener texto
 * visible literal. Todo el texto sale del diccionario (`t()`), salvo glifos
 * decorativos, códigos oficiales de AWS y una lista blanca explícita.
 */
function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      out.push(...tsxFiles(path));
    } else if (path.endsWith('.tsx')) {
      out.push(path);
    }
  }
  return out;
}

/** Glifos, signos y cifras decorativas permitidas. */
const GLYPHS_ONLY = /^[\s·—–\-–—|/•#§❯▲●◐○✓›→↗·()[\]{}:.,;!¡?¿"'%+*&=<>0-9]+$/u;

/** Códigos oficiales de certificación (SAA-C03, CLF-C02, AIB-C01…). */
const CERT_CODE = /^[A-Z]{2,4}-[A-Z0-9]{2,4}$/;

/** Texto permitido tal cual (marcas y atajos que no se traducen). */
const ALLOWED_TEXT = new Set([
  'ES',
  'EN',
  'Ctrl K',
  'Alt+T',
  'AWS',
  'PDF',
  'Markdown',
  'Obsidian',
  'MD',
  'JSON',
  'ICS',
  'BORRAR',
]);

function violations(): string[] {
  const found: string[] = [];
  const textPattern = />([^<>{}]*\p{L}[^<>{}]*)</gu;

  for (const file of tsxFiles('src')) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      textPattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = textPattern.exec(line)) !== null) {
        const text = (match[1] ?? '').trim();
        if (text.length === 0 || text.length > 90) continue;
        // Operadores de comparación y expresiones: no son texto visible.
        if (/[&|]{2}|^=|<|>|===|!==/.test(text)) continue;
        if (GLYPHS_ONLY.test(text)) continue;
        if (CERT_CODE.test(text)) continue;
        if (ALLOWED_TEXT.has(text)) continue;
        found.push(`${file}:${index + 1} → «${text}»`);
      }
    });
  }
  return found;
}

describe('sin cadenas literales en JSX (§11.1)', () => {
  it('todo el texto visible pasa por t()', () => {
    expect(violations()).toEqual([]);
  });
});
