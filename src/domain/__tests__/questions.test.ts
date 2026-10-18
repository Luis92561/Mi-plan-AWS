import { describe, expect, it } from 'vitest';
import {
  buildQuestions,
  parseQuestionsCsv,
  parseQuestionsJson,
  pickMockQuestions,
  questionsByDomain,
  scoreMock,
  questionsCsvTemplate,
} from '../questions';
import type { Certification, Question } from '@/data/types';

const cert: Certification = {
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
    { id: 'secure', name: 'Design Secure Architectures', weight: 0.75 },
    { id: 'resilient', name: 'Design Resilient Architectures', weight: 0.25 },
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

const otherCert: Certification = { ...cert, id: 'CLF-C02', code: 'CLF-C02', domains: [{ id: 'cloud', name: 'Cloud Concepts', weight: 1 }] };

const NOW = new Date('2026-10-18T15:00:00.000Z');

function question(overrides: Partial<Question> & { id: string }): Question {
  return {
    certId: 'SAA-C03',
    domainId: 'secure',
    prompt: `Pregunta ${overrides.id}`,
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    explanation: '',
    source: 'Propio',
    tags: [],
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

describe('parseQuestionsCsv', () => {
  it('lee campos entre comillas con comas, comillas dobles y saltos de línea', () => {
    const csv = [
      'certId,domainId,prompt,optionA,optionB,optionC,optionD,correct,explanation,source',
      'SAA-C03,secure,"¿Cuál es la diferencia, ""real"", entre SG y NACL?","a","b","c","d",A,"Una\nlínea más","Propio"',
    ].join('\n');
    const result = parseQuestionsCsv(csv, { certifications: [cert] });
    expect(result.issues).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].prompt).toContain('"real"');
    expect(result.items[0].explanation).toContain('línea más');
    expect(result.items[0].correctIndex).toBe(0);
    expect(result.items[0].domainId).toBe('secure');
  });

  it('acepta la respuesta como número 1–6', () => {
    const csv = [
      'certId,domainId,prompt,optionA,optionB,optionC,correct',
      'SAA-C03,resilient,"¿Pregunta?","a","b","c",3',
    ].join('\n');
    const result = parseQuestionsCsv(csv, { certifications: [cert] });
    expect(result.items[0].correctIndex).toBe(2);
  });

  it('resuelve el dominio por nombre y lo deja en null si no lo reconoce', () => {
    const csv = [
      'certId,domainId,prompt,optionA,optionB,correct',
      'SAA-C03,Design Secure Architectures,"Q1","a","b",A',
      'SAA-C03,Dominio inventado,"Q2","a","b",A',
    ].join('\n');
    const result = parseQuestionsCsv(csv, { certifications: [cert] });
    expect(result.items[0].domainId).toBe('secure');
    expect(result.items[1].domainId).toBeNull();
  });

  it('reporta errores por línea sin abortar el archivo', () => {
    const csv = [
      'certId,prompt,optionA,optionB,correct',
      'SAA-C03,"Bien","a","b",A',
      'SAA-C03,"Sin correcta","a","b",Z',
      ', "Sin cert","a","b",A',
      'SAA-C03,"Solo una opción","a",,A',
      'SAA-C03,"Índice fuera","a","b",D',
    ].join('\n');
    const result = parseQuestionsCsv(csv, { certifications: [cert] });
    expect(result.items).toHaveLength(1);
    expect(result.issues.map((issue) => issue.line)).toEqual([3, 4, 5, 6]);
    expect(result.issues[0].message).toMatch(/correct/);
  });

  it('exige las columnas mínimas', () => {
    const result = parseQuestionsCsv('certId,prompt\nSAA-C03,Hola', { certifications: [cert] });
    expect(result.items).toEqual([]);
    expect(result.issues[0].message).toMatch(/columnas obligatorias/i);
  });

  it('usa la certificación por defecto si falta la columna', () => {
    const csv = ['prompt,optionA,optionB,correct', '"Q","a","b",B'].join('\n');
    const result = parseQuestionsCsv(csv, { certifications: [cert], defaultCertId: 'SAA-C03' });
    expect(result.items[0].certId).toBe('SAA-C03');
    expect(result.items[0].correctIndex).toBe(1);
  });

  it('la plantilla se puede volver a importar sin errores', () => {
    const result = parseQuestionsCsv(questionsCsvTemplate(), { certifications: [cert] });
    expect(result.issues).toEqual([]);
    expect(result.items.length).toBe(2);
  });
});

describe('parseQuestionsJson', () => {
  it('acepta un array y un objeto con «questions»', () => {
    const asArray = parseQuestionsJson(
      JSON.stringify([{ certId: 'SAA-C03', prompt: 'Q', options: ['a', 'b'], correct: 'B' }]),
      { certifications: [cert] },
    );
    expect(asArray.items[0].correctIndex).toBe(1);

    const wrapped = parseQuestionsJson(
      JSON.stringify({ questions: [{ certId: 'SAA-C03', prompt: 'Q2', options: ['a', 'b'], correctIndex: 0 }] }),
      { certifications: [cert] },
    );
    expect(wrapped.items).toHaveLength(1);
    expect(wrapped.items[0].correctIndex).toBe(0);
  });

  it('rechaza JSON inválido o formas inesperadas', () => {
    expect(parseQuestionsJson('{no', { certifications: [cert] }).issues[0].message).toMatch(/JSON inválido/);
    expect(parseQuestionsJson('{"x":1}', { certifications: [cert] }).issues[0].message).toMatch(/array|questions/);
  });

  it('valida cada entrada y sigue con las buenas', () => {
    const result = parseQuestionsJson(
      JSON.stringify([
        { certId: 'SAA-C03', prompt: 'Buena', options: ['a', 'b'], correct: 'A' },
        { certId: 'SAA-C03', prompt: '', options: ['a', 'b'], correct: 'A' },
        { certId: 'SAA-C03', prompt: 'Mala', options: ['a'], correct: 'A' },
        { certId: 'SAA-C03', prompt: 'Fuera', options: ['a', 'b'], correct: 'E' },
      ]),
      { certifications: [cert] },
    );
    expect(result.items).toHaveLength(1);
    expect(result.issues.map((issue) => issue.line)).toEqual([2, 3, 4]);
  });
});

describe('buildQuestions', () => {
  it('no duplica preguntas ya existentes (por certificación + enunciado)', () => {
    const existing = [question({ id: 'q1', prompt: '¿Qué es S3?' })];
    const parsed = [
      { certId: 'SAA-C03', domainId: 'secure', prompt: '¿qué es s3? ', options: ['a', 'b'], correctIndex: 0, explanation: '', source: '', tags: [] },
      { certId: 'SAA-C03', domainId: 'secure', prompt: 'Otra', options: ['a', 'b'], correctIndex: 0, explanation: '', source: '', tags: [] },
    ];
    const built = buildQuestions(parsed, NOW, existing);
    expect(built).toHaveLength(1);
    expect(built[0].prompt).toBe('Otra');
    expect(built[0].id).not.toBe('q1');
  });
});

describe('pickMockQuestions', () => {
  const pool: Question[] = [
    ...Array.from({ length: 6 }, (_, index) => question({ id: `s${index}`, domainId: 'secure', prompt: `S${index}` })),
    ...Array.from({ length: 2 }, (_, index) => question({ id: `r${index}`, domainId: 'resilient', prompt: `R${index}` })),
  ];

  it('reparte por los pesos del examen (75/25 de 8 ⇒ 6 y 2)', () => {
    const result = pickMockQuestions({ questions: pool, cert, count: 8, seed: 7 });
    expect(result.questions).toHaveLength(8);
    const secure = result.questions.filter((item) => item.domainId === 'secure').length;
    const resilient = result.questions.filter((item) => item.domainId === 'resilient').length;
    expect(secure).toBe(6);
    expect(resilient).toBe(2);
    expect(result.short).toBe(false);
  });

  it('es determinista con la misma semilla y cambia con otra', () => {
    const a = pickMockQuestions({ questions: pool, cert, count: 5, seed: 42 }).questions.map((q) => q.id);
    const b = pickMockQuestions({ questions: pool, cert, count: 5, seed: 42 }).questions.map((q) => q.id);
    const c = pickMockQuestions({ questions: pool, cert, count: 5, seed: 43 }).questions.map((q) => q.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('no repite preguntas', () => {
    const ids = pickMockQuestions({ questions: pool, cert, count: 8, seed: 1 }).questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('si hay pocas preguntas devuelve las que hay y marca `short`', () => {
    const result = pickMockQuestions({ questions: pool, cert, count: 20, seed: 3 });
    expect(result.questions).toHaveLength(8);
    expect(result.short).toBe(true);
  });

  it('ignora otras certificaciones y las archivadas', () => {
    const mixed = [
      ...pool,
      question({ id: 'otra', certId: 'CLF-C02', prompt: 'Otra cert' }),
      question({ id: 'arch', domainId: 'secure', archived: true, prompt: 'Archivada' }),
    ];
    const ids = pickMockQuestions({ questions: mixed, cert, count: 20, seed: 5 }).questions.map((q) => q.id);
    expect(ids).not.toContain('otra');
    expect(ids).not.toContain('arch');
  });
});

describe('scoreMock', () => {
  it('cuenta aciertos y desglosa por dominio', () => {
    const answers = [
      { question: question({ id: 'a', domainId: 'secure', correctIndex: 0 }), chosenIndex: 0 },
      { question: question({ id: 'b', domainId: 'secure', correctIndex: 1 }), chosenIndex: 0 },
      { question: question({ id: 'c', domainId: 'resilient', correctIndex: 2 }), chosenIndex: 2 },
      { question: question({ id: 'd', domainId: null, correctIndex: 3 }), chosenIndex: null },
    ];
    const score = scoreMock(answers);
    expect(score.correct).toBe(2);
    expect(score.total).toBe(4);
    expect(score.breakdown).toEqual([
      { domainId: 'secure', correct: 1, total: 2 },
      { domainId: 'resilient', correct: 1, total: 1 },
      { domainId: 'sin-dominio', correct: 0, total: 1 },
    ]);
  });
});

describe('questionsByDomain', () => {
  it('cuenta por dominio y respeta la certificación', () => {
    const rows = questionsByDomain(
      [question({ id: 'a' }), question({ id: 'b' }), question({ id: 'c', certId: 'CLF-C02' })],
      cert,
    );
    expect(rows).toEqual([
      { domainId: 'secure', name: 'Design Secure Architectures', count: 2 },
      { domainId: 'resilient', name: 'Design Resilient Architectures', count: 0 },
    ]);
    expect(otherCert.id).toBe('CLF-C02');
  });
});
