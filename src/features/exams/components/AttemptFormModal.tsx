import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Badge, Button, Field, Input, Progress, Select, Textarea } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId, useAppState } from '@/data/store';
import type { Attempt, AttemptBreakdown, AttemptKind, Certification } from '@/data/types';
import { MIN_SCORE, MAX_SCORE, estimatedScore, normalizeAttempt } from '@/domain/scoring';
import { isValidDateString, localDate } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import { cn } from '@/lib/cn';

const KINDS: AttemptKind[] = ['practice_set', 'practice_exam', 'mock', 'real'];

interface BreakdownDraft {
  key: number;
  domainId: string;
  correct: string;
  total: string;
}

let rowSeq = 0;

function nextRow(): number {
  rowSeq += 1;
  return rowSeq;
}

function rowsForCert(cert: Certification | undefined): BreakdownDraft[] {
  return (cert?.domains ?? []).map((domain) => ({
    key: nextRow(),
    domainId: domain.id,
    correct: '',
    total: '',
  }));
}

function rowsForAttempt(attempt: Attempt): BreakdownDraft[] {
  return attempt.breakdown.map((row) => ({
    key: nextRow(),
    domainId: row.domainId,
    correct: String(row.correct),
    total: String(row.total),
  }));
}

function stringOf(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface AttemptFormModalProps {
  /** `null` = intento nuevo. */
  attempt: Attempt | null;
  defaultCertId?: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Alta y edición de un intento de práctica (§7.5, M5).
 * Con correctas/total el puntaje se calcula con `estimatedScore` y se muestra **como estimado**;
 * `normalizeAttempt` decide `passed` antes de guardar.
 */
export function AttemptFormModal({ attempt, defaultCertId, onOpenChange }: AttemptFormModalProps) {
  const { t, f } = useT();
  const { notify } = useToast();
  const { state } = useAppState();

  const initialCertId =
    attempt?.certId ?? defaultCertId ?? state.settings.activeCertId ?? state.certifications[0]?.id ?? '';
  const initialCert = state.certifications.find((item) => item.id === initialCertId);

  const [certId, setCertId] = useState(initialCertId);
  const [kind, setKind] = useState<AttemptKind>(attempt?.kind ?? 'practice_exam');
  const [source, setSource] = useState(attempt?.source ?? '');
  const [date, setDate] = useState(attempt?.date ?? localDate());
  const [mode, setMode] = useState<'correct' | 'score'>(
    attempt !== null && attempt.score !== null ? 'score' : 'correct',
  );
  const [correct, setCorrect] = useState(stringOf(attempt?.correct));
  const [total, setTotal] = useState(stringOf(attempt?.total));
  const [score, setScore] = useState(stringOf(attempt?.score));
  const [duration, setDuration] = useState(stringOf(attempt?.durationMin ?? 0));
  const [cost, setCost] = useState(stringOf(attempt?.costUsd ?? 0));
  const [voucherId, setVoucherId] = useState(attempt?.voucherId ?? '');
  const [notes, setNotes] = useState(attempt?.notes ?? '');
  const [rows, setRows] = useState<BreakdownDraft[]>(
    attempt ? rowsForAttempt(attempt) : rowsForCert(initialCert),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cert = state.certifications.find((item) => item.id === certId);
  const vouchers = state.vouchers.filter(
    (voucher) => voucher.status === 'disponible' || voucher.id === voucherId,
  );

  const correctNumber = toNumber(correct);
  const totalNumber = toNumber(total);
  const scoreNumber = toNumber(score);
  const preview =
    mode === 'correct' && correctNumber !== null && totalNumber !== null && totalNumber > 0
      ? estimatedScore(correctNumber, totalNumber)
      : null;
  const shownScore = mode === 'correct' ? preview : scoreNumber;
  const isEstimate = mode === 'correct';
  const passing = cert?.passingScore ?? null;
  const passedPreview = shownScore !== null && passing !== null ? shownScore >= passing : null;

  const onCertChange = (nextCertId: string) => {
    setCertId(nextCertId);
    const nextCert = state.certifications.find((item) => item.id === nextCertId);
    setRows(rowsForCert(nextCert));
  };

  const addRow = () => {
    setRows((current) => [...current, { key: nextRow(), domainId: '', correct: '', total: '' }]);
  };

  const removeRow = (key: number) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const updateRow = (key: number, patch: Partial<BreakdownDraft>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const fail = (message: string) => {
    setError(message);
    return undefined;
  };

  const buildAttempt = (): Attempt | undefined => {
    if (!cert) return fail(t('practice.form.errCert'));
    if (!isValidDateString(date)) return fail(t('common.invalidDate'));

    let correctValue: number | null = null;
    let totalValue: number | null = null;
    let scoreValue: number | null = null;
    let estimateValue: number | null = null;

    if (mode === 'correct') {
      if (totalNumber === null || totalNumber <= 0) return fail(t('practice.form.errTotal'));
      if (correctNumber === null || correctNumber < 0 || correctNumber > totalNumber) {
        return fail(t('practice.form.errCorrect'));
      }
      correctValue = Math.round(correctNumber);
      totalValue = Math.round(totalNumber);
      estimateValue = estimatedScore(correctValue, totalValue);
    } else {
      if (scoreNumber === null || scoreNumber < MIN_SCORE || scoreNumber > MAX_SCORE) {
        return fail(t('practice.form.errScore'));
      }
      scoreValue = Math.round(scoreNumber);
    }

    const breakdown: AttemptBreakdown[] = [];
    for (const row of rows) {
      const rowTotal = toNumber(row.total);
      const rowCorrect = toNumber(row.correct);
      const untouched = row.total.trim() === '' && row.correct.trim() === '';
      if (untouched) continue;
      if (
        row.domainId === '' ||
        rowTotal === null ||
        rowTotal <= 0 ||
        rowCorrect === null ||
        rowCorrect < 0 ||
        rowCorrect > rowTotal
      ) {
        return fail(t('practice.form.errBreakdown'));
      }
      breakdown.push({
        domainId: row.domainId,
        correct: Math.round(rowCorrect),
        total: Math.round(rowTotal),
      });
    }

    const base: Attempt = {
      id: attempt?.id ?? newId('att'),
      certId: cert.id,
      date,
      kind,
      source: source.trim(),
      correct: correctValue,
      total: totalValue,
      score: scoreValue,
      estimatedScore: estimateValue,
      passed: null,
      durationMin: Math.max(0, Math.round(toNumber(duration) ?? 0)),
      costUsd: Math.max(0, toNumber(cost) ?? 0),
      voucherId: voucherId === '' ? null : voucherId,
      breakdown,
      notes: notes.trim(),
    };

    return normalizeAttempt(base, cert);
  };

  const submit = async () => {
    setError(null);
    const prepared = buildAttempt();
    if (!prepared) return;
    setBusy(true);
    try {
      await getDb().attempts.put(prepared);
      notify(
        attempt
          ? t('practice.form.updated', { date: f.date(prepared.date) })
          : t('practice.form.saved', { date: f.date(prepared.date) }),
        'ok',
      );
      onOpenChange(false);
    } catch (cause) {
      const message = (cause as Error).message;
      setError(t('practice.form.error', { message }));
      notify(t('practice.form.error', { message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={attempt ? t('practice.form.editTitle') : t('practice.form.newTitle')}
      description={t('practice.form.help')}
      closeLabel={t('common.close')}
      className="w-[min(720px,calc(100vw-24px))]"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" glyph onClick={submit} disabled={busy}>
            {t('practice.form.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('common.certification')} htmlFor="att-cert">
            <Select
              id="att-cert"
              value={certId}
              onChange={(event) => onCertChange(event.target.value)}
            >
              {state.certifications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('practice.form.kind')} htmlFor="att-kind">
            <Select
              id="att-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as AttemptKind)}
            >
              {KINDS.map((value) => (
                <option key={value} value={value}>
                  {t(`enum.attempt.${value}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('common.source')} htmlFor="att-source" hint={t('common.optional')}>
            <Input
              id="att-source"
              value={source}
              placeholder={t('practice.form.sourcePlaceholder')}
              onChange={(event) => setSource(event.target.value)}
            />
          </Field>
          <Field label={t('common.date')} htmlFor="att-date">
            <Input
              id="att-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="label-mono">{t('practice.form.mode')}</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {(['correct', 'score'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  'min-h-[44px] rounded-input border px-2 text-ui transition-colors duration-hover',
                  mode === value ? 'border-accent text-accent' : 'border-line text-muted hover:text-text',
                )}
              >
                {value === 'correct' ? t('practice.form.modeCorrect') : t('practice.form.modeScore')}
              </button>
            ))}
          </div>
        </fieldset>

        {mode === 'correct' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('practice.form.correct')} htmlFor="att-correct">
              <Input
                id="att-correct"
                type="number"
                min={0}
                inputMode="numeric"
                value={correct}
                onChange={(event) => setCorrect(event.target.value)}
              />
            </Field>
            <Field label={t('practice.form.total')} htmlFor="att-total">
              <Input
                id="att-total"
                type="number"
                min={1}
                inputMode="numeric"
                value={total}
                onChange={(event) => setTotal(event.target.value)}
              />
            </Field>
          </div>
        ) : (
          <Field label={t('practice.form.score')} htmlFor="att-score">
            <Input
              id="att-score"
              type="number"
              min={MIN_SCORE}
              max={MAX_SCORE}
              inputMode="numeric"
              value={score}
              onChange={(event) => setScore(event.target.value)}
            />
          </Field>
        )}

        <div className="rounded-card border border-line bg-panel-2 px-3 py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="label-mono">
              {isEstimate ? t('practice.form.preview') : t('practice.detail.score')}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="tnum text-h3 font-bold">
                {shownScore === null ? '—' : f.score(shownScore, passing)}
              </span>
              {isEstimate ? <Badge tone="neutral">{t('practice.history.estimated')}</Badge> : null}
            </span>
          </div>
          {isEstimate ? (
            <p className="mt-1 text-meta text-muted">{t('practice.form.estimatedOnly')}</p>
          ) : null}
          {passedPreview !== null && passing !== null ? (
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-meta">
              <span aria-hidden="true" className={passedPreview ? 'text-ok' : 'text-err'}>
                {passedPreview ? '●' : '▲'}
              </span>
              <span className={passedPreview ? 'text-ok' : 'text-err'}>
                {passedPreview ? t('practice.form.above') : t('practice.form.below')}
              </span>
              <span className="text-muted">
                {t('practice.form.previewVs', { score: passing })}
              </span>
            </p>
          ) : null}
          {shownScore !== null ? (
            <Progress
              className="mt-2"
              value={shownScore}
              max={MAX_SCORE}
              tone={passedPreview === true ? 'ok' : passedPreview === false ? 'err' : 'accent'}
              label={t('practice.form.preview')}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('practice.form.duration')} htmlFor="att-duration">
            <Input
              id="att-duration"
              type="number"
              min={0}
              inputMode="numeric"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </Field>
          <Field label={t('practice.form.cost')} htmlFor="att-cost">
            <Input
              id="att-cost"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
          </Field>
        </div>

        <Field label={t('practice.form.voucher')} htmlFor="att-voucher" hint={t('common.optional')}>
          <Select
            id="att-voucher"
            value={voucherId}
            onChange={(event) => setVoucherId(event.target.value)}
          >
            <option value="">{t('practice.form.voucherNone')}</option>
            {vouchers.map((voucher) => (
              <option key={voucher.id} value={voucher.id}>
                {t('practice.form.voucherOption', {
                  label: voucher.label,
                  percent: f.percent(voucher.percent / 100),
                  date: voucher.expiresAt ? f.date(voucher.expiresAt) : '—',
                })}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="label-mono">{t('practice.form.breakdown')}</legend>
          <p className="text-meta text-muted">{t('practice.form.breakdownHint')}</p>
          <ul className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <li key={row.key} className="rounded-card border border-line bg-panel-2 p-2">
                <div className="flex items-end gap-1.5">
                  <div className="min-w-0 flex-1">
                    <Select
                      aria-label={t('practice.form.rowDomain', { n: index + 1 })}
                      value={row.domainId}
                      onChange={(event) => updateRow(row.key, { domainId: event.target.value })}
                    >
                      <option value="">—</option>
                      {(cert?.domains ?? []).map((domain) => (
                        <option key={domain.id} value={domain.id}>
                          {domain.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    aria-label={t('practice.form.removeRow', { n: index + 1 })}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-err"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <label className="flex flex-col gap-1">
                    <span className="label-mono">{t('practice.form.correct')}</span>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={row.correct}
                      onChange={(event) => updateRow(row.key, { correct: event.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="label-mono">{t('practice.form.total')}</span>
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={row.total}
                      onChange={(event) => updateRow(row.key, { total: event.target.value })}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <div>
            <Button variant="ghost" size="sm" onClick={addRow}>
              <Plus size={14} aria-hidden="true" />
              {t('practice.form.addRow')}
            </Button>
          </div>
        </fieldset>

        <Field label={t('common.notes')} htmlFor="att-notes" hint={t('common.optional')}>
          <Textarea
            id="att-notes"
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
      </div>
    </Modal>
  );
}
