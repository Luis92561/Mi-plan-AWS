import { expect, test } from '@playwright/test';
import { loadDemo } from './helpers';

/**
 * Servidor local del entregable (`scripts/serve.mjs`), que es como se usa la app en
 * Windows y en el Mac. En `localhost` el navegador considera el origen seguro, así que
 * la PWA (service worker) funciona sin certificados.
 *
 * Se ejecuta a petición, con el servidor ya arriba:
 *
 *   npm run serve            # en otra terminal (o `--lan` para el móvil)
 *   LOCAL_URL=http://127.0.0.1:7420 npm run test:server
 */
const LOCAL_URL = process.env.LOCAL_URL;

test.use({ baseURL: LOCAL_URL ?? 'http://127.0.0.1:7420' });
test.skip(!LOCAL_URL, 'Requiere `npm run serve` y la variable LOCAL_URL.');

test('el servidor local sirve la app y registra el service worker', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Cargar ruta recomendada' })).toBeVisible();

  expect(await page.evaluate(() => window.isSecureContext)).toBe(true);

  const active = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active !== null;
  });
  expect(active).toBe(true);

  // La app funciona de punta a punta servida así.
  await loadDemo(page);
  await expect(page.getByText(/certificación activa/i).first()).toBeVisible();
});
