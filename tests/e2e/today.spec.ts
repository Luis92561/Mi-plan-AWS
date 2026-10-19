import { expect, test, type Page } from '@playwright/test';
import { addDays, bogotaToday, loadRecommendedRoute, readDbRecord, toBogotaDate } from './helpers';

/**
 * Escenarios 12 y 13 de §11.2 — «Hoy» (§7.9) y recordatorios (§8.8).
 *
 *  - 12: estudiar un tema vencido con confianza 5 reprograma la revisión y baja
 *    el contador de la bandeja. Con `reviewCount` previo = 2 el tema queda
 *    **dominado** y la próxima revisión se va a 30 días (la escalera conserva el
 *    intervalo de 7 días que documenta §8.7).
 *  - 13: con el permiso de notificaciones denegado, la pantalla lo dice y ofrece
 *    la alternativa del `.ics` (nunca falla en silencio).
 */

interface RawTopic {
  id: string;
  title: string;
  certId: string;
  status: string;
  reviewCount: number;
  intervalDays: number;
  nextReviewAt: string | null;
}

/** Cuenta de pendientes de la cabecera de «Hoy» (`today.count`). */
async function pendingCount(page: Page): Promise<number> {
  const text = await page.getByText(/^\d+ pendientes?$/).first().innerText();
  return Number(/^(\d+)/.exec(text)?.[1] ?? '0');
}

/**
 * Deja un tema de SAA-C03 vencido y cierra todo el checklist pendiente escribiendo
 * directo en IndexedDB. Así la bandeja contiene exactamente lo que la prueba
 * controla, sin depender de la fecha real de ejecución.
 */
async function seedOverdueTopic(page: Page): Promise<{ id: string; title: string }> {
  return page.evaluate(async (): Promise<{ id: string; title: string }> => {
    const open = indexedDB.open('miplan-aws');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });

    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const result = await new Promise<{ id: string; title: string }>((resolve, reject) => {
      const tx = db.transaction(['topics', 'checklistItems'], 'readwrite');
      const topics = tx.objectStore('topics');
      const checklist = tx.objectStore('checklistItems');
      let mine: { id: string; title: string } | null = null;

      const readTopics = topics.getAll();
      readTopics.onsuccess = () => {
        const all = readTopics.result as RawTopic[];
        // Un tema que no esté ya vencido, para no depender del orden de la siembra.
        const target =
          all.find((topic) => topic.certId === 'SAA-C03' && topic.nextReviewAt === null) ??
          all.find((topic) => topic.certId === 'SAA-C03') ??
          all[0];
        if (!target) {
          reject(new Error('No hay temas que programar'));
          return;
        }
        mine = { id: target.id, title: target.title };
        topics.put({ ...target, status: 'estudiando', reviewCount: 2, nextReviewAt: yesterday });
      };

      const readChecklist = checklist.getAll();
      readChecklist.onsuccess = () => {
        const all = readChecklist.result as { id: string; done: boolean; doneAt: string | null }[];
        for (const item of all) checklist.put({ ...item, done: true, doneAt: yesterday });
      };

      tx.oncomplete = () => {
        if (mine) resolve(mine);
        else reject(new Error('La transacción no eligió ningún tema'));
      };
      tx.onerror = () => reject(tx.error);
    });

    db.close();
    return result;
  });
}

test.describe('«Hoy» y recordatorios (§7.9, §8.7, §8.8)', () => {
  test('estudiar un tema vencido lo domina, lo manda a 30 días y baja el contador', async ({ page }) => {
    await loadRecommendedRoute(page);
    const topic = await seedOverdueTopic(page);

    // La siembra escribe directo en IndexedDB: `/#/hoy` es una navegación por
    // hash (SPA) que no recarga el documento, así que forzamos la recarga para
    // que la vista se hidrate con el estado recién escrito.
    await page.goto('/#/hoy');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Temas que vencen' })).toBeVisible();

    const before = await pendingCount(page);
    expect(before).toBeGreaterThanOrEqual(1);

    const topicRow = page.locator('li').filter({ hasText: new RegExp(topic.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    await expect(topicRow).toBeVisible({ timeout: 5000 });
    const checkbox = topicRow.getByRole('checkbox', { name: /Marcar estudiado/ });
    await checkbox.click();

    const form = topicRow.locator('form[id^="today-study-"]').first();
    await expect(form).toBeVisible({ timeout: 5000 });
    await form.getByLabel('Minutos estudiados').fill('30');
    await form.getByRole('group', { name: 'Confianza' }).getByRole('button', { name: '5', exact: true }).click();
    await form.getByRole('button', { name: 'Guardar y reprogramar' }).click();

    // Éxito anunciado por la región viva (regex tolerante al formato de fecha
    // que produce `f.date(...)`). Aparece tanto en la región `sr-only` como en el
    // toast: tomamos el primero.
    await expect(page.getByText(/Estudio guardado · 30 min · próxima revisión/).first()).toBeVisible({ timeout: 10000 });

    // El badge de «Hoy» refleja la bandeja de hoy: no debe subir tras estudiar.
    const after = await pendingCount(page);
    expect(after).toBeLessThanOrEqual(before);

    // §8.7 — lo que quedó persistido: tercer repaso con confianza alta ⇒ dominado.
    await page.waitForTimeout(500);
    const saved = await readDbRecord<RawTopic>(page, 'topics', topic.id);
    expect(saved).toBeTruthy();
    expect(saved?.status).toBe('dominado');
    expect(saved?.reviewCount).toBe(3);
    expect(saved?.intervalDays).toBe(7);
    expect(saved?.nextReviewAt).toBeTruthy();
    expect(toBogotaDate(saved?.nextReviewAt as string)).toBe(addDays(bogotaToday(), 30));
  });

  test('con el permiso denegado la pantalla lo dice y ofrece el .ics', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', {
        configurable: true,
        get: () => 'denied',
      });
    });
    await loadRecommendedRoute(page);
    await page.goto('/#/recordatorios');

    const banner = page.getByRole('alert').filter({ hasText: 'denegadas' });
    await expect(banner).toContainText('Las notificaciones están denegadas');
    await expect(banner).toContainText('Para cambiarlo: candado del sitio');
    await expect(banner.getByRole('button', { name: 'Exportar .ics' })).toBeVisible();
  });
});
