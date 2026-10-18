import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getDb } from '@/data/db';
import { loadDemoData } from '@/data/seed';
import { DashboardPage } from '../DashboardPage';

describe('DashboardPage (render)', () => {
  it('pinta hero, 4 KPIs, heatmap y próximos pasos con datos de ejemplo', async () => {
    await loadDemoData(getDb(), new Date());
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Inicio'));
    await screen.findByText('Certificación activa');

    expect(screen.getByText('Horas esta semana')).toBeTruthy();
    expect(screen.getByText('Racha')).toBeTruthy();
    expect(screen.getByText('Simulacros aprobados')).toBeTruthy();
    expect(screen.getByText('Gasto real')).toBeTruthy();
    expect(screen.getByRole('img', { name: /120 días/ })).toBeTruthy();
    expect(screen.getByText('Próximos pasos')).toBeTruthy();
    expect(screen.getByText('¿Cómo se calcula?')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Abrir ficha/ })).toBeTruthy();
  });
});
