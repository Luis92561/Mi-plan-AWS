import { useState } from 'react';
import type { Attempt, Certification, PlanItem } from '@/data/types';
import {
  Button,
  Card,
  CardBody,
  CardHead,
  Chip,
  Field,
  Input,
  Select,
  StatusGlyph,
} from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId, nowIso, useAppState } from '@/data/store';
import { attemptPassed, attemptScore, normalizeAttempt } from '@/domain/scoring';
import { localDate } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import { attemptView, byDateDesc } from '../helpers';

export interface ExamTabProps {
  cert: Certification;
  planItem: PlanItem | null;
  /** Intentos de tipo `real` de esta certificación. */
  attempts: Attempt[];
  now: Date;
}

/** Pestaña Examen real (§7.3): agendar, costo con voucher y registrar resultado. */
export function ExamTab({ cert, planItem, attempts, now }: ExamTabProps) {
  const { t, f } = useT();
  const { notify } = useToast();
  const { state } = useAppState();

  const [targetDate, setTargetDate] = useState(planItem?.targetDate ?? '');
  const [voucherId, setVoucherId] = useState('');
  const [examDate, setExamDate] = useState(localDate(now));
  const [source, setSource] = useState('');
  const [correct, setCorrect] = useState('');
  const [total, setTotal] = useState(String(cert.questions));
  const [score, setScore] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const vouchers = state.vouchers.filter((voucher) => voucher.status === 'disponible');
  const voucher = vouchers.find((item) => item.id === voucherId) ?? null;
  const listPrice = cert.priceUsd;
  const cost =
    listPrice === null ? null : voucher ? Math.round(listPrice * (1 - voucher.percent / 100) * 100) / 100 : listPrice;
  const realAttempts = byDateDesc(attempts);

  const schedule = async () => {
    if (!planItem || !targetDate) return;
    setBusy(true);
    try {
      await getDb().planItems.update(planItem.id, { targetDate, status: 'agendado', updatedAt: nowIso() });
      notify(t('cert.exam.scheduled', { date: f.date(targetDate) }), 'ok');
    } catch (cause) {
      notify(t('cert.exam.scheduleError', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    const hits = Number(correct);
    const questions = Number(total);
    if (!Number.isFinite(hits) || !Number.isFinite(questions) || questions <= 0 || hits < 0 || hits > questions) {
      setError(t('cert.exam.invalid'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const db = getDb();
      const reported = score.trim() === '' ? null : Number(score);
      const raw: Attempt = {
        id: newId('att'),
        certId: cert.id,
        date: examDate === '' ? localDate(now) : examDate,
        kind: 'real',
        source: source.trim(),
        correct: Math.round(hits),
        total: Math.round(questions),
        score: reported !== null && Number.isFinite(reported) ? Math.round(reported) : null,
        estimatedScore: null,
        passed: null,
        durationMin: cert.durationMin,
        costUsd: cost ?? 0,
        voucherId: voucher?.id ?? null,
        breakdown: [],
        notes: '',
      };
      const normalized = normalizeAttempt(raw, cert);
      const passed = attemptPassed(normalized, cert.passingScore);
      const attempt: Attempt = { ...normalized, passed };

      await db.attempts.put(attempt);
      if (voucher) {
        await db.vouchers.update(voucher.id, { status: 'usado', usedForAttemptId: attempt.id });
      }
      if (planItem) {
        await db.planItems.update(planItem.id, {
          status: passed ? 'aprobado' : 'reprobado',
          updatedAt: nowIso(),
        });
      }
      notify(
        t('cert.exam.saved', {
          score: attemptScore(attempt) ?? '',
          passing: cert.passingScore,
          result: passed ? t('cert.exam.passed') : t('cert.exam.failed'),
        }),
        passed ? 'ok' : 'err',
      );
      setCorrect('');
      setScore('');
      setSource('');
    } catch (cause) {
      setError(t('cert.exam.error', { message: (cause as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead>
            <h2 className="text-h3 font-bold">
              <span aria-hidden="true" className="mr-1.5 text-accent">
                ❯
              </span>
              {t('cert.exam.scheduleCta')}
            </h2>
            {planItem ? <Chip>{t(`enum.plan.${planItem.status}`)}</Chip> : null}
          </CardHead>
          <CardBody className="flex flex-col gap-3">
            {planItem ? null : <p className="text-ui text-muted">{t('cert.exam.needPlan')}</p>}
            <div className="flex flex-wrap items-end gap-2">
              <Field label={t('cert.exam.schedule')} htmlFor="cert-exam-date" className="min-w-[10rem] flex-1">
                <Input
                  id="cert-exam-date"
                  type="date"
                  value={targetDate}
                  disabled={!planItem}
                  onChange={(event) => setTargetDate(event.target.value)}
                />
              </Field>
              <Button
                variant="primary"
                glyph
                disabled={!planItem || targetDate === '' || busy}
                onClick={() => void schedule()}
                className="shrink-0"
              >
                {t('cert.exam.scheduleCta')}
              </Button>
            </div>
            <p className="text-meta text-muted">
              {t('cert.exam.targetDate')}:{' '}
              <span className="tnum text-text">
                {planItem?.targetDate ? f.date(planItem.targetDate) : t('cert.exam.noDate')}
              </span>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHead>
            <h2 className="text-h3 font-bold">
              <span aria-hidden="true" className="mr-1.5 text-accent">
                ❯
              </span>
              {t('cert.exam.cost')}
            </h2>
          </CardHead>
          <CardBody className="flex flex-col gap-3">
            <dl className="flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <dt className="label-mono">{t('cert.exam.price')}</dt>
                <dd className="tnum text-ui text-text">
                  {listPrice === null ? t('cert.exam.noPrice') : f.currency(listPrice)}
                </dd>
              </div>
              <div>
                <dt className="label-mono">{t('cert.exam.cost')}</dt>
                <dd className="tnum text-ui text-text">{cost === null ? t('cert.exam.noPrice') : f.currency(cost)}</dd>
              </div>
            </dl>
            <Field
              label={t('cert.exam.voucher')}
              htmlFor="cert-exam-voucher"
              hint={vouchers.length === 0 ? t('cert.exam.noVoucher') : undefined}
            >
              <Select
                id="cert-exam-voucher"
                value={voucherId}
                disabled={vouchers.length === 0}
                onChange={(event) => setVoucherId(event.target.value)}
              >
                <option value="">{t('cert.exam.noVoucher')}</option>
                {vouchers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {t('cert.exam.voucherLabel', { label: item.label, percent: f.percent(item.percent / 100) })}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('cert.exam.resultTitle')}
          </h2>
          <Chip>{t('enum.attempt.real')}</Chip>
        </CardHead>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t('cert.exam.date')} htmlFor="result-date">
              <Input
                id="result-date"
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
              />
            </Field>
            <Field label={t('cert.exam.source')} htmlFor="result-source" hint={t('common.optional')}>
              <Input
                id="result-source"
                value={source}
                placeholder={t('cert.exam.sourcePlaceholder')}
                onChange={(event) => setSource(event.target.value)}
              />
            </Field>
            <Field label={t('cert.exam.correct')} htmlFor="result-correct">
              <Input
                id="result-correct"
                type="number"
                min={0}
                max={Number(total) || cert.questions}
                inputMode="numeric"
                value={correct}
                onChange={(event) => setCorrect(event.target.value)}
              />
            </Field>
            <Field label={t('cert.exam.total')} htmlFor="result-total">
              <Input
                id="result-total"
                type="number"
                min={1}
                inputMode="numeric"
                value={total}
                onChange={(event) => setTotal(event.target.value)}
              />
            </Field>
            <Field label={t('cert.exam.score')} htmlFor="result-score" hint={t('cert.exam.scoreHint')}>
              <Input
                id="result-score"
                type="number"
                min={100}
                max={1000}
                inputMode="numeric"
                value={score}
                onChange={(event) => setScore(event.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Button variant="primary" glyph disabled={busy} onClick={() => void register()} className="w-full">
                {t('cert.exam.register')}
              </Button>
            </div>
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-meta text-err">
              ▲ {error}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('cert.exam.lastAttempt')}</h2>
        </CardHead>
        <CardBody>
          {realAttempts.length === 0 ? (
            <p className="text-ui text-muted">{t('cert.exam.none')}</p>
          ) : (
            <ul className="flex flex-col">
              {realAttempts.map((attempt) => {
                const view = attemptView(attempt, cert);
                return (
                  <li
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-b-0"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ui text-text">
                      <span className="tnum">{f.date(attempt.date)}</span>
                      {attempt.source ? <span className="text-muted">{attempt.source}</span> : null}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tnum text-ui text-text">
                        {view.score === null ? t('cert.practice.noScore') : f.score(view.score, cert.passingScore)}
                      </span>
                      {view.passed === null ? (
                        <StatusGlyph state="pendiente" label={t('cert.practice.noScore')} />
                      ) : (
                        <StatusGlyph
                          state={view.passed ? 'aprobado' : 'alerta'}
                          label={view.passed ? t('cert.exam.passed') : t('cert.exam.failed')}
                        />
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
