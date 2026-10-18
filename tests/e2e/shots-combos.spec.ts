import { test } from '@playwright/test';
import { join } from 'node:path';
import { loadDemo, setLocale, setTheme } from './helpers';

const SHOTS = join(process.cwd(), 'docs', 'shots');

/**
 * Las cuatro combinaciones de idioma × tema (§11.3). ES-oscuro y EN-claro ya se
 * capturan en `shots.spec.ts`; aquí se completan ES-claro y EN-oscuro.
 */
test('combinaciones ES-claro y EN-oscuro', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await loadDemo(page);

  await setLocale(page, 'es');
  await setTheme(page, 'Claro');
  await page.reload();
  await page.locator('html[data-theme="light"]').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SHOTS, '07-dashboard-es-light.png') });

  await setLocale(page, 'en');
  await setTheme(page, 'Oscuro');
  await page.reload();
  await page.locator('html[data-theme="dark"]').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SHOTS, '08-dashboard-en-dark.png') });
});
