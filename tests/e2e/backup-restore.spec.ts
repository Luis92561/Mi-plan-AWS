import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { loadDemo } from './helpers';

/**
 * Escenario 5 de §11.2 — Respaldo y borrado (§7.8).
 *
 *  1. Exportar el respaldo JSON con los datos de ejemplo.
 *  2. «Borrar todo» con doble confirmación (aviso → palabra exacta).
 *  3. Comprobar que la app vuelve al primer arranque (CTA de la ruta recomendada).
 *  4. Importar el respaldo en modo *Reemplazar todo* y verificar que el estado
 *     reexportado es idéntico al original (ignorando `exportedAt`).
 */

interface BackupFile {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  data: Record<string, unknown> & {
    certifications: unknown[];
    questions: unknown[];
    studySessions: unknown[];
    planItems: unknown[];
  };
}

/** La barra lateral evita ambigüedad con la barra inferior móvil (oculta por CSS). */
function sideNav(page: Page) {
  return page.locator('nav').first();
}

async function exportBackup(page: Page): Promise<{ path: string; json: BackupFile }> {
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Exportar JSON' }).first().click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  return { path: path as string, json: JSON.parse(readFileSync(path as string, 'utf8')) as BackupFile };
}

test.describe('Respaldo y borrado (§7.8)', () => {
  test('«Borrar todo» exige doble confirmación y el respaldo restaura el estado exacto', async ({ page }) => {
    await loadDemo(page);
    await page.goto('/#/ajustes');

    // 1) Respaldo de referencia con los datos de ejemplo.
    const original = await exportBackup(page);
    expect(original.json.app).toBe('miplan-aws');
    expect(original.json.data.certifications).toHaveLength(13);
    expect(original.json.data.questions.length).toBeGreaterThan(0);

    // 2) Borrar todo: paso 1 (aviso) → paso 2 (palabra escrita a mano).
    await page.getByRole('button', { name: 'Borrar todo' }).click();
    await page.getByRole('button', { name: 'Entendido, continuar' }).click();
    const confirm = page.getByRole('button', { name: 'Sí, borrar todo' });
    await expect(confirm).toBeDisabled();
    await page.getByLabel('Escribe BORRAR').fill('BORRAR');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page.getByText('Todo borrado. La app empieza de cero.').first()).toBeVisible();

    // 3) La app vuelve al primer arranque: navegación SPA (sin recargar) para no
    //    volver a sembrar el catálogo antes de comprobar el borrado.
    await sideNav(page).getByRole('link', { name: /Inicio/ }).click();
    await expect(page.getByRole('button', { name: 'Cargar ruta recomendada' })).toBeVisible();

    await sideNav(page).getByRole('link', { name: /Ajustes/ }).click();
    const empty = await exportBackup(page);
    expect(empty.json.data.certifications).toHaveLength(0);
    expect(empty.json.data.planItems).toHaveLength(0);
    expect(empty.json.data.studySessions).toHaveLength(0);
    expect(empty.json.data.questions).toHaveLength(0);

    // 4) Importar el respaldo reemplazando todo. El `input` real es `sr-only`.
    await page.locator('input[type="file"][accept*="json"]').setInputFiles(original.path);
    await expect(page.getByText('Revisa antes de importar')).toBeVisible();
    await page.getByRole('radio', { name: /Reemplazar todo/ }).check();
    await page.getByRole('button', { name: 'Importar ahora' }).click();
    await expect(page.getByText(/registros importados/).first()).toBeVisible();

    // 5) Reexportar: el estado restaurado es idéntico al respaldado.
    await sideNav(page).getByRole('link', { name: /Inicio/ }).click();
    await expect(page.getByText(/certificación activa/i).first()).toBeVisible();
    await sideNav(page).getByRole('link', { name: /Ajustes/ }).click();
    const restored = await exportBackup(page);
    expect(restored.json.data).toEqual(original.json.data);
  });
});
