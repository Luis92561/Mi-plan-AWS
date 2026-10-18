import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionMockRunner } from '../components/QuestionMockRunner';
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

function question(id: string, domainId: string): Question {
  return {
    id,
    certId: 'SAA-C03',
    domainId,
    prompt: `Enunciado ${id}`,
    options: ['uno', 'dos', 'tres', 'cuatro'],
    correctIndex: 0,
    explanation: `Porque sí (${id}).`,
    source: 'Propio',
    tags: [],
    createdAt: NOW.toISOString(),
  };
}

function makeState(questions: Question[]): AppState {
  return {
    certifications: [saa],
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

describe('Simulacro con el banco propio (F3.2)', () => {
  it('avisa si hay pocas preguntas, confirma las sin responder y guarda el intento', async () => {
    const user = userEvent.setup();
    const questions = [
      question('q1', 'secure'),
      question('q2', 'secure'),
      question('q3', 'secure'),
      question('q4', 'secure'),
      question('q5', 'resilient'),
      question('q6', 'resilient'),
    ];
    render(
      <ToastProvider>
        <QuestionMockRunner state={makeState(questions)} initialCertId="SAA-C03" onExit={vi.fn()} />
      </ToastProvider>,
    );

    expect(screen.getByText('Solo hay 6 preguntas: el simulacro será más corto.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Iniciar simulacro' }));
    expect(screen.getByText('Pregunta 1 de 6')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'uno' }));
    await user.click(screen.getByRole('button', { name: 'Finalizar' }));

    expect(await screen.findByText('Quedan 5 preguntas sin responder.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sí, finalizar' }));

    expect(await screen.findByText('Resultado del simulacro')).toBeInTheDocument();
    expect(screen.getByText('Revisión pregunta a pregunta')).toBeInTheDocument();

    await waitFor(async () => {
      const attempts = await getDb().attempts.toArray();
      expect(attempts).toHaveLength(1);
      const [attempt] = attempts;
      expect(attempt.kind).toBe('mock');
      expect(attempt.source).toBe('Banco propio');
      expect(attempt.total).toBe(6);
      expect(attempt.notes).toBe('');
      expect(attempt.questionIds).toHaveLength(6);
      expect(attempt.estimatedScore).not.toBeNull();
      expect(attempt.passed).toBe(false);
    });
  });

  it('sale sin guardar con el botón de salida', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(
      <ToastProvider>
        <QuestionMockRunner
          state={makeState([question('q1', 'secure'), question('q2', 'resilient')])}
          initialCertId="SAA-C03"
          onExit={onExit}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Salir sin guardar' }));

    expect(onExit).toHaveBeenCalled();
    expect(await getDb().attempts.count()).toBe(0);
  });
});
