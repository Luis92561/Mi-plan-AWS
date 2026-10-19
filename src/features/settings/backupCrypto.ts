/**
 * Respaldo cifrado con la frase de paso (§7.8, §10) — WebCrypto puro, sin
 * librerías ni red.
 *
 *   clave = PBKDF2-SHA256(frase, sal de 16 bytes, ≥310 000 iteraciones)
 *   criptograma = AES-GCM 256(clave, iv de 12 bytes)   ← el `iv` viaja en el archivo
 *
 * La frase **nunca** se guarda: se usa para derivar la clave en memoria y se
 * descarta al terminar. Si se pierde, el respaldo no se puede recuperar.
 */

/** Mínimo exigido por §10: PBKDF2-SHA256 con al menos 310 000 iteraciones. */
export const PBKDF2_ITERATIONS = 310_000;
/**
 * Tope aceptado al **descifrar** (hallazgo F-01): un `.enc` ajeno no puede
 * forzar una derivación eterna. El cifrado propio sigue emitiendo
 * `PBKDF2_ITERATIONS`; los archivos ya exportados se descifran igual.
 */
export const MAX_PBKDF2_ITERATIONS = 10_000_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const MIN_PHRASE_LENGTH = 8;

const FORMAT = 'backup-encrypted';
const FORMAT_VERSION = 1;
const APP = 'miplan-aws';

export type CryptoFailure = 'unsupported' | 'invalidFile' | 'wrongPhrase';

export type CryptoResult = { ok: true; text: string } | { ok: false; reason: CryptoFailure };

/** Campos que necesita el descifrado, ya validados. */
interface EncryptedPayload {
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

interface EncryptedFileShape {
  app: string;
  format: string;
  version: number;
  exportedAt: string;
  kdf: { name: string; hash: string; iterations: number };
  cipher: { name: string; length: number };
  salt: string;
  iv: string;
  data: string;
}

function subtleOrNull(): SubtleCrypto | null {
  if (typeof globalThis.crypto === 'undefined') return null;
  return globalThis.crypto.subtle ?? null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/** Devuelve un `ArrayBuffer` (no un `Uint8Array`) para que encaje en `BufferSource`. */
function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    view[index] = binary.charCodeAt(index);
  }
  return buffer;
}

async function deriveKey(
  phrase: string,
  salt: BufferSource,
  iterations: number,
): Promise<CryptoKey> {
  const subtle = subtleOrNull();
  if (!subtle) throw new Error('WebCrypto no disponible');
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(phrase.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Cifra un texto (el respaldo JSON) y devuelve el archivo `.json.enc` completo. */
export async function encryptBackup(
  plainText: string,
  phrase: string,
  now: Date = new Date(),
): Promise<CryptoResult> {
  const subtle = subtleOrNull();
  if (!subtle) return { ok: false, reason: 'unsupported' };
  try {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await deriveKey(phrase, salt, PBKDF2_ITERATIONS);
    const cipher = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plainText),
    );
    const payload: EncryptedFileShape = {
      app: APP,
      format: FORMAT,
      version: FORMAT_VERSION,
      exportedAt: now.toISOString(),
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS },
      cipher: { name: 'AES-GCM', length: 256 },
      salt: toBase64(salt),
      iv: toBase64(iv),
      data: toBase64(new Uint8Array(cipher)),
    };
    return { ok: true, text: JSON.stringify(payload, null, 2) };
  } catch {
    return { ok: false, reason: 'unsupported' };
  }
}

function readPayload(text: string): EncryptedPayload | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (value.app !== APP || value.format !== FORMAT) return null;

  const kdf = value.kdf;
  if (typeof kdf !== 'object' || kdf === null) return null;
  const kdfValue = kdf as Record<string, unknown>;
  const iterations = kdfValue.iterations;
  if (kdfValue.name !== 'PBKDF2' || typeof iterations !== 'number') return null;
  // F-01: entero en [1, MAX_PBKDF2_ITERATIONS]. Fuera de rango ⇒ archivo inválido
  // sin llegar a derivar la clave: un `.enc` ajeno no puede forzar una derivación eterna.
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_PBKDF2_ITERATIONS) {
    return null;
  }

  const cipher = value.cipher;
  if (typeof cipher !== 'object' || cipher === null) return null;
  if ((cipher as Record<string, unknown>).name !== 'AES-GCM') return null;

  const salt = value.salt;
  const iv = value.iv;
  const data = value.data;
  if (typeof salt !== 'string' || typeof iv !== 'string' || typeof data !== 'string') return null;
  if (salt.length === 0 || iv.length === 0 || data.length === 0) return null;

  return { iterations, salt, iv, data };
}

/** Descifra un `.json.enc` y devuelve el JSON del respaldo como texto. */
export async function decryptBackup(encryptedText: string, phrase: string): Promise<CryptoResult> {
  const subtle = subtleOrNull();
  if (!subtle) return { ok: false, reason: 'unsupported' };
  const payload = readPayload(encryptedText);
  if (!payload) return { ok: false, reason: 'invalidFile' };

  try {
    const salt = fromBase64(payload.salt);
    const iv = fromBase64(payload.iv);
    const data = fromBase64(payload.data);
    if (salt.byteLength === 0 || iv.byteLength === 0 || data.byteLength === 0) {
      return { ok: false, reason: 'invalidFile' };
    }
    const key = await deriveKey(phrase, salt, payload.iterations);
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return { ok: true, text: new TextDecoder('utf-8').decode(plain) };
  } catch {
    return { ok: false, reason: 'wrongPhrase' };
  }
}
