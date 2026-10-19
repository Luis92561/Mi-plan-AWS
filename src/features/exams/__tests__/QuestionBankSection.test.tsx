import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionBankSection } from '../components/QuestionBankSection';
import { ToastProvider } from '@/components/ui/toast';
import { getDb, resetDbInstanceForTests } from '@/data/db';
import { defaultSettings } from '@/data/seed';
import type { AppState, Certification, Question } from '@/data/types';

const NOW = new Date('2026-10-18T15:00:00.000Z');

const saa: Certification = {
  id: 'SAA-C03',
  code: 'SAA-C03',
  name: 'AWS Certified Solutions Architect – Associate',
  level: 'associate',
  phase: 2,
  priceUsd: 150,
  durationMin: 130,
  questions: 65,
  scoredQuestions: null,
  passingScore: 720,
  domains: [
    { id: 'secure', name: 'Design Secure Architectures', weight: 0.7 },
    { id: 'resilient', name: 'Design Resilient Architectures', weight: 0.3 },
  ],
  prerequisites: [],
  recommendedExperience: '',
  officialUrl: '',
  examGuideUrl: '',
  lifecycle: 'available',
  retirementDate: null,
  verifiedOn: '2026-10-18',
  notes: '',
};

const clf: Certification = {
  ...saa,
  id: 'CLF-C02',
  code: 'CLF-C02',
  name: 'AWS Certified Cloud Practitioner',
  level: 'foundational',
  phase: 1,
  domains: [{ id: 'cloud', name: 'Cloud Concepts', weight: 1 }],
};

