import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Field, Progress, Select } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId } from '@/data/store';
import type { AppState, Attempt, AttemptBreakdown, Question } from '@/data/types';
import { pickMockQuestions, scoreMock, type MockAnswer } from '@/domain/questions';
import { MAX_SCORE, estimatedScore, normalizeAttempt } from '@/domain/scoring';
import { localDate } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/useT';

const COUNT_CHOICES = [5, 10, 20, 65] as const;

type Stage = 'setup' | 'run' | 'result';

interface Session {
  certId: string;
  items: Question[];
  short: boolean;
}

interface Outcome {
  correct: number;
  total: number;
  breakdown: AttemptBreakdown[];
  answers: MockAnswer[];
  durationMin: number;
  estimated: number;
  passed: boolean | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** mm:ss del tiempo transcurrido. */
function clockOf(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

function toneOf(ratio: number): 'ok' | 'warn' | 'err' {
  if (ratio >= 0.8) return 'ok';
  if (ratio >= 0.6) return 'warn';
  return 'err';
}

export interface QuestionMockRunnerProps {
  state: AppState;
  initialCertId: string;
  /** Sale del simulacro sin guardar (también con Esc). */
  onExit: () => void;
}

/**
 * Simulacro con el banco propio (F3.2): elige certificación y tamaño, reparte las
 * preguntas con los pesos de dominio (`pickMockQuestions`), corre a pantalla
 * completa y, al finalizar, guarda un intento `mock` con `normalizeAttempt`.
 */
export function QuestionMockRunner({ state, initialCertId, onExit }: QuestionMockRunnerProps) {
  const { t, f } = useT();
  const { notify } = useToast();

  const exitRef = useRef(onExit);
  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);

  const [stage, setStage] = useState<Stage>('setup');
  const [certId, setCertId] = useState(initialCertId || state.certifications[0]?.id || '');
  const [countChoice, setCountChoice] = useState<number | 'max'>(10);
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<Outcome | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmRef = useRef(confirmOpen);
  useEffect(() => {
    confirmRef.current = confirmOpen;
  }, [confirmOpen]);

  const cert = state.certifications.find((item) => item.id === certId) ?? state.certifications[0];
  const poolSize = cert
    ? state.questions.filter((question) => question.certId === cert.id && !question.archived).length
    : 0;
  const requested = countChoice === 'max' ? Math.max(1, poolSize) : countChoice;

  const preview = useMemo(
    () => (cert ? pickMockQuestions({ questions: state.questions, cert, count: requested }) : null),
    [state.questions, cert, requested],
  );

  const total = session?.items.length ?? 0;
  const current = session?.items[index];
  const answeredCount = answers.filter((answer) => answer !== null).length;
  const unansweredCount = total - answeredCount;
  const resultCert = state.certifications.find((item) => item.id === (session?.certId ?? certId));

  useEffect(() => {
    if (stage !== 'run') return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // El Esc del diálogo de confirmación lo gestiona Radix: no debe salir del simulacro.
      if (confirmRef.current) return;
      exitRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const start = () => {
    if (!cert) return;
    const picked = pickMockQuestions({
      questions: state.questions,
      cert,
      count: requested,
      seed: Date.now(),
    });
    if (picked.questions.length === 0) return;
    setSession({ certId: cert.id, items: picked.questions, short: picked.short });
    setAnswers(picked.questions.map(() => null));
    setIndex(0);
    setElapsed(0);
    setResult(null);
    setSaveError(null);
    setStage('run');
  };

  const choose = (optionIndex: number) => {
    setAnswers((currentAnswers) =>
      currentAnswers.map((value, position) => (position === index ? optionIndex : value)),
    );
  };

  const finalize = async () => {
    if (!session) return;
    setConfirmOpen(false);
    const scoredAnswers: MockAnswer[] = session.items.map((question, position) => ({
      question,
      chosenIndex: answers[position] ?? null,
    }));
    const scored = scoreMock(scoredAnswers);
    const durationMin = Math.max(1, Math.round(elapsed / 60));
    const estimated = estimatedScore(scored.correct, scored.total);
    const passedCert = state.certifications.find((item) => item.id === session.certId);

    setResult({
      correct: scored.correct,
      total: scored.total,
      breakdown: scored.breakdown,
      answers: scoredAnswers,
      durationMin,
      estimated,
      passed: passedCert ? estimated >= passedCert.passingScore : null,
    });
    setStage('result');

    if (!passedCert) return;
    setBusy(true);
    try {
      const draft: Attempt = {
        id: newId('att'),
        certId: passedCert.id,
        date: localDate(),
        kind: 'mock',
        source: t('practice.bankMock.source'),
        correct: scored.correct,
        total: scored.total,
        score: null,
        estimatedScore: null,
        passed: null,
        durationMin,
        costUsd: 0,
        voucherId: null,
        breakdown: scored.breakdown,
        notes: '',
        questionIds: session.items.map((question) => question.id),
      };
      await getDb().attempts.put(normalizeAttempt(draft, passedCert));
      notify(t('practice.bankMock.result.saved'), 'ok');
    } catch (cause) {
      setSaveError(t('practice.bankMock.result.saveError', { message: (cause as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  const requestFinish = () => {
    if (unansweredCount > 0) {
      setConfirmOpen(true);
      return;
    }
    void finalize();
  };

  const again = () => {
    setStage('setup');
    setSession(null);
    setResult(null);
    setSaveError(null);
    setAnswers([]);
    setIndex(0);
    setElapsed(0);
  };

  const domainNameOf = (domainId: string): string =>
    resultCert?.domains.find((domain) => domain.id === domainId)?.name ?? t('practice.bankMock.noDomain');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('practice.bankMock.title')}
      className="fixed inset-0 z-[65] overflow-y-auto bg-bg"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 py-5">
        {stage === 'setup' ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
              <div className="min-w-0">
                <h2 className="text-h2 font-bold">
                  <span aria-hidden="true" className="mr-1.5 text-accent">
                    ❯
                  </span>
                  {t('practice.bankMock.title')}
                </h2>
                <p className="mt-1 max-w-prose text-meta text-muted">
                  {t('practice.bankMock.subtitle', { cert: cert?.code ?? certId })}
                </p>
              </div>
              <Button variant="ghost" onClick={onExit}>
                {t('practice.bankMock.exit')}
              </Button>
            </header>

            <section className="flex flex-col gap-3 rounded-card border border-line bg-panel px-4 py-4">
              <p className="text-meta text-muted">{t('practice.bankMock.setupHint')}</p>

              <Field label={t('practice.bankMock.cert')} htmlFor="bank-mock-cert">
                <Select
                  id="bank-mock-cert"
                  value={cert?.id ?? ''}
                  onChange={(event) => setCertId(event.target.value)}
                >
                  {state.certifications.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <fieldset className="flex flex-col gap-2">
                <legend className="label-mono">{t('practice.bankMock.count')}</legend>
                <div className="flex flex-wrap gap-2">
                  {COUNT_CHOICES.map((value) => (
                    <label
                      key={value}
                      className={cn(
                        'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-input border px-3 text-ui transition-colors duration-hover',
                        countChoice === value
                          ? 'border-accent text-accent'
                          : 'border-line text-text hover:bg-hover',
                      )}
                    >
                      <input
                        type="radio"
                        name="bank-mock-count"
                        className="h-4 w-4 accent-accent"
                        checked={countChoice === value}
                        onChange={() => setCountChoice(value)}
                      />
                      {f.number(value)}
                    </label>
                  ))}
                  <label
                    className={cn(
                      'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-input border px-3 text-ui transition-colors duration-hover',
                      countChoice === 'max'
                        ? 'border-accent text-accent'
                        : 'border-line text-text hover:bg-hover',
                    )}
                  >
                    <input
                      type="radio"
                      name="bank-mock-count"
                      className="h-4 w-4 accent-accent"
                      checked={countChoice === 'max'}
                      onChange={() => setCountChoice('max')}
                    />
                    {t('practice.bankMock.countMax', { count: f.number(poolSize) })}
                  </label>
                </div>
              </fieldset>

              <p className="tnum text-meta text-muted">
                {t('practice.bankMock.available', { count: poolSize })}
              </p>

              {poolSize === 0 ? (
                <p role="status" className="text-meta text-warn">
                  <span aria-hidden="true">▲ </span>
                  {t('practice.bankMock.none', { cert: cert?.code ?? '' })}
                </p>
              ) : null}

              {preview?.short ? (
                <p role="status" className="text-meta text-warn">
                  <span aria-hidden="true">▲ </span>
                  {t('practice.bankMock.short', { count: poolSize })}
                </p>
              ) : null}

              <Button variant="primary" size="lg" glyph onClick={start} disabled={poolSize === 0 || !cert}>
                {t('practice.bankMock.start')}
              </Button>
              <p className="text-meta text-muted">{t('practice.bankMock.exitHint')}</p>
            </section>
          </>
        ) : null}

        {stage === 'run' && session && current ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
              <div className="min-w-0">
                <h2 className="text-h2 font-bold">
                  <span aria-hidden="true" className="mr-1.5 text-accent">
                    ❯
                  </span>
                  {t('practice.bankMock.title')}
                </h2>
                <p className="mt-1 tnum text-meta text-muted">
                  {t('practice.bankMock.progress', { n: index + 1, m: total })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="tnum text-ui"
                  aria-live="off"
                  aria-label={t('practice.bankMock.timerLabel', { time: clockOf(elapsed) })}
                >
                  {t('practice.bankMock.timer')} {clockOf(elapsed)}
                </span>
                <Button variant="ghost" onClick={onExit}>
                  {t('practice.bankMock.exit')}
                </Button>
              </div>
            </header>

            <Progress
              value={answeredCount}
              max={Math.max(1, total)}
              label={t('practice.bankMock.answered', { n: answeredCount, m: total })}
            />

            <section className="flex flex-col gap-3 rounded-card border border-line bg-panel px-4 py-4">
              <p className="label-mono">{t('practice.bankMock.question', { n: index + 1 })}</p>
              <p className="text-body text-text">{current.prompt}</p>
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">{t('practice.bankMock.question', { n: index + 1 })}</legend>
                {current.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className={cn(
                      'flex min-h-[44px] cursor-pointer items-start gap-2 rounded-input border px-3 py-2 text-ui text-text transition-colors duration-hover',
                      answers[index] === optionIndex ? 'border-accent bg-panel-2' : 'border-line hover:bg-hover',
                    )}
                  >
                    <input
                      type="radio"
                      name="bank-mock-option"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                      checked={answers[index] === optionIndex}
                      onChange={() => choose(optionIndex)}
                    />
                    <span className="min-w-0">{option}</span>
                  </label>
                ))}
              </fieldset>
            </section>

            <nav
              aria-label={t('practice.bankMock.title')}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3"
            >
              <Button className="min-h-[44px] sm:min-h-[36px]" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
                {t('practice.bankMock.prev')}
              </Button>
              <Button variant="primary" glyph className="min-h-[44px] sm:min-h-[36px]" onClick={requestFinish} disabled={busy}>
                {t('practice.bankMock.finish')}
              </Button>
              <Button
                className="min-h-[44px] sm:min-h-[36px]"
                onClick={() => setIndex(Math.min(total - 1, index + 1))}
                disabled={index >= total - 1}
              >
                {t('practice.bankMock.next')}
              </Button>
            </nav>
          </>
        ) : null}

        {stage === 'result' && result ? (
          <div aria-live="polite" className="flex flex-col gap-4">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
              <div className="min-w-0">
                <h2 className="text-h2 font-bold">
                  <span aria-hidden="true" className="mr-1.5 text-accent">
                    ❯
                  </span>
                  {t('practice.bankMock.result.title')}
                </h2>
                <p className="mt-1 text-meta text-muted">
                  {t('practice.bankMock.subtitle', { cert: resultCert?.code ?? certId })}
                </p>
              </div>
              <Button variant="ghost" onClick={onExit}>
                {t('practice.bankMock.result.close')}
              </Button>
            </header>

            <section className="rounded-card border border-line bg-panel px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="label-mono">{t('practice.bankMock.result.estimated')}</span>
                <span className="tnum text-display font-bold leading-none">
                  {f.score(result.estimated, resultCert?.passingScore ?? null)}
                </span>
              </div>
              <Progress
                className="mt-3"
                value={result.estimated}
                max={MAX_SCORE}
                tone={result.passed === false ? 'err' : 'ok'}
                label={t('practice.bankMock.result.estimated')}
              />
              {result.passed !== null ? (
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-ui">
                  <span aria-hidden="true" className={result.passed ? 'text-ok' : 'text-err'}>
                    {result.passed ? '●' : '▲'}
                  </span>
                  <span className={result.passed ? 'text-ok' : 'text-err'}>
                    {result.passed
                      ? t('practice.bankMock.result.passed')
                      : t('practice.bankMock.result.failed')}
                  </span>
                </p>
              ) : null}
              <p className="mt-1 text-meta text-muted">
                {t('practice.bankMock.result.passing', {
                  cert: resultCert?.code ?? '',
                  score: resultCert?.passingScore ?? 0,
                })}
              </p>
              <p className="mt-1 tnum text-meta text-muted">
                {t('practice.bankMock.result.correct', { correct: result.correct, total: result.total })}
                {' · '}
                {t('practice.bankMock.result.duration', { minutes: f.minutes(result.durationMin) })}
              </p>
              {saveError ? (
                <p role="alert" className="mt-2 text-meta text-err">
                  <span aria-hidden="true">▲ </span>
                  {saveError}
                </p>
              ) : null}
            </section>

            <section className="flex flex-col gap-2 rounded-card border border-line bg-panel px-4 py-4">
              <h3 className="label-mono">{t('practice.bankMock.result.breakdown')}</h3>
              <ul className="flex flex-col gap-2">
                {result.breakdown.map((row) => {
                  const ratio = row.total > 0 ? row.correct / row.total : 0;
                  const name = domainNameOf(row.domainId);
                  return (
                    <li key={row.domainId} className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <span className="min-w-0 text-ui text-text">{name}</span>
                        <span className="tnum shrink-0 text-meta text-muted">
                          {`${row.correct}/${row.total}`} · {f.percent(ratio)}
                        </span>
                      </div>
                      <Progress
                        value={row.correct}
                        max={Math.max(1, row.total)}
                        tone={toneOf(ratio)}
                        label={name}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="label-mono">{t('practice.bankMock.result.review')}</h3>
              <ol className="flex flex-col gap-2">
                {result.answers.map((answer, position) => {
                  const { question, chosenIndex } = answer;
                  const right = chosenIndex === question.correctIndex;
                  return (
                    <li
                      key={question.id}
                      className="flex flex-col gap-1 rounded-card border border-line bg-panel px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <Badge tone={right ? 'ok' : 'err'}>
                          <span aria-hidden="true">{right ? '✓' : '▲'}</span>
                          {right
                            ? t('practice.bankMock.review.correct')
                            : t('practice.bankMock.review.wrong')}
                        </Badge>
                        <span className="tnum text-meta text-muted">{f.number(position + 1)}</span>
                      </div>
                      <p className="text-ui text-text">{question.prompt}</p>
                      <p className="text-meta text-muted">
                        {t('practice.bankMock.answer')}
                        {': '}
                        {chosenIndex === null
                          ? t('practice.bankMock.noAnswer')
                          : (question.options[chosenIndex] ?? '')}
                      </p>
                      <p className="text-meta text-text">
                        <span aria-hidden="true" className="text-ok">
                          ✓{' '}
                        </span>
                        {t('practice.bankMock.correctAnswer')}
                        {': '}
                        {question.options[question.correctIndex] ?? ''}
                      </p>
                      <p className="text-meta text-muted">
                        {question.explanation
                          ? `${t('practice.bankMock.explanation')}: ${question.explanation}`
                          : t('practice.bankMock.noExplanation')}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>

            <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="lg" onClick={again} disabled={busy}>
                {t('practice.bankMock.result.again')}
              </Button>
              <Button variant="primary" size="lg" glyph onClick={onExit}>
                {t('practice.bankMock.result.close')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('practice.bankMock.finishTitle')}
        description={t('practice.bankMock.unanswered', { count: unansweredCount })}
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void finalize()} disabled={busy}>
              {t('practice.bankMock.finishConfirm')}
            </Button>
          </>
        }
      >
        <p className="tnum text-ui text-text">
          {t('practice.bankMock.answered', { n: answeredCount, m: total })}
        </p>
      </Modal>
    </div>
  );
}
