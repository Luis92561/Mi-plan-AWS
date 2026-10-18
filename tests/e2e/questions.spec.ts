import { expect, test } from '@playwright/test';
import { loadDemo } from './helpers';

/**
 * F3.2 — banco de preguntas propio: importación del CSV de ejemplo y simulacro
 * ponderado guardado como intento normal.
 */
test.describe('Banco de preguntas', () => {
  test('importa un CSV, lo lista y guarda un simulacro con desglose', async ({ page }) => {
    await loadDemo(page);
    await page.goto('/#/practica');

    // Importar el archivo de ejemplo (8 preguntas propias de SAA-C03).
    await page.locator('input[type="file"]').setInputFiles('examples/preguntas-ejemplo.csv');

    // El preview es en línea: aparece el recuento y el botón Importar se habilita.
    await expect(page.getByText(/preguntas-ejemplo\.csv/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Importar' }).click();
    await expect(page.getByText(/CloudFront/).first()).toBeVisible({ timeout: 10_000 });

    // Lanzar el simulacro con banco.
    await page.getByRole('button', { name: 'Simulacro con banco' }).click();
    const setup = page.getByRole('dialog');
    await expect(setup).toBeVisible();
    await setup.getByRole('button', { name: /Iniciar simulacro/ }).click();

    // Responder todas las preguntas.
    const runner = page.getByRole('dialog');
    for (let index = 0; index < 70; index += 1) {
      const radios = runner.getByRole('radio');
      if ((await radios.count()) === 0) break;
      await radios.first().check();
      const next = runner.getByRole('button', { name: 'Siguiente' });
      if ((await next.count()) === 0 || (await next.isDisabled())) break;
      await next.click();
    }

    await runner.getByRole('button', { name: /Finalizar/ }).click();
    // Si quedan preguntas sin responder, aparece una confirmación.
    const confirm = page.getByRole('dialog').last();
    const confirmar = confirm.getByRole('button', { name: /Finalizar|Confirmar/ }).last();
    if (await confirmar.isVisible().catch(() => false)) {
      await confirmar.click();
    }

    // Pantalla de resultado con puntaje estimado y desglose por dominio.
    await expect(page.getByText(/estimado/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Secure|Resilient|Performance|Cost/i).first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText(/Banco propio/).first()).toBeVisible({ timeout: 15_000 });
  });
});
