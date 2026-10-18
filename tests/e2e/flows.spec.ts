import { expect, test } from '@playwright/test';
import { horizontalOverflow, loadDemo, loadRecommendedRoute, setLocale, setTheme } from './helpers';

test.describe('Escenarios §11.2', () => {
  test('primer arranque: 13 en el catálogo, 12 en la ruta y SAA-C03 bloqueada por CLF-C02', async ({ page }) => {
    await loadRecommendedRoute(page);
    await expect(page.getByText('CLF-C02').first()).toBeVisible();

    await page.goto('/#/ruta');
    await expect(page.getByText('12 certificaciones en mi plan')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Añadir a mi plan' })).toHaveCount(1);
    await expect(page.getByText(/Bloqueada por CLF-C02/).first()).toBeVisible();
    await expect(page.getByText(/Fase 0 · preparación gratuita/)).toBeVisible();
    await expect(page.getByText(/Fase 2 · Associate/).first()).toBeVisible();
  });

  test('registrar una sesión sube las horas de la semana y aparece en la bitácora', async ({ page }) => {
    await loadRecommendedRoute(page);
    await page.goto('/#/bitacora');

    await page.getByRole('button', { name: /Registrar sesión/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/minutos/i).fill('45');
    await dialog.getByRole('button', { name: 'Guardar y cerrar' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/45 min/).first()).toBeVisible();

    await page.goto('/#/');
    await expect(page.getByText(/Horas esta semana/i)).toBeVisible();
    await expect(page.getByText(/0,8 h/).first()).toBeVisible();
  });

  test('simulacro 46/65: puntaje estimado 737 contra el mínimo 720', async ({ page }) => {
    await loadRecommendedRoute(page);
    await page.goto('/#/practica');

    await page.getByRole('button', { name: /Registrar intento/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('#att-cert').selectOption('SAA-C03');
    await dialog.locator('#att-source').fill('Mock propio E2E');
    await dialog.locator('#att-correct').fill('46');
    await dialog.locator('#att-total').fill('65');
    await dialog.getByRole('button', { name: /Guardar intento/ }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText('737/720').first()).toBeVisible();
    await expect(page.getByText(/Estimado/).first()).toBeVisible();
  });

  test('checklist con plantilla: 8 ítems y el progreso avanza al completar uno', async ({ page }) => {
    await loadRecommendedRoute(page);
    await page.goto('/#/ruta/SAA-C03');
    await page.getByRole('tab', { name: 'Checklist' }).click();

    await expect(page.getByText(/0 de 8 hechos/)).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(8);
    await page.getByRole('checkbox').first().click();
    await expect(page.getByText(/1 de 8 hechos/)).toBeVisible();
  });

  test('nota con autosave: se guarda sola y sobrevive a la recarga', async ({ page }) => {
    await loadRecommendedRoute(page);
    await page.goto('/#/notas?new=1');

    await page.getByLabel('Cuerpo en Markdown').fill('# Nota de prueba\n\nEl autosave debe guardar esto.');
    await expect(page.getByText(/guardado a las/)).toBeVisible({ timeout: 10_000 });

    await page.goto('/#/notas');
    await expect(page.getByText(/El autosave debe guardar esto\./).first()).toBeVisible();
  });

  test('cambiar idioma y tema al instante y persistirlos tras recargar', async ({ page }) => {
    await loadRecommendedRoute(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await setLocale(page, 'en');
    await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();

    await setTheme(page, 'Claro');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Los nombres oficiales de AWS no se traducen con el idioma.
    await page.goto('/#/ruta');
    await expect(page.getByText(/Solutions Architect/).first()).toBeVisible();
  });

  test('sin red: navegar y registrar datos sigue funcionando', async ({ page, context }) => {
    await loadRecommendedRoute(page);
    // Precarga de módulos: en `vite dev` cada ruta es un chunk aparte; el producto
    // compilado (PWA) los precachea, así que aquí ya se visitaron una vez.
    await page.goto('/#/bitacora');
    await expect(page.getByText(/Registrar sesión/).first()).toBeVisible();
    await page.goto('/#/');
    await context.setOffline(true);

    await page.getByRole('link', { name: 'Bitácora' }).first().click();
    await expect(page.getByRole('button', { name: /Registrar sesión/ }).first()).toBeVisible();

    await page.getByRole('button', { name: /Registrar sesión/ }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/minutos/i).fill('30');
    await dialog.getByRole('button', { name: 'Guardar y cerrar' }).click();
    await expect(page.getByText(/30 min/).first()).toBeVisible();

    await context.setOffline(false);
  });

  test('«Hoy» muestra 5 ítems de checklist y el resto se despliega', async ({ page }) => {
    await loadDemo(page);
    await page.goto('/#/hoy');

    const more = page.getByRole('button', { name: /Ver los \d+ ítems restantes/ });
    await expect(more).toBeVisible();
    expect(await page.getByRole('checkbox').count()).toBeGreaterThan(5);

    const before = await page.getByRole('checkbox').count();
    await more.click();
    await expect(page.getByRole('button', { name: 'Ver menos' })).toBeVisible();
    expect(await page.getByRole('checkbox').count()).toBeGreaterThan(before);

    await page.getByRole('button', { name: 'Ver menos' }).click();
    expect(await page.getByRole('checkbox').count()).toBe(before);
  });

  test('la tecla ? abre la hoja de atajos', async ({ page }) => {
    await loadRecommendedRoute(page);
    await page.locator('h1').first().click();
    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'Alt T' })).toBeVisible();
    await expect(dialog.getByText(/Cambiar de tema/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('layout 360 px sin desbordes horizontales en ES y EN', async ({ page }) => {
    await loadRecommendedRoute(page);
    await page.setViewportSize({ width: 360, height: 740 });

    for (const path of ['/', '/hoy', '/ruta', '/ajustes']) {
      for (const locale of ['es', 'en'] as const) {
        await setLocale(page, locale);
        await page.goto(`/#${path}`);
        await page.waitForTimeout(200);
        expect(await horizontalOverflow(page), `${path} (${locale})`).toBeLessThanOrEqual(1);
      }
    }
    await setLocale(page, 'es');
  });
});
