import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { RoadmapPage } from '../RoadmapPage';
import { getDb, resetDbInstanceForTests } from '@/data/db';
import { ensureCatalog, loadRecommendedRoute } from '@/data/seed';
import { ToastProvider } from '@/components/ui/toast';

/** Escenario §11.2 «Primer arranque con datos semilla». */
async function seedRoute(): Promise<void> {
  resetDbInstanceForTests();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('miplan-aws');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  resetDbInstanceForTests();
  const db = getDb();
  await ensureCatalog(db);
  await loadRecommendedRoute(db, new Date());
}

function renderRoadmap() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <RoadmapPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await seedRoute();
});

describe('Ruta', () => {
  it('agrupa por fase, arranca con la fase 0 y bloquea SAA-C03 por CLF-C02', async () => {
    renderRoadmap();

    await screen.findByRole('link', { name: 'Abrir la ficha de SAA-C03' });
    expect(screen.getAllByText(/Fase 0 · preparación gratuita/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fase 2 · Associate/).length).toBeGreaterThan(0);
    const locked = screen.getAllByText(/Bloqueada por/);
    expect(locked.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bloqueada por CLF-C02/).length).toBeGreaterThan(0);
  });

  it('ofrece el catálogo fuera del plan y añade la certificación con checklist', async () => {
    const user = userEvent.setup();
    renderRoadmap();

    const addButtons = await screen.findAllByRole('button', { name: 'Añadir a mi plan' });
    expect(addButtons).toHaveLength(1);

    await user.click(addButtons[0]);
    await waitFor(async () => {
      const plan = await getDb().planItems.toArray();
      expect(plan.some((item) => item.certId === 'AIB-C01')).toBe(true);
    });

    const checklist = await getDb().checklistItems.where('certId').equals('AIB-C01').toArray();
    expect(checklist.length).toBe(8);
    const topics = await getDb().topics.where('certId').equals('AIB-C01').toArray();
    expect(topics.length).toBeGreaterThan(0);
  });
});
