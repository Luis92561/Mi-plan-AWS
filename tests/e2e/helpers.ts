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
