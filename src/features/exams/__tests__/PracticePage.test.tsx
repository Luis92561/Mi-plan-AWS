import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { PracticePage } from '../PracticePage';
import { getDb, resetDbInstanceForTests } from '@/data/db';
import { ensureCatalog } from '@/data/seed';
import { ToastProvider } from '@/components/ui/toast';

async function seedCatalog(): Promise<void> {
  resetDbInstanceForTests();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('miplan-aws');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  resetDbInstanceForTests();
  await ensureCatalog(getDb());
}

beforeEach(async () => {
  await seedCatalog();
});

describe('Práctica (F3.2)', () => {
  it('monta la sección del banco de preguntas dentro de /practica', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <PracticePage />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Banco de preguntas')).toBeInTheDocument();
    expect(screen.getByText('Tu banco está vacío')).toBeInTheDocument();
    expect(screen.getByText(/Solo preguntas propias o de práctica pública/)).toBeInTheDocument();
    expect(screen.getByText('Modo simulacro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simulacro con banco' })).toBeInTheDocument();
  });
});
