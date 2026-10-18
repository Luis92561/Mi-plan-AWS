import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { CertPage } from '../CertPage';
import { getDb, resetDbInstanceForTests } from '@/data/db';
import { ensureCatalog, loadRecommendedRoute } from '@/data/seed';
import { ToastProvider } from '@/components/ui/toast';

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

function renderCert(certId: string) {
  return render(
    <MemoryRouter initialEntries={[`/ruta/${certId}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/ruta/:certId" element={<CertPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await seedRoute();
});

describe('Detalle de certificación', () => {
  it('muestra la cabecera oficial y las ocho pestañas', async () => {
    renderCert('SAA-C03');

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('Solutions Architect');
    expect(screen.getAllByRole('tab')).toHaveLength(8);
    const guides = screen.getAllByRole('link', { name: /Guía oficial del examen/ });
    expect(guides.length).toBeGreaterThan(0);
    expect(guides[0]).toHaveAttribute('target', '_blank');
    expect(guides[0]).toHaveAttribute('rel', 'noopener');
  });

  it('la pestaña Checklist trae la plantilla de Associate con 8 ítems', async () => {
    const user = userEvent.setup();
    renderCert('SAA-C03');

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Checklist' })).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: 'Checklist' }));

    await waitFor(() => expect(screen.getByText('0 de 8 hechos')).toBeInTheDocument());
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
  });
});
