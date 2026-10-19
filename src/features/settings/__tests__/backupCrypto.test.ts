import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  encryptBackup,
  decryptBackup,
  MAX_PBKDF2_ITERATIONS,
  PBKDF2_ITERATIONS,
} from '../backupCrypto';

/* jsdom no siempre expone `crypto.subtle`; en Node ≥20 el webcrypto de
   `node:crypto` es un sustituto idéntico para este módulo (sin dependencias
   nuevas). En este entorno (Node 24 + vitest jsdom) el global ya está
   disponible; el respaldo solo cubre el caso contrario. */
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

const PHRASE = 'frase-de-paso-de-prueba';

function parseEncrypted(text: string): Record<string, unknown> {
  return JSON.parse(text) as Record<string, unknown>;
}

describe('backupCrypto (F-05)', () => {
  it('round-trip: cifra y descifra el mismo texto', async () => {
    const original = JSON.stringify({ schemaVersion: 3, topics: [{ id: 't1' }] });
    const encrypted = await encryptBackup(original, PHRASE);
    expect(encrypted.ok).toBe(true);
    if (!encrypted.ok) return;

    const decrypted = await decryptBackup(encrypted.text, PHRASE);
    expect(decrypted).toEqual({ ok: true, text: original });
  }, 20_000);

  it('el archivo cifrado declara el formato y las iteraciones propias', async () => {
    const encrypted = await encryptBackup('{"a":1}', PHRASE);
    expect(encrypted.ok).toBe(true);
    if (!encrypted.ok) return;

    const payload = parseEncrypted(encrypted.text);
    expect(payload.app).toBe('miplan-aws');
    expect(payload.format).toBe('backup-encrypted');
    const kdf = payload.kdf as { name: string; iterations: number };
    expect(kdf.name).toBe('PBKDF2');
    expect(kdf.iterations).toBe(PBKDF2_ITERATIONS);
  }, 20_000);

  it('frase incorrecta → wrongPhrase', async () => {
    const encrypted = await encryptBackup('secreto', PHRASE);
    expect(encrypted.ok).toBe(true);
    if (!encrypted.ok) return;

    const result = await decryptBackup(encrypted.text, 'otra-frase-completamente');
    expect(result).toEqual({ ok: false, reason: 'wrongPhrase' });
  }, 20_000);

  it('dos cifrados del mismo texto usan sal e IV distintos', async () => {
    const text = 'mismo texto, dos archivos distintos';
    const first = await encryptBackup(text, PHRASE);
    const second = await encryptBackup(text, PHRASE);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    const a = parseEncrypted(first.text);
    const b = parseEncrypted(second.text);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  }, 20_000);

  it('archivos con forma inválida → invalidFile (sin derivar clave)', async () => {
    const encrypted = await encryptBackup('texto', PHRASE);
    expect(encrypted.ok).toBe(true);
    if (!encrypted.ok) return;
    const good = parseEncrypted(encrypted.text);

    const brokenJson = ['{no es json', '', JSON.stringify(null), JSON.stringify('cadena')];
    const shapes = [
      ...brokenJson.map((text) => ({ label: 'json roto', text })),
      { label: 'app ajena', text: JSON.stringify({ ...good, app: 'otra-app' }) },
      { label: 'formato ajeno', text: JSON.stringify({ ...good, format: 'otro-formato' }) },
      { label: 'sin sal', text: JSON.stringify({ ...good, salt: '' }) },
      { label: 'sin iv', text: JSON.stringify({ ...good, iv: '' }) },
      { label: 'sin data', text: JSON.stringify({ ...good, data: '' }) },
      { label: 'kdf ausente', text: JSON.stringify({ ...good, kdf: undefined }) },
      { label: 'iteraciones 0', text: JSON.stringify(tweak(good, { iterations: 0 })) },
      { label: 'iteraciones negativas', text: JSON.stringify(tweak(good, { iterations: -1 })) },
      { label: 'iteraciones fraccionarias', text: JSON.stringify(tweak(good, { iterations: 1.5 })) },
    ];

    for (const { label, text } of shapes) {
      const result = await decryptBackup(text, PHRASE);
      expect(result, label).toEqual({ ok: false, reason: 'invalidFile' });
    }
  }, 20_000);

  it('F-01: iterciones abusivas (10¹² y 10⁷+1) se rechazan rápido, sin derivar', async () => {
    const encrypted = await encryptBackup('texto legítimo', PHRASE);
    expect(encrypted.ok).toBe(true);
    if (!encrypted.ok) return;
    const good = parseEncrypted(encrypted.text);

    for (const iterations of [10 ** 12, MAX_PBKDF2_ITERATIONS + 1]) {
      const tampered = JSON.stringify(tweak(good, { iterations }));
      const started = performance.now();
      const result = await decryptBackup(tampered, PHRASE);
      const elapsed = performance.now() - started;
      expect(result).toEqual({ ok: false, reason: 'invalidFile' });
      // Derivar 10¹² iteraciones tomaría horas; ni siquiera 10⁷+1 llega a la
      // derivación. Un tope holgado de 2 s separa "rechazo inmediato" de
      // cualquier intento real de derivación (DoS del hallazgo F-01).
      expect(elapsed).toBeLessThan(2_000);
    }
  }, 20_000);
});

function tweak(
  payload: Record<string, unknown>,
  change: { iterations: number },
): Record<string, unknown> {
  return { ...payload, kdf: { ...(payload.kdf as Record<string, unknown>), ...change } };
}