function question(overrides: Partial<Question> & { id: string }): Question {
  return {
    certId: 'SAA-C03',
    domainId: 'secure',
    prompt: `Pregunta ${overrides.id}`,
    options: ['uno', 'dos', 'tres', 'cuatro'],
    correctIndex: 0,
    explanation: '',
    source: 'Propio',
    tags: [],
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

function makeState(questions: Question[]): AppState {
  return {
    certifications: [saa, clf],
    planItems: [],
    resources: [],
    studySessions: [],
    attempts: [],
    flashcards: [],
    vouchers: [],
    budgetItems: [],
    topics: [],
    checklistItems: [],
    notes: [],
    reminders: [],
    exportProfiles: [],
    questions,
    settings: { ...defaultSettings(NOW), activeCertId: 'SAA-C03' },
  };
}

function renderBank(state: AppState, onStartMock = vi.fn()) {
  render(
    <ToastProvider>
      <QuestionBankSection state={state} onStartMock={onStartMock} />
    </ToastProvider>,
  );
  return onStartMock;
}

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

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Banco de preguntas (F3.2)', () => {
  it('resume el total por dominio y avisa del dominio sin preguntas', () => {
    renderBank(
      makeState([
        question({ id: 'q1', prompt: 'Claves con KMS' }),
        question({ id: 'q2', prompt: 'Políticas IAM' }),
        question({ id: 'q3', certId: 'CLF-C02', domainId: 'cloud', prompt: 'Concepto de nube' }),
      ]),
    );

    expect(screen.getAllByText('Design Resilient Architectures').length).toBeGreaterThan(0);
    expect(screen.getByText('0 preguntas')).toBeInTheDocument();
    expect(screen.getByText(/Sin preguntas: el reparto ponderado/)).toBeInTheDocument();

    const total = screen.getByText('Activas').parentElement;
    expect(total).not.toBeNull();
    expect(within(total as HTMLElement).getByText('2')).toBeInTheDocument();
  });

  it('previsualiza e importa las preguntas pegadas en JSON', async () => {
    const user = userEvent.setup();
    renderBank(makeState([]));

    const rows = [
      { certId: 'SAA-C03', domainId: 'secure', prompt: 'Pregunta nueva uno', options: ['a', 'b', 'c'], correct: 'B' },
      { certId: 'SAA-C03', prompt: 'Pregunta nueva dos', options: ['a', 'b'], correct: 1 },
    ];

    await user.click(screen.getByLabelText('O pega el contenido'));
    await user.paste(JSON.stringify(rows));

    expect(screen.getByText('Se importarán 2 preguntas')).toBeInTheDocument();
    expect(screen.getByText('Design Secure Architectures · 1')).toBeInTheDocument();
    expect(screen.getByText('Sin dominio · 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Importar' }));

    await waitFor(async () => {
      expect(await getDb().questions.count()).toBe(2);
    });
    expect(await screen.findByText('2 preguntas importadas')).toBeInTheDocument();
  });

  it('bloquea la importación cuando no hay preguntas válidas y lista los avisos por línea', async () => {
    const user = userEvent.setup();
    renderBank(makeState([]));

    const csv = ['certId,prompt,optionA,optionB,correct', 'SAA-C03,"Sin correcta","a","b",Z'].join('\n');
    await user.click(screen.getByLabelText('O pega el contenido'));
    await user.paste(csv);

    expect(screen.getByText('Ninguna pregunta válida todavía: revisa los avisos.')).toBeInTheDocument();
    expect(screen.getByText(/Línea 2:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled();
    expect(await getDb().questions.count()).toBe(0);
  });

  it('edita el enunciado y la opción correcta desde el modal', async () => {
    const user = userEvent.setup();
    const target = question({ id: 'q-edit', prompt: 'Enunciado original' });
    await getDb().questions.bulkPut([target]);
    renderBank(makeState([target]));

    await user.click(screen.getByRole('button', { name: /Editar la pregunta/ }));

    const promptBox = await screen.findByLabelText('Enunciado');
    await user.clear(promptBox);
    await user.type(promptBox, 'Enunciado corregido');
    await user.click(screen.getByRole('radio', { name: 'Marcar la opción 2 como correcta' }));
    await user.click(screen.getByRole('button', { name: 'Guardar pregunta' }));

    await waitFor(async () => {
      const saved = await getDb().questions.get('q-edit');
      expect(saved?.prompt).toBe('Enunciado corregido');
      expect(saved?.correctIndex).toBe(1);
    });
    expect(await screen.findByText('Pregunta actualizada')).toBeInTheDocument();
  });

  it('elimina una pregunta solo después de confirmar', async () => {
    const user = userEvent.setup();
    const target = question({ id: 'q-del', prompt: 'Pregunta a borrar' });
    await getDb().questions.bulkPut([target]);
    renderBank(makeState([target]));

    await user.click(screen.getByRole('button', { name: /Eliminar la pregunta/ }));

    expect(
      await screen.findByText('Se eliminará «Pregunta a borrar». Esta acción no se puede deshacer.'),
    ).toBeInTheDocument();
    expect(await getDb().questions.get('q-del')).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(async () => {
      expect(await getDb().questions.get('q-del')).toBeUndefined();
    });
    expect(await screen.findByText('Pregunta eliminada')).toBeInTheDocument();
  });

  it('filtra el listado por texto libre', async () => {
    const user = userEvent.setup();
    renderBank(
      makeState([
        question({ id: 'q1', prompt: 'Claves con KMS' }),
        question({ id: 'q2', domainId: 'resilient', prompt: 'Réplica multi-AZ' }),
      ]),
    );

    expect(screen.getByText('Réplica multi-AZ')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar'), 'KMS');

    expect(screen.getByText('Claves con KMS')).toBeInTheDocument();
    expect(screen.queryByText('Réplica multi-AZ')).not.toBeInTheDocument();
  });

  it('lanza el simulacro con la certificación del banco', async () => {
    const user = userEvent.setup();
    const onStartMock = renderBank(makeState([question({ id: 'q1', prompt: 'Claves con KMS' })]));

    await user.click(screen.getByRole('button', { name: 'Simulacro con banco' }));

    expect(onStartMock).toHaveBeenCalledWith('SAA-C03');
  });

  it('rechaza un archivo de import mayor que 5 MB sin leerlo (F-04)', async () => {
    const user = userEvent.setup();
    renderBank(makeState([]));

    const big = new File(['x'], 'banco-grande.csv', { type: 'text/csv' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });

    const input = screen.getByLabelText('Elegir archivo') as HTMLInputElement;
    await user.upload(input, big);

    expect(await screen.findByText('El archivo supera el límite de 5 MB.')).toBeInTheDocument();
    // El guard rechaza antes de leer: el área de pegado queda vacía (sin previsualización).
    expect(screen.getByLabelText('O pega el contenido')).toHaveValue('');
    expect(await getDb().questions.count()).toBe(0);
  });

  it('descarga la plantilla CSV desde el estado vacío', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:plantilla');
    // jsdom no implementa la descarga real: se evita la navegación del ancla.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    renderBank(makeState([]));

    expect(screen.getByText('Tu banco está vacío')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Descargar plantilla' })[0]);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Plantilla descargada: preguntas-plantilla.csv')).toBeInTheDocument();
  });
});
