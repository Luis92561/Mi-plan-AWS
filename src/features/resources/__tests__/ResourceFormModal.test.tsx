import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceFormModal } from '../components/ResourceFormModal';
import { ToastProvider } from '@/components/ui/toast';
import { getDb, resetDbInstanceForTests } from '@/data/db';

/**
 * Regresión de la clase P-1 de DEV-001/DEV-002: un input numérico cuya escala
 * `min`/`step` no cubre los valores plausibles del usuario (p. ej. 7 minutos)
 * provoca `stepMismatch` y el navegador aborta el `submit` sin avisar.
 *
 * Nota: jsdom **no** implementa constraint validation (probado: `validity`
 * vacío y `checkValidity()` falso incluso en casos válidos), así que aquí se
 * blinda la **causa** —la escala declarada en el DOM— además del flujo completo
 * de guardado. La reproducibilidad del abort en un navegador real corresponde a
 * un E2E en Chromium.
 */

async function resetDatabase(): Promise<void> {
  resetDbInstanceForTests();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('miplan-aws');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  resetDbInstanceForTests();
}

/** Escala nativa de un `input[type=number]`: `min + n·step` (HTML). */
function coversStep(input: HTMLInputElement, value: number): boolean {
  const min = Number(input.min || '0');
  const step = Number(input.step || '1');
  return (value - min) % step === 0;
}

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResourceFormModal — minutos estimados (clase P-1)', () => {
  it('declara una escala min/step que cubre valores enteros no múltiplos de 5', async () => {
    const onOpenChange = vi.fn();
    render(
      <ToastProvider>
        <ResourceFormModal resource={null} onOpenChange={onOpenChange} />
      </ToastProvider>,
    );

    const minutes = (await screen.findByLabelText('Minutos estimados')) as HTMLInputElement;
    expect(minutes.type).toBe('number');
    expect(minutes.min).toBe('0');
    // El blindo: si alguien reintroduce `step={5}`, 7 queda fuera de escala.
    expect(minutes.step).toBe('1');
    expect(coversStep(minutes, 7)).toBe(true);
    expect(coversStep(minutes, 30)).toBe(true);
    expect(coversStep(minutes, 1440)).toBe(true);
  });

  it('guarda un recurso con 7 minutos (valor no múltiplo de 5)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ToastProvider>
        <ResourceFormModal resource={null} onOpenChange={onOpenChange} />
      </ToastProvider>,
    );

    await user.type(await screen.findByLabelText('Título'), 'Curso de S3');
    await user.type(screen.getByLabelText('Proveedor'), 'AWS Skill Builder');
    await user.type(screen.getByLabelText('URL'), 'https://aws.amazon.com/training/');

    const minutes = (await screen.findByLabelText('Minutos estimados')) as HTMLInputElement;
    await user.clear(minutes);
    await user.type(minutes, '7');

    await user.click(screen.getByRole('button', { name: 'Guardar recurso' }));

    // El submit se procesa: el modal se cierra y el valor llega a la persistencia.
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    await waitFor(async () => {
      expect(await getDb().resources.count()).toBe(1);
    });
    const saved = (await getDb().resources.toCollection().first()) as {
      estimatedMin: number | null;
      title: string;
    };
    expect(saved.title).toBe('Curso de S3');
    expect(saved.estimatedMin).toBe(7);
  });
});
