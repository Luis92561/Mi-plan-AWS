import { downloadBlob } from '@/data/backup';
import type { VaultFile } from '@/domain/obsidian';
import { localDate } from '@/lib/dates';

/**
 * Descarga del vault (§7.12, Anexo C): un `.zip` generado en memoria con
 * `jszip`. Los contenidos se escriben en UTF-8 sin BOM (JSZip no añade BOM) y
 * las rutas ya vienen con `/` desde `buildVault`.
 *
 * `jszip` se carga en un chunk aparte con `import()` dinámico: es la dependencia
 * más pesada y solo hace falta cuando se pulsa «Descargar» (§11.3, bundle
 * inicial ≤250 KB gzip). Sigue siendo local: no hay red.
 */

/** Nombre exigido por la especificación: `miplan-aws-vault-YYYY-MM-DD.zip`. */
export function vaultFilename(now: Date = new Date()): string {
  return `miplan-aws-vault-${localDate(now)}.zip`;
}

export const VAULT_MIME = 'application/zip';

export async function downloadVaultZip(files: VaultFile[], filename: string): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: VAULT_MIME,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  downloadBlob(filename, blob);
}
