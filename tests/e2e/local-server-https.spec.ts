import { expect, test } from '@playwright/test';

/**
 * Camino «offline en el móvil»: HTTPS con certificado propio
 * (`npm run cert:lan` + `npm run serve:lan:https`).
 *
 * Aquí se comprueba lo que depende del servidor: que responde por HTTPS en un origen
 * seguro y sirve la app. El registro del service worker con un certificado autofirmado
 * requiere que el dispositivo confíe en él (instalar el `.pem`), paso manual por
 * dispositivo documentado en `docs/DISPOSITIVOS.md` §4; Chromium sin ese paso bloquea
 * el registro, por eso no se exige aquí.
 *
 *   LOCAL_HTTPS_URL=https://127.0.0.1:7443 npm run test:server
 */
const LOCAL_HTTPS_URL = process.env.LOCAL_HTTPS_URL;

test.use({ baseURL: LOCAL_HTTPS_URL ?? 'https://127.0.0.1:7443', ignoreHTTPSErrors: true });
test.skip(!LOCAL_HTTPS_URL, 'Requiere `npm run serve:lan:https` y la variable LOCAL_HTTPS_URL.');

test('HTTPS con certificado propio sirve la app en un origen seguro', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Cargar ruta recomendada' })).toBeVisible();
  expect(await page.evaluate(() => window.isSecureContext)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-theme');
});
