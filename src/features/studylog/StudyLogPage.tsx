import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHead,
  Chip,
  EmptyState,
  Field,
  Progress,
  Select,
  Skeleton,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { certById, domainById, useAppState } from '@/data/store';
import type { StudySession, StudyType } from '@/data/types';
import { streakDays, weekMinutes } from '@/domain/stats';
import { addDaysToDate, localDate } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import { cn } from '@/lib/cn';
import { useQuickSession } from './QuickSession';
import { SessionEditModal } from './components/SessionEditModal';
import { StudyHeatmap } from './components/StudyHeatmap';

const STUDY_TYPES: StudyType[] = ['lectura', 'video', 'lab', 'practica', 'repaso', 'proyecto'];
const RANGES = ['7', '30', '90', 'all'] as const;
type Range = (typeof RANGES)[number];

function compareDesc(a: StudySession, b: StudySession): number {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  return b.createdAt.localeCompare(a.createdAt);
}

/** Fila de una sesión: tipo, certificación, dominio, confianza, nota y acciones. */
function SessionRow({
  session,
  onEdit,
  onDelete,
}: {
  session: StudySession;
  onEdit: (session: StudySession) => void;
  onDelete: (session: StudySession) => void;
}) {
  const { t, f } = useT();
  const { state } = useAppState();
  const cert = certById(state, session.certId);
  const domain = domainById(state, session.certId, session.domainId);

  return (
    <Card className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>{t(`enum.study.${session.type}` as TKey)}</Chip>
          <Chip>{cert?.code ?? session.certId}</Chip>
          {domain ? (
            <Chip className="max-w-[15rem] truncate" title={domain.name}>
              {domain.name}
            </Chip>
          ) : null}
          <span className="tnum text-meta text-muted">
            {t('log.row.confidence', { n: session.confidence })}
          </span>
        </div>
        {session.notes ? (
          <p className="text-ui leading-snug text-text">
            <span aria-hidden="true" className="text-muted">
              ›{' '}
            </span>
            {session.notes}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <span className="tnum mr-1 text-ui text-text">{f.minutes(session.minutes)}</span>
        <button
          type="button"
          onClick={() => onEdit(session)}
          aria-label={t('log.row.edit', { date: f.date(session.date) })}
          className="flex h-11 w-11 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text"
        >
          <Pencil size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(session)}
          aria-label={t('log.row.delete', { date: f.date(session.date) })}
          className="flex h-11 w-11 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-err"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </Card>
  );
}

/**
 * Bitácora de estudio (§7.4, M4).
 * Reutiliza el mini-registro ya existente (`useQuickSession`) para crear sesiones;
 * aquí se editan, se borran con confirmación y se analizan (totales, racha, heatmap).
 */
export function StudyLogPage() {
  const { t, f } = useT();
  const { state, ready } = useAppState();
  const { notify } = useToast();
  const { openQuickSession } = useQuickSession();

  const today = localDate();
  const [certFilter, setCertFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [range, setRange] = useState<Range>('30');
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [deleting, setDeleting] = useState<StudySession | null>(null);
  const [busy, setBusy] = useState(false);

  const sessions = state.studySessions;
  const week = weekMinutes(sessions, today);
  const streak = streakDays(sessions, today, state.settings.studyDays);
  const goalMinutes = Math.max(0, Math.round(state.settings.weeklyHoursGoal * 60));
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);

  const filtered = useMemo(() => {
    const from = range === 'all' ? null : addDaysToDate(today, -(Number(range) - 1));
    return sessions
      .filter((session) => (certFilter ? session.certId === certFilter : true))
      .filter((session) => (typeFilter ? session.type === typeFilter : true))
      .filter((session) => (from ? session.date >= from : true))
      .sort(compareDesc);
  }, [sessions, certFilter, typeFilter, range, today]);

  const groups = useMemo(() => {
    const byDate = new Map<string, StudySession[]>();
    for (const session of filtered) {
      const bucket = byDate.get(session.date) ?? [];
      bucket.push(session);
      byDate.set(session.date, bucket);
    }
    return [...byDate.entries()];
  }, [filtered]);

  const hasFilters = certFilter !== '' || typeFilter !== '' || range !== '30';
  const clearFilters = () => {
    setCertFilter('');
    setTypeFilter('');
    setRange('30');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await getDb().studySessions.delete(deleting.id);
      notify(t('log.delete.done', { date: f.date(deleting.date) }), 'ok');
      setDeleting(null);
    } catch (cause) {
      notify(t('log.delete.error', { message: (cause as Error).message }), 'err');
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
        <Skeleton className="h-32 w-full" />
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
            {t('log.title')}
          </h1>
          <p className="mt-1 max-w-prose text-ui text-muted">{t('log.subtitle')}</p>
        </div>
        <Button
          variant="primary"
          glyph
          onClick={() => openQuickSession()}
          aria-label={t('log.action.logHint')}
        >
          {t('log.action.log')}
        </Button>
      </header>

      {/* Totales arriba: semana + racha + volumen (§7.4, §8.4) */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('log.kpi.week')}</span>
            <span className="tnum text-h3 font-bold">{f.hours(week)}</span>
            <span className="text-meta text-muted">
              {t('log.kpi.weekGoal', { goal: f.hours(goalMinutes) })}
            </span>
            {goalMinutes > 0 ? (
              <Progress value={week} max={goalMinutes} label={t('log.kpi.week')} className="mt-1" />
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('log.kpi.streak')}</span>
            <span className="tnum text-h3 font-bold text-accent">
              {t('log.kpi.streakValue', { n: streak, count: streak })}
            </span>
            <span className="text-meta text-muted">{t('log.kpi.streakHint')}</span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('log.kpi.sessions')}</span>
            <span className="tnum text-h3 font-bold">{f.number(sessions.length)}</span>
            <span className="text-meta text-muted">{t('log.list.hint')}</span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('log.kpi.total')}</span>
            <span className="tnum text-h3 font-bold">{f.hours(totalMinutes)}</span>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <StudyHeatmap sessions={sessions} today={today} days={120} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('log.filters.cert')} htmlFor="log-cert">
            <Select
              id="log-cert"
              value={certFilter}
              onChange={(event) => setCertFilter(event.target.value)}
            >
              <option value="">{t('log.filters.certAll')}</option>
              {state.certifications.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.code} · {cert.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('log.filters.type')} htmlFor="log-type">
            <Select
              id="log-type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">{t('log.filters.typeAll')}</option>
              {STUDY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`enum.study.${type}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('log.filters.range')} htmlFor="log-range">
            <Select
              id="log-range"
              value={range}
              onChange={(event) => setRange(event.target.value as Range)}
            >
              {RANGES.map((value) => (
                <option key={value} value={value}>
                  {t(`log.range.${value}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-end">
            <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
              {t('log.filters.clear')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('log.list.title')}</h2>
          <span className="text-meta text-muted">{t('log.list.hint')}</span>
        </CardHead>
        <CardBody className="flex flex-col gap-4">
          {sessions.length === 0 ? (
            <EmptyState
              title={t('log.empty.title')}
              body={t('log.empty.body')}
              action={
                <Button variant="primary" glyph onClick={() => openQuickSession()}>
                  {t('log.action.log')}
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t('log.emptyFiltered.title')}
              body={t('log.emptyFiltered.body')}
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  {t('log.filters.clear')}
                </Button>
              }
            />
          ) : (
            groups.map(([date, items]) => {
              const dayMinutes = items.reduce((sum, item) => sum + item.minutes, 0);
              return (
                <section key={date} aria-labelledby={`log-day-${date}`} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-1.5">
                    <h3 id={`log-day-${date}`} className="flex items-baseline gap-2 text-h3 font-bold">
                      <span className="tnum">{f.date(date)}</span>
                      <span className="text-meta font-normal text-muted">{f.weekday(date)}</span>
                    </h3>
                    <p className="text-meta text-muted">
                      <span
                        className="tnum text-text"
                        aria-label={t('log.day.total', { hours: f.hours(dayMinutes) })}
                      >
                        {f.hours(dayMinutes)}
                      </span>
                      {' · '}
                      {t('log.day.count', { count: items.length })}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {items.map((session) => (
                      <li key={session.id}>
                        <SessionRow session={session} onEdit={setEditing} onDelete={setDeleting} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </CardBody>
      </Card>

      {/* Botón flotante: mismo formulario de cuatro campos del mini-registro (§7.4) */}
      <button
        type="button"
        onClick={() => openQuickSession()}
        aria-label={t('log.action.log')}
        className={cn(
          'fixed bottom-24 right-4 z-40 inline-flex min-h-[44px] items-center gap-1.5 rounded-input border border-transparent',
          'bg-accent px-3.5 text-ui font-medium text-accent-ink shadow-overlay md:bottom-6 md:right-6',
        )}
      >
        <Plus size={16} aria-hidden="true" />
        {t('log.action.log')}
      </button>

      {editing ? (
        <SessionEditModal
          key={editing.id}
          session={editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t('log.delete.title')}
        description={
          deleting
            ? t('log.delete.body', {
                date: f.date(deleting.date),
                minutes: deleting.minutes,
                cert: certById(state, deleting.certId)?.code ?? deleting.certId,
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
              {t('log.delete.confirm')}
            </Button>
          </>
        }
      >
        {deleting ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip>{t(`enum.study.${deleting.type}` as TKey)}</Chip>
            <Chip>{certById(state, deleting.certId)?.code ?? deleting.certId}</Chip>
            <span className="tnum text-ui text-text">{f.minutes(deleting.minutes)}</span>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
