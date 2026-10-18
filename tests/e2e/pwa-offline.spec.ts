import { expect, test } from '@playwright/test';
import { loadDemo } from './helpers';

/**
 * Verificación de la PWA contra el build servido con `npm run preview` en :5184.
 * `vite dev` no registra service worker, así que este test se salta por defecto:
 *
 *   npm run build
 *   npx vite preview --port 5184 --strictPort
 *   $env:PWA_URL="http://127.0.0.1:5184"; npm run test:pwa
 */
const PWA_URL = process.env.PWA_URL;

test.use({ baseURL: PWA_URL ?? 'http://127.0.0.1:5184' });

test.skip(!PWA_URL, 'Requiere el build servido con `vite preview` (define PWA_URL).');

test('carga offline tras la primera visita (service worker)', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller != null || navigator.serviceWorker?.ready != null,
    null,
    { timeout: 60_000 },
  );
  await loadDemo(page);
  // Margen para que termine el precache de Workbox.
  await page.waitForTimeout(4000);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText(/certificación activa/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: 'Ruta' }).first()).toBeVisible();
  await context.setOffline(false);
});
