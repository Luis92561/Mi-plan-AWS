import { useEffect, useRef, useState } from 'react';
import { Button, Field, Input, Progress, Select, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId, useAppState } from '@/data/store';
import type { Attempt } from '@/data/types';
import { MAX_SCORE, estimatedScore, normalizeAttempt } from '@/domain/scoring';
import { localDate } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** mm:ss a partir de segundos restantes. */
function clockOf(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

export interface MockModeProps {
  initialCertId: string;
  /** Sale del simulacro sin guardar (también con Esc). */
  onExit: () => void;
}

/**
 * Modo simulacro (§7.5, M5): pantalla completa, sin distracciones, con temporizador.
 * Al finalizar se guarda un intento `mock` con puntaje **estimado** desde las preguntas respondidas.
 * Se puede salir en cualquier momento sin guardar.
 */
export function MockMode({ initialCertId, onExit }: MockModeProps) {
  const { t, f } = useT();
  const { notify } = useToast();
  const { state } = useAppState();
  const exitRef = useRef(onExit);
  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);

  const [certId, setCertId] = useState(initialCertId);
  const [elapsed, setElapsed] = useState(0);
  const [correct, setCorrect] = useState('');
  const [total, setTotal] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cert = state.certifications.find((item) => item.id === certId);
  const limitSeconds = Math.max(1, Math.round((cert?.durationMin ?? 130) * 60));
  const remaining = Math.max(0, limitSeconds - elapsed);
  const expired = remaining === 0 && elapsed > 0;

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setElapsed(0);
  }, [certId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const correctNumber = correct.trim() === '' ? null : Number(correct);
  const totalNumber = total.trim() === '' ? null : Number(total);
  const preview =
    correctNumber !== null &&
    totalNumber !== null &&
    Number.isFinite(correctNumber) &&
    Number.isFinite(totalNumber) &&
    totalNumber > 0
      ? estimatedScore(correctNumber, totalNumber)
      : null;

  const finish = async () => {
    if (!cert) {
      setError(t('practice.form.errCert'));
      return;
    }
    if (totalNumber === null || !Number.isFinite(totalNumber) || totalNumber <= 0) {
      setError(t('practice.form.errTotal'));
      return;
    }
    if (correctNumber === null || !Number.isFinite(correctNumber) || correctNumber < 0 || correctNumber > totalNumber) {
      setError(t('practice.form.errCorrect'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const draft: Attempt = {
        id: newId('att'),
        certId: cert.id,
        date: localDate(),
        kind: 'mock',
        source: t('practice.mock.source'),
        correct: Math.round(correctNumber),
        total: Math.round(totalNumber),
        score: null,
        estimatedScore: null,
        passed: null,
        durationMin: Math.max(1, Math.round(elapsed / 60)),
        costUsd: 0,
        voucherId: null,
        breakdown: [],
        notes: notes.trim(),
      };
      const saved = normalizeAttempt(draft, cert);
      await getDb().attempts.put(saved);
      notify(t('practice.mock.saved', { score: saved.estimatedScore ?? 0 }), 'ok');
      onExit();
    } catch (cause) {
      const message = (cause as Error).message;
      setError(t('practice.mock.error', { message }));
      notify(t('practice.mock.error', { message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('practice.mock.title')}
      className="fixed inset-0 z-[65] overflow-y-auto bg-bg"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 py-5">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
          <div className="min-w-0">
            <h2 className="text-h2 font-bold">
              <span aria-hidden="true" className="mr-1.5 text-accent">
                ❯
              </span>
              {t('practice.mock.title')}
            </h2>
            <p className="mt-1 text-meta text-muted">
              {t('practice.mock.subtitle', { cert: cert?.code ?? certId })}
            </p>
          </div>
          <Button variant="ghost" onClick={onExit}>
            {t('practice.mock.exit')}
          </Button>
        </header>

        <section
          aria-label={t('practice.mock.timer')}
          className="rounded-card border border-line bg-panel px-4 py-6 text-center"
        >
          <p className="label-mono">{t('practice.mock.timer')}</p>
          <p
            className="tnum text-display font-bold leading-none"
            aria-live="off"
            aria-label={t('practice.mock.timerLabel', { time: clockOf(remaining) })}
          >
            {clockOf(remaining)}
          </p>
          <p className="mt-2 text-meta text-muted">
            {t('practice.mock.duration', { minutes: cert?.durationMin ?? 130 })}
          </p>
          {expired ? (
            <p role="status" className="mt-2 text-meta text-warn">
              <span aria-hidden="true">▲ </span>
              {t('practice.mock.expired')}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-line bg-panel px-4 py-4">
          <Field label={t('practice.mock.cert')} htmlFor="mock-cert">
            <Select
              id="mock-cert"
              value={certId}
              onChange={(event) => setCertId(event.target.value)}
            >
              {state.certifications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('practice.mock.total')} htmlFor="mock-total">
              <Input
                id="mock-total"
                type="number"
                min={1}
                inputMode="numeric"
                value={total}
                onChange={(event) => setTotal(event.target.value)}
              />
            </Field>
            <Field label={t('practice.mock.correct')} htmlFor="mock-correct">
              <Input
                id="mock-correct"
                type="number"
                min={0}
                inputMode="numeric"
                value={correct}
                onChange={(event) => setCorrect(event.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-card border border-line bg-panel-2 px-3 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="label-mono">{t('practice.form.preview')}</span>
              <span className="tnum text-h3 font-bold">
                {preview === null ? '—' : f.score(preview, cert?.passingScore ?? null)}
              </span>
            </div>
            <p className="mt-1 text-meta text-muted">{t('practice.form.estimatedOnly')}</p>
            {preview !== null ? (
              <Progress
                className="mt-2"
                value={preview}
                max={MAX_SCORE}
                tone={
                  cert === undefined
                    ? 'accent'
                    : preview >= cert.passingScore
                      ? 'ok'
                      : 'err'
                }
                label={t('practice.form.preview')}
              />
            ) : null}
          </div>

          <p className="text-meta text-muted">{t('practice.mock.hint')}</p>

          <Field label={t('practice.mock.notes')} htmlFor="mock-notes" hint={t('common.optional')}>
            <Textarea
              id="mock-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          {error ? (
            <p role="alert" className="text-meta text-err">
              <span aria-hidden="true">▲ </span>
              {error}
            </p>
          ) : null}
        </section>

        <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="lg" onClick={onExit}>
            {t('practice.mock.exit')}
          </Button>
          <Button variant="primary" size="lg" glyph onClick={finish} disabled={busy}>
            {t('practice.mock.finish')}
          </Button>
        </div>

        <p className="pb-2 text-meta text-muted">{t('practice.mock.exitHint')}</p>
      </div>
    </div>
  );
}
