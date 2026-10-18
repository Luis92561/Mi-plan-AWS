import { test } from '@playwright/test';
import { mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDemo, setLocale, setTheme } from './helpers';

const SHOTS = join(process.cwd(), 'docs', 'shots');
const MOCKUPS = join(process.cwd(), 'mockups');

/**
 * Capturas del entregable (§12.3): dashboard ES-oscuro, dashboard EN-claro,
 * «Hoy» en móvil y el editor de notas. Se copian también a `mockups/` con los
 * nombres que cita la especificación §9.1.
 */
test('capturas del entregable', async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  mkdirSync(MOCKUPS, { recursive: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await loadDemo(page);

  // 01 — Dashboard en español, tema oscuro.
  await setLocale(page, 'es');
  await setTheme(page, 'Oscuro');
  await page.goto('/#/');
  await page.getByText(/certificación activa/i).first().waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SHOTS, '01-dashboard-es-dark.png') });
  copyFileSync(join(SHOTS, '01-dashboard-es-dark.png'), join(MOCKUPS, '01-dashboard-dark-es.png'));

  // 02 — Dashboard en inglés, tema claro (recarga para que no queden toasts).
  await setLocale(page, 'en');
  await setTheme(page, 'Claro');
  await page.reload();
  await page.locator('html[data-theme="light"]').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SHOTS, '02-dashboard-en-light.png') });
  copyFileSync(join(SHOTS, '02-dashboard-en-light.png'), join(MOCKUPS, '02-dashboard-light-en.png'));

  // 03 — «Hoy» en móvil, español, oscuro.
  await page.setViewportSize({ width: 390, height: 844 });
  await setLocale(page, 'es');
  await setTheme(page, 'Oscuro');
  await page.goto('/#/hoy');
  await page.reload();
  await page.locator('html[data-theme="dark"]').waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(SHOTS, '03-hoy-mobile-es-dark.png') });
  copyFileSync(join(SHOTS, '03-hoy-mobile-es-dark.png'), join(MOCKUPS, '03-hoy-mobile-dark-es.png'));

  // 04 — Editor de notas en desktop.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#/notas');
  await page.reload();
  await page.waitForTimeout(700);
  const firstNote = page.locator('main a[href*="/notas/"]').first();
  if (await firstNote.isVisible().catch(() => false)) {
    await firstNote.click();
  } else {
    await page.goto('/#/notas?new=1');
    await page.getByLabel('Cuerpo en Markdown').fill(
      '# VPC — Endpoints\n\nLos endpoints de gateway no necesitan ENI; los de interfaz sí.\n\n- [ ] Repasar bucket policies con `aws:SourceVpce`\n',
    );
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(SHOTS, '04-notes-editor-es-dark.png') });

  // 05 — Hoja de atajos (extra de la capa moderna).
  await page.goto('/#/');
  await page.locator('h1').first().click();
  await page.keyboard.press('?');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SHOTS, '05-atajos-es-dark.png') });
  await page.keyboard.press('Escape');

  // 06 — Banco de preguntas (F3.2).
  await page.goto('/#/practica');
  await page.reload();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Simulacro con banco' }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SHOTS, '06-banco-preguntas-es-dark.png') });
});
