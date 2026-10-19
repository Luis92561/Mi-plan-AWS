import { expect, type Page } from '@playwright/test';

/** Nombres accesibles que ya existen en el diccionario (idioma español). */
export const T = {
  loadRoute: 'Cargar ruta recomendada',
  loadDemo: 'Cargar datos de ejemplo',
  logSession: 'Registrar sesión',
  saveAndClose: 'Guardar y cerrar',
  navInicio: 'Inicio',
  navHoy: 'Hoy',
  navRuta: 'Ruta',
  navNotas: 'Notas',
  navBitacora: 'Bitácora',
  navPractica: 'Práctica',
  navAjustes: 'Ajustes',
} as const;

/** Primer arranque: carga la ruta recomendada desde el estado vacío del dashboard. */
export async function loadRecommendedRoute(page: Page): Promise<void> {
  await page.goto('/');
  const cta = page.getByRole('button', { name: T.loadRoute });
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page.getByText(/certificación activa/i).first()).toBeVisible();
}

/** Carga los datos de ejemplo desde Ajustes. */
export async function loadDemo(page: Page): Promise<void> {
  await page.goto('/');
  const empty = page.getByRole('button', { name: T.loadDemo });
  const visible = await empty
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (visible) {
    await empty.click();
  } else {
    await page.goto('/#/ajustes');
    await page.getByRole('button', { name: T.loadDemo }).first().click();
    await page.goto('/');
  }
  // El dashboard ya tiene datos cuando aparece la tarjeta de certificación activa.
  await expect(page.getByText(/certificación activa/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('CLF-C02').first()).toBeVisible({ timeout: 30_000 });
}

export async function setLocale(page: Page, locale: 'es' | 'en'): Promise<void> {
  // El conmutador de la cabecera se llama «es» / «en» (la mayúscula es solo CSS).
  await page
    .getByRole('banner')
    .getByRole('button', { name: new RegExp(`^${locale}$`, 'i') })
    .first()
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
}

const THEME_WORDS: Record<'Oscuro' | 'Claro' | 'Sistema', [string, string]> = {
  Oscuro: ['Oscuro', 'Dark'],
  Claro: ['Claro', 'Light'],
  Sistema: ['Sistema', 'System'],
};

/**
 * Cambia el tema desde el menú de la cabecera. Los ítems del menú llevan un
 * glifo delante («● Oscuro»), así que se busca por texto y se ignora el ítem
 * del atajo (Alt+T).
 */
export async function setTheme(page: Page, theme: 'Oscuro' | 'Claro' | 'Sistema'): Promise<void> {
  await page.getByRole('button', { name: /(Tema|Theme):/ }).click();
  const items = page.getByRole('menuitem');
  const words = THEME_WORDS[theme];
  const count = await items.count();
  for (let index = 0; index < count; index += 1) {
    const item = items.nth(index);
    const text = (await item.innerText()).replace(/\s+/g, ' ').trim();
    if (text.includes(words[0]) || text.includes(words[1])) {
      await item.click();
      await expect(page.getByRole('menuitem')).toHaveCount(0);
      return;
    }
  }
  await page.keyboard.press('Escape');
  throw new Error(`No se encontró el ítem de tema «${theme}» en el menú de la cabecera`);
}

/** Diferencia entre el ancho del documento y el viewport (0 = sin desbordes). */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/* ------------------------------------------------------- fechas del producto */

/** Nombre de la base IndexedDB de la app (mismo valor que `src/data/db.ts`). */
export const DB_NAME = 'miplan-aws';

/**
 * Fecha de hoy (`YYYY-MM-DD`) en la zona del producto. `America/Bogota` no tiene
 * horario de verano, así que basta con desplazar 5 h el reloj del proceso.
 */
export function bogotaToday(): string {
  return new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
}

/** Suma días a una fecha `YYYY-MM-DD` sin tocar la zona horaria. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const base = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * Revierte un ISO a la fecha `YYYY-MM-DD` que representa en la zona del producto.
 * Necesario porque el dominio guarda instantes UTC (`dateTimeInTz('19:00')` cae al
 * día siguiente en UTC) y comparar `iso.slice(0, 10)` daría un día de más.
 */
export function toBogotaDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/* ------------------------------------------------------- IndexedDB a mano */

/**
 * Lee un registro de IndexedDB sin pasar por React. Sirve para comprobar lo que
 * quedó **persistido** tras una acción de la UI (no lo que pinta la pantalla).
 */
export async function readDbRecord<T>(page: Page, store: string, id: string): Promise<T | undefined> {
  return page.evaluate(
    async ({ store, id }: { store: string; id: string }): Promise<T | undefined> => {
      const open = indexedDB.open('miplan-aws');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).get(id);
      const row = await new Promise<unknown>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return row as T | undefined;
    },
    { store, id },
  );
}

/** Lee una tabla completa de IndexedDB sin pasar por React. */
export async function readDbRecords<T>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(async (name: string): Promise<T[]> => {
    const open = indexedDB.open('miplan-aws');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const tx = db.transaction(name, 'readonly');
    const request = tx.objectStore(name).getAll();
    const rows = await new Promise<unknown>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return rows as T[];
  }, store);
}
