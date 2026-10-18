import type { VaultFile } from '@/domain/obsidian';

/**
 * Vista previa del vault (§7.12): agrupa los archivos que devuelve `buildVault`
 * por carpeta de certificación y calcula un tamaño aproximado en UTF-8.
 * Funciones puras, sin DOM: el árbol se puede inspeccionar en tests.
 */

export interface VaultFileInfo {
  /** Nombre del archivo con extensión. */
  name: string;
  /** Ruta completa dentro del vault, con `/`. */
  path: string;
  /** Bytes aproximados del contenido ya codificado en UTF-8. */
  bytes: number;
}

export interface VaultSubfolder {
  /** Ruta relativa a la carpeta que la contiene (`Dominios`, `Sesiones/2026`…). */
  name: string;
  files: VaultFileInfo[];
  bytes: number;
}

export interface VaultFolder {
  /** Ruta de la carpeta dentro del vault. */
  key: string;
  /** Último segmento de la ruta, para mostrar. */
  name: string;
  /** Archivos que cuelgan directamente de la carpeta. */
  files: VaultFileInfo[];
  subfolders: VaultSubfolder[];
  bytes: number;
  count: number;
}

export interface VaultOverview {
  /** Archivos sueltos en la raíz exportada (`_Ruta AWS.md`, `_Calendario.md`…). */
  root: VaultFolder | null;
  /** Una entrada por carpeta de certificación. */
  folders: VaultFolder[];
  bytes: number;
  count: number;
}

const ROOT_KEY = '';

function ensureFolder(map: Map<string, VaultFolder>, key: string, name: string): VaultFolder {
  const found = map.get(key);
  if (found) return found;
  const created: VaultFolder = { key, name, files: [], subfolders: [], bytes: 0, count: 0 };
  map.set(key, created);
  return created;
}

function splitPath(path: string): string[] {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function byteLength(text: string): number {
  if (typeof TextEncoder === 'undefined') return text.length;
  return new TextEncoder().encode(text).length;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Agrupa los archivos del vault según la carpeta raíz del perfil. */
export function vaultOverview(files: VaultFile[], folder: string): VaultOverview {
  const rootDepth = splitPath(folder).length;
  const groups = new Map<string, VaultFolder>();
  let bytes = 0;

  for (const file of files) {
    const segments = splitPath(file.path);
    if (segments.length === 0) continue;
    const name = segments[segments.length - 1] ?? file.path;
    const dirs = segments.slice(0, -1);
    const size = byteLength(file.content);
    bytes += size;
    const info: VaultFileInfo = { name, path: file.path, bytes: size };

    if (dirs.length <= rootDepth) {
      const root = ensureFolder(groups, ROOT_KEY, ROOT_KEY);
      root.files.push(info);
      root.bytes += size;
      root.count += 1;
      continue;
    }

    const key = dirs.slice(0, rootDepth + 1).join('/');
    const folderName = dirs[rootDepth] ?? key;
    const group = ensureFolder(groups, key, folderName);
    group.bytes += size;
    group.count += 1;

    const sub = dirs.slice(rootDepth + 1).join('/');
    if (sub.length === 0) {
      group.files.push(info);
      continue;
    }
    let bucket = group.subfolders.find((item) => item.name === sub);
    if (!bucket) {
      bucket = { name: sub, files: [], bytes: 0 };
      group.subfolders.push(bucket);
    }
    bucket.files.push(info);
    bucket.bytes += size;
  }

  const root = groups.get(ROOT_KEY) ?? null;
  const folders = [...groups.values()]
    .filter((group) => group.key !== ROOT_KEY)
    .sort((a, b) => compareText(a.name, b.name) || compareText(a.key, b.key));

  for (const group of folders) {
    group.files.sort((a, b) => compareText(a.name, b.name));
    group.subfolders.sort((a, b) => compareText(a.name, b.name));
    for (const sub of group.subfolders) {
      sub.files.sort((a, b) => compareText(a.name, b.name));
    }
  }

  const count = files.length;
  return { root, folders, bytes, count };
}

export type SizeUnit = 'b' | 'kb' | 'mb';

export interface SizeParts {
  value: number;
  unit: SizeUnit;
}

/** Tamaño en la unidad más legible, sin formatear (lo formatea la UI con `f.number`). */
export function sizeParts(bytes: number): SizeParts {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safe < 1024) return { value: Math.round(safe), unit: 'b' };
  if (safe < 1024 * 1024) return { value: Math.round((safe / 1024) * 10) / 10, unit: 'kb' };
  return { value: Math.round((safe / (1024 * 1024)) * 10) / 10, unit: 'mb' };
}
