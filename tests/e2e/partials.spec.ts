import { expect, test } from '@playwright/test';
import { addDays, bogotaToday, loadDemo, loadRecommendedRoute, readDbRecords } from './helpers';

/**
 * Parciales de §11.2 que no tienen escenario propio pero sí contrato explícito:
 *
 *  - A: el aviso de retiro de certificaciones con fecha anunciada (§2.2).
 *  - B: un voucher disponible se aplica a la primera certificación pendiente (§8.3).
 *  - C: los ítems de checklist con repetición generan la siguiente instancia (§7.10).
 *  - D: una sesión registrada deja marca en el heatmap de constancia (§7.9).
 */

interface ChecklistRow {
  id: string;
  certId: string;
  title: string;
  done: boolean;
  doneAt: string | null;
  dueDate: string | null;
  recurrence: string;
}

test.describe('Parciales de la corrección', () => {
  test('A · avisa del retiro anunciado de una certificación de la ruta', async ({ page }) => {
    await loadRecommendedRoute(page);

    await page.goto('/#/ruta');
    await expect(page.getByText('Se retira el 31 dic 2026 · ANS-C01')).toBeVisible();

    await page.goto('/#/ruta/ANS-C01');
    await expect(
      page.getByText('Esta certificación se retira el 31 dic 2026. Agenda antes de esa fecha.'),
    ).toBeVisible();
  });

  test('B · el voucher disponible abarata la siguiente certificación pendiente', async ({ page }) => {
    // Los datos de ejemplo traen un voucher del 50 % vigente (aún sin usar).
    await loadDemo(page);
    await page.goto('/#/presupuesto');

    // La página tiene dos tablas con la misma leyenda (proyección y simulador).
    const table = page
      .getByRole('table', { name: 'Coste de la ruta restante por certificación' })
      .first();
    const aiF = table.getByRole('row', { name: /AIF-C01/ });
    const saa = table.getByRole('row', { name: /SAA-C03/ });

    // El voucher de ejemplo (50 %, disponible) cae en AIF-C01, la primera pendiente.
    await expect(aiF.locator('td').nth(1)).toHaveText('100 US$');
    await expect(aiF.locator('td').nth(3)).toHaveText('50 US$');
    await expect(saa.locator('td').nth(1)).toHaveText('150 US$');
    await expect(saa.locator('td').nth(3)).toHaveText('150 US$');

    // Un segundo voucher del 50 %: el formulario ya propone 50 % y «disponible».
    await page.getByRole('button', { name: 'Nuevo voucher' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Etiqueta').fill('Extra de campaña');
    await dialog.getByRole('button', { name: 'Guardar voucher' }).click();
    await expect(page.getByText('Voucher guardado: «Extra de campaña»')).toBeVisible();

    await expect(saa.locator('td').nth(3)).toHaveText('75 US$');
    await expect(aiF.locator('td').nth(3)).toHaveText('50 US$');
  });

  test('C · un ítem de checklist semanal genera la siguiente instancia al completarlo', async ({ page }) => {
    const title = 'Repaso semanal de laboratorios';

    await loadRecommendedRoute(page);
    await page.goto('/#/ruta/SAA-C03');
    await page.getByRole('tab', { name: 'Checklist' }).click();

    const progressText = await page.getByText(/\d+ de \d+ hechos/).first().innerText();
    const total = Number(/de (\d+) hechos/.exec(progressText)?.[1] ?? '0');
    expect(total).toBeGreaterThan(0);

    await page.getByLabel('Título').fill(title);
    await page.locator('#checklist-recurrence').selectOption('semanal');
    await page.getByRole('button', { name: 'Añadir ítem' }).click();
    await expect(page.getByText(title, { exact: true })).toHaveCount(1);
    await expect(page.getByText(`0 de ${total + 1} hechos`)).toBeVisible();

    // Se completa desde «Hoy»: es donde vive el checklist pendiente del día.
    // La ruta sembrada deja más de 100 ítems, así que el ítem propio queda detrás
    // del botón «ver más» (si aún no está en pantalla).
    await page.goto('/#/hoy');
    await page
      .getByRole('button', { name: /Ver los \d+ ítems restantes/ })
      .click({ timeout: 3000 })
      .catch(() => undefined);
    const checkbox = page.getByRole('checkbox', { name: `Marcar hecho «${title}»` });
    await expect(checkbox).toBeVisible();
    // `.click()` y no `.check()`: al completarlo la fila desaparece de «Hoy».
    await checkbox.click();
    await expect(page.getByText(/^Hecho: «Repaso semanal de laboratorios» · siguiente/)).toBeVisible();

    // La pestaña del checklist muestra la instancia hecha y la siguiente, ya agendada:
    // a los `total` de la plantilla se suman el ítem propio y la instancia nueva.
    await page.goto('/#/ruta/SAA-C03');
    await page.getByRole('tab', { name: 'Checklist' }).click();
    await expect(page.getByText(`1 de ${total + 2} hechos`)).toBeVisible();
    // El grupo «personal» pasa a tener una hecha de dos (el `<select>` de repetición
    // también contiene la palabra «Semanal», así que no se cuenta por texto).
    await expect(page.getByText('1/2', { exact: true })).toBeVisible();
    await expect(page.getByText('Semanal', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('checkbox', { name: title })).toHaveCount(2);

    // Y en la base: una hecha (con `doneAt`) y otra pendiente con vencimiento a 7 días.
    const mine = (await readDbRecords<ChecklistRow>(page, 'checklistItems')).filter(
      (item) => item.title === title,
    );
    expect(mine).toHaveLength(2);
    const done = mine.filter((item) => item.done);
    const pending = mine.filter((item) => !item.done);
    expect(done).toHaveLength(1);
    expect(done[0]?.doneAt).toBeTruthy();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.recurrence).toBe('semanal');
    // `completeItem` parte de `doneAt.slice(0, 10)` (UTC) o del vencimiento del ítem:
    // se aceptan las dos fechas posibles para no depender de la hora de ejecución.
    expect([
      addDays(bogotaToday(), 7),
      addDays(new Date().toISOString().slice(0, 10), 7),
    ]).toContain(pending[0]?.dueDate);
  });

  test('D · la sesión registrada hoy marca el heatmap de constancia', async ({ page }) => {
    await loadRecommendedRoute(page);
    await page.goto('/#/bitacora');

    await page.getByRole('button', { name: /Registrar sesión/ }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/minutos/i).fill('45');
    await dialog.getByRole('button', { name: 'Guardar y cerrar' }).click();

    const today = bogotaToday();
    await expect(page.locator(`[aria-label="${today}: 45 min"]`)).toBeVisible();
    // El resumen del heatmap usa horas formateadas: 45 min → «0,8 h».
    await expect(page.getByText('0,8 h en 1 días con sesiones')).toBeVisible();
  });
});
