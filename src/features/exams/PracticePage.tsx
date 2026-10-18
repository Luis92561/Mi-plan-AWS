import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ellipsis, Plus, Timer } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHead,
  Chip,
  EmptyState,
  Field,
  Select,
  Skeleton,
  StatusGlyph,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { useAppState } from '@/data/store';
import type { Attempt } from '@/data/types';
import { attemptScore, averageOfLast } from '@/domain/scoring';
import { formatDateShort } from '@/lib/format';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import { AttemptChart, type AttemptChartPoint } from './components/AttemptChart';
import { AttemptDetailModal } from './components/AttemptDetailModal';
import { AttemptFormModal } from './components/AttemptFormModal';
import { MockMode } from './components/MockMode';
import { QuestionBankSection } from './components/QuestionBankSection';
import { QuestionMockRunner } from './components/QuestionMockRunner';

function compareDesc(a: Attempt, b: Attempt): number {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  return b.id.localeCompare(a.id);
}

/**
 * Práctica y simulacros (§7.5, M5).
 * Historial con evolución, alta/edición de intentos con desglose por dominio y modo simulacro.
 */
export function PracticePage() {
  const { t, f, locale } = useT();
  const { state, ready } = useAppState();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [certFilter, setCertFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Attempt | null>(null);
  const [detail, setDetail] = useState<Attempt | null>(null);
  const [deleting, setDeleting] = useState<Attempt | null>(null);
  const [mockOpen, setMockOpen] = useState(false);
  const [bankMockCert, setBankMockCert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const closeMock = useCallback(() => setMockOpen(false), []);

  // La paleta de comandos enlaza a /practica?new=1 (§7.5): abre el formulario directo.
  const newParam = searchParams.get('new');
  useEffect(() => {
    if (newParam === '1') {
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [newParam, setSearchParams]);

  const attempts = useMemo(() => [...state.attempts].sort(compareDesc), [state.attempts]);
  const scoped = useMemo(
    () => (certFilter ? attempts.filter((attempt) => attempt.certId === certFilter) : attempts),
    [attempts, certFilter],
  );

  const scored = useMemo(() => {
    return scoped
      .map((attempt) => ({ attempt, score: attemptScore(attempt) }))
      .filter((entry): entry is { attempt: Attempt; score: number } => entry.score !== null)
      .sort((a, b) =>
        a.attempt.date === b.attempt.date
          ? a.attempt.id.localeCompare(b.attempt.id)
          : a.attempt.date.localeCompare(b.attempt.date),
      );
  }, [scoped]);

  const chartPoints = useMemo<AttemptChartPoint[]>(
    () =>
      scored.map((entry) => ({
        id: entry.attempt.id,
        label: formatDateShort(entry.attempt.date, locale),
        score: entry.score,
      })),
    [scored, locale],
  );

  const average = averageOfLast(scoped, 3);
  const best = scored.length > 0 ? Math.max(...scored.map((entry) => entry.score)) : null;
  const passedCount = scoped.filter((attempt) => attempt.passed === true).length;
  const selectedCert = certFilter
    ? state.certifications.find((cert) => cert.id === certFilter)
    : undefined;
  const passing = selectedCert?.passingScore ?? null;

  const defaultCertId = certFilter || state.settings.activeCertId || state.certifications[0]?.id || '';
  const deletingScore = deleting ? attemptScore(deleting) : null;

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await getDb().attempts.delete(deleting.id);
      notify(t('practice.delete.done', { date: f.date(deleting.date) }), 'ok');
      setDeleting(null);
    } catch (cause) {
      notify(t('practice.delete.error', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h2 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('practice.title')}
          </h1>
          <p className="mt-1 max-w-prose text-ui text-muted">{t('practice.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setMockOpen(true)}
            aria-label={t('practice.action.mockHint')}
            disabled={state.certifications.length === 0}
          >
            <Timer size={15} aria-hidden="true" />
            {t('practice.action.mock')}
          </Button>
          <Button
            variant="primary"
            glyph
            onClick={() => setFormOpen(true)}
            aria-label={t('practice.action.register')}
            disabled={state.certifications.length === 0}
          >
            {t('practice.action.register')}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('practice.kpi.average')}</span>
            <span className="tnum text-h3 font-bold text-accent">
              {average === null ? '—' : f.score(average, passing)}
            </span>
            <span className="text-meta text-muted">
              {t('practice.kpi.averageHint', { total: scored.length })}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('practice.kpi.attempts')}</span>
            <span className="tnum text-h3 font-bold">{f.number(scoped.length)}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('practice.kpi.best')}</span>
            <span className="tnum text-h3 font-bold">
              {best === null ? '—' : f.score(best, passing)}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('practice.kpi.mocksPassed')}</span>
            <span className="tnum text-h3 font-bold">{f.number(passedCount)}</span>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('practice.chart.title')}</h2>
          <span className="text-meta text-muted">{t('practice.chart.hint')}</span>
        </CardHead>
        <CardBody className="flex flex-col gap-3">
          <Field label={t('practice.filters.cert')} htmlFor="prac-cert" className="sm:max-w-xs">
            <Select
              id="prac-cert"
              value={certFilter}
              onChange={(event) => setCertFilter(event.target.value)}
            >
              <option value="">{t('practice.filters.certAll')}</option>
              {state.certifications.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.code} · {cert.name}
                </option>
              ))}
            </Select>
          </Field>
          {chartPoints.length >= 2 ? (
            <AttemptChart points={chartPoints} passingScore={passing} />
          ) : (
            <p className="rounded-card border border-dashed border-line px-3 py-6 text-center text-ui text-muted">
              {t('practice.chart.empty')}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('practice.history.title')}</h2>
          <span className="text-meta text-muted">{t('practice.history.hint')}</span>
        </CardHead>
        <CardBody className="p-0">
          {state.attempts.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={t('practice.empty.title')}
                body={t('practice.empty.body')}
                action={
                  <Button variant="primary" glyph onClick={() => setFormOpen(true)}>
                    {t('practice.action.register')}
                  </Button>
                }
              />
            </div>
          ) : scoped.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={t('practice.emptyFiltered.title')}
                body={t('practice.emptyFiltered.body')}
                action={
                  <Button variant="secondary" onClick={() => setCertFilter('')}>
                    {t('practice.filters.certAll')}
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="flex flex-col">
              {scoped.map((attempt) => {
                const cert = state.certifications.find((item) => item.id === attempt.certId);
                const shown = attemptScore(attempt);
                const isEstimate = attempt.score === null && attempt.estimatedScore !== null;
                const dateLabel = f.date(attempt.date);
                return (
                  <li key={attempt.id} className="border-b border-line last:border-b-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-2.5">
                      <span className="tnum text-ui">{dateLabel}</span>
                      <Chip>{cert?.code ?? attempt.certId}</Chip>
                      <Chip>{t(`enum.attempt.${attempt.kind}` as TKey)}</Chip>
                      <span className="tnum text-ui">
                        {shown === null ? (
                          <span aria-label={t('practice.result.none')}>—</span>
                        ) : (
                          f.score(shown, cert?.passingScore ?? null)
                        )}
                      </span>
                      {isEstimate ? (
                        <Badge tone="neutral">{t('practice.history.estimated')}</Badge>
                      ) : null}
                      <StatusGlyph
                        state={
                          attempt.passed === true
                            ? 'aprobado'
                            : attempt.passed === false
                              ? 'alerta'
                              : 'pendiente'
                        }
                        label={
                          attempt.passed === true
                            ? t('practice.result.passed')
                            : attempt.passed === false
                              ? t('practice.result.failed')
                              : t('practice.result.none')
                        }
                      />
                      <span className="ml-auto flex items-center gap-1">
                        <span className="tnum text-meta text-muted">
                          {f.minutes(attempt.durationMin)}
                        </span>
                        <Menu>
                          <MenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={t('practice.row.menu', { date: dateLabel })}
                              className="flex h-11 w-11 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text"
                            >
                              <Ellipsis size={16} aria-hidden="true" />
                            </button>
                          </MenuTrigger>
                          <MenuContent ariaLabel={t('practice.row.menu', { date: dateLabel })}>
                            <MenuItem onSelect={() => setDetail(attempt)}>
                              {t('practice.row.breakdown')}
                            </MenuItem>
                            <MenuItem onSelect={() => setEditing(attempt)}>
                              {t('practice.row.edit')}
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem danger onSelect={() => setDeleting(attempt)}>
                              {t('practice.row.delete')}
                            </MenuItem>
                          </MenuContent>
                        </Menu>
                      </span>
                    </div>
                    <p className="px-3 pb-2 text-meta text-muted">
                      {t('practice.history.meta', {
                        kind: t(`enum.attempt.${attempt.kind}` as TKey),
                        duration: f.minutes(attempt.durationMin),
                      })}
                      {attempt.source ? ` · ${attempt.source}` : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <QuestionBankSection state={state} onStartMock={(certId) => setBankMockCert(certId)} />

      {formOpen ? (
        <AttemptFormModal
          key="new-attempt"
          attempt={null}
          defaultCertId={defaultCertId}
          onOpenChange={(open) => {
            if (!open) setFormOpen(false);
          }}
        />
      ) : null}

      {editing ? (
        <AttemptFormModal
          key={editing.id}
          attempt={editing}
          defaultCertId={editing.certId}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      {detail ? (
        <AttemptDetailModal
          key={`detail-${detail.id}`}
          attempt={detail}
          onOpenChange={(open) => {
            if (!open) setDetail(null);
          }}
        />
      ) : null}

      {mockOpen ? (
        <MockMode initialCertId={defaultCertId} onExit={closeMock} />
      ) : null}

      {bankMockCert !== null ? (
        <QuestionMockRunner
          key={`bank-mock-${bankMockCert}`}
          state={state}
          initialCertId={bankMockCert}
          onExit={() => setBankMockCert(null)}
        />
      ) : null}

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t('practice.delete.title')}
        description={
          deleting
            ? t('practice.delete.body', {
                date: f.date(deleting.date),
                cert:
                  state.certifications.find((item) => item.id === deleting.certId)?.code ??
                  deleting.certId,
              })
            : undefined
        }
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={busy}>
              {t('practice.delete.confirm')}
            </Button>
          </>
        }
      >
        {deleting ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip>{t(`enum.attempt.${deleting.kind}` as TKey)}</Chip>
            <Chip>{f.date(deleting.date)}</Chip>
            <span className="tnum text-ui text-text">
              {deletingScore === null ? t('practice.result.none') : f.score(deletingScore)}
            </span>
          </div>
        ) : null}
      </Modal>

      <Button
        variant="primary"
        glyph
        onClick={() => setFormOpen(true)}
        aria-label={t('practice.action.register')}
        className="fixed bottom-24 right-4 z-40 shadow-overlay md:hidden"
        disabled={state.certifications.length === 0}
      >
        <Plus size={15} aria-hidden="true" />
        {t('practice.action.register')}
      </Button>
    </div>
  );
}
