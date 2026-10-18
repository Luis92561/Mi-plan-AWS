import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { loadDemo, loadRecommendedRoute } from './helpers';

test.describe('Exportaciones (§7.12, §7.13, §7.8)', () => {
  test('el vault .zip se descarga y contiene la estructura del Anexo C', async ({ page }) => {
    await loadRecommendedRoute(page);
    await page.goto('/#/exportar');

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: /Descargar|Exportar vault/ }).last().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^miplan-aws-vault-\d{4}-\d{2}-\d{2}\.zip$/);

    const target = await download.path();
    expect(target).toBeTruthy();
    const bytes = readFileSync(target as string);
    expect(bytes.length).toBeGreaterThan(1000);
    // Firma de ZIP
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files).filter((name) => name.endsWith('.md'));
    expect(names.length).toBeGreaterThan(5);

    const routeName = names.find((name) => name.endsWith('_Ruta AWS.md'));
    expect(routeName, `archivos: ${names.slice(0, 6).join(' | ')}`).toBeTruthy();
    expect(names.some((name) => name.includes('SAA-C03') && name.endsWith('Resumen.md'))).toBe(true);
    expect(names.some((name) => name.includes('Dominios/'))).toBe(true);

    // UTF-8 sin BOM y saltos \n en el contenido generado.
    const route = await zip.file(routeName as string)?.async('string');
    expect(route).toBeTruthy();
    expect((route as string).charCodeAt(0)).not.toBe(0xfeff);
    expect((route as string).includes('\r\n')).toBe(false);
  });

  test('el .ics se descarga con VALARM y zona de Bogotá', async ({ page }) => {
    // Con los datos de ejemplo hay temas programados y un examen agendado.
    await loadDemo(page);
    await page.goto('/#/recordatorios');

    const confirm = page.getByRole('checkbox').first();
    await confirm.click();
    await expect(confirm).toHaveAttribute('aria-checked', 'true');

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: /Exportar \.ics/ }).last().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^(miplan-aws[^/]*)?\.ics$/);

    const content = readFileSync((await download.path()) as string, 'utf8');
    expect(content).toContain('BEGIN:VCALENDAR');
    expect(content).toContain('TZID:America/Bogota');
    expect(content).toContain('VALARM');
    expect(content.includes('\r\n')).toBe(true);
  });

  test('el respaldo JSON se exporta con esquema versionado', async ({ page }) => {
    await loadRecommendedRoute(page);
    await page.goto('/#/ajustes');

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: /Exportar JSON/ }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^miplan-aws-\d{4}-\d{2}-\d{2}\.json$/);

    const json = JSON.parse(readFileSync((await download.path()) as string, 'utf8')) as {
      app: string;
      schemaVersion: number;
      data: { certifications: unknown[]; planItems: unknown[] };
    };
    expect(json.app).toBe('miplan-aws');
    expect(json.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(json.data.certifications).toHaveLength(13);
    expect(json.data.planItems).toHaveLength(12);
  });
});
