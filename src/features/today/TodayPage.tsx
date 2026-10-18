import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { certById, domainById, useAppState } from '@/data/store';
import type { Topic } from '@/data/types';
import { buildTodayQueue, topicUrgency } from '@/domain/today';
import { localDate } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import { useQuickSession } from '@/features/studylog/QuickSession';
import { Badge, Button, Card, EmptyState, SectionHead, Skeleton } from '@/components/ui/primitives';
import { useTodayActions } from './actions';
import { topicMinutes } from './minutes';
import { AlertRow } from './components/AlertRow';
import { ChecklistRow } from './components/ChecklistRow';
import { EmptyLine } from './components/EmptyLine';
import { StudyInlineForm, type StudyFormValues } from './components/StudyInlineForm';
import { TopicRow } from './components/TopicRow';

/**
 * §7.9 — "Hoy", la bandeja diaria. Tres bloques en este orden:
 *  01 temas que vencen (`buildTodayQueue`), 02 checklist pendiente, 03 avisos.
 *
 * Reglas que cumple esta pantalla:
 *  - Todo el cálculo viene de `buildTodayQueue(state, new Date())`: aquí no se
 *    reimplementa prioridad, urgencia ni progreso.
 *  - *Estudiar* abre el mini-registro **en línea**: nunca se navega fuera.
 *  - Sin `fetch`; las escrituras van por `getDb()` y la reactividad la aporta
 *    `useAppState()` (LiveQuery sobre IndexedDB).
 *  - Acciones siempre visibles (también en móvil) y objetivo táctil ≥ 44 px.
 */

/** Ítems de checklist que se muestran sin desplegar (el resto, a un clic). */
const CHECKLIST_PAGE_SIZE = 5;

export function TodayPage() {
  const { t } = useT();
  const { state, ready } = useAppState();
  const navigate = useNavigate();
  const { openQuickSession } = useQuickSession();
  const actions = useTodayActions(state);

  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [emptyStudyOpen, setEmptyStudyOpen] = useState(false);

  const queue = useMemo(() => buildTodayQueue(state, new Date()), [state]);
  const now = new Date();
  const today = localDate(now);

  const activeCert = certById(state, state.settings.activeCertId);
  const activeCode = activeCert?.code ?? null;

  /** Siguiente tema para el estado vacío: el de revisión más próxima de la certificación activa. */
  const nextTopic = useMemo<Topic | null>(() => {
    const live = state.topics.filter((topic) => topic.status !== 'dominado' && topic.status !== 'archivado');
    if (live.length === 0) return null;
    const preferred = activeCert ? live.filter((topic) => topic.certId === activeCert.id) : [];
    const pool =
      preferred.length > 0
        ? preferred
        : live.filter(
            (topic) => queue.activeCertIds.length === 0 || queue.activeCertIds.includes(topic.certId),
          );
    if (pool.length === 0) return null;
    const sorted = [...pool].sort((a, b) =>
      (a.nextReviewAt ?? '9999').localeCompare(b.nextReviewAt ?? '9999'),
    );
    return sorted[0];
  }, [activeCert, queue.activeCertIds, state.topics]);

  const nothingToDo = queue.topics.length === 0 && queue.checklist.length === 0;

  // La bandeja se lee en 30 segundos: se muestran los 5 primeros ítems y el resto
  // queda a un clic («ver los N restantes»), sin ocultar información.
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const visibleChecklist = showAllChecklist
    ? queue.checklist
    : queue.checklist.slice(0, CHECKLIST_PAGE_SIZE);
  const remainingChecklist = Math.max(0, queue.checklist.length - visibleChecklist.length);

  const saveStudy = async (topic: Topic, values: StudyFormValues) => {
    const saved = await actions.study(topic, values);
    if (saved) setRecordingId(null);
  };

  const saveNextTopic = async (values: StudyFormValues) => {
    if (!nextTopic) return;
    const saved = await actions.study(nextTopic, values);
    if (saved) setEmptyStudyOpen(false);
  };

  /** "Abrir nota": la nota ligada al tema; si no existe, el listado de notas. */
  const openNote = (topic: Topic) => {
    const note = state.notes.find((item) => item.topicId === topic.id);
    navigate(note ? `/notas/${note.id}` : '/notas');
  };

  const startEmptyStudy = () => {
    if (nextTopic) setEmptyStudyOpen(true);
    else openQuickSession({ certId: activeCert?.id });
  };

  if (!ready) {
    return (
      <section aria-busy="true" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-52" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-36 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-7">
      {/* Última escritura, para lectores de pantalla (§9.8). */}
      <p role="status" aria-live="polite" className="sr-only">
        {actions.status}
      </p>

      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="flex items-baseline gap-2 text-h2 font-bold">
            <span aria-hidden="true" className="text-accent">
              ❯
            </span>
            {t('today.title')}
          </h1>
          <p className="mt-1.5 text-ui text-muted">{t('today.lead')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={queue.badge > 0 ? 'accent' : 'neutral'}>
            {t('today.count', { count: queue.badge })}
          </Badge>
          <Button
            variant="secondary"
            className="min-h-[44px]"
            onClick={() => openQuickSession({ certId: activeCert?.id })}
          >
            {t('today.logSession')}
          </Button>
        </div>
      </header>

      {nothingToDo ? (
        <div className="flex flex-col gap-3">
          <EmptyState
            title={
              activeCode
                ? t('today.empty', { cert: activeCode })
                : t('today.emptyNoCert')
            }
            body={t('today.emptyBody')}
            action={
              <Button variant="primary" glyph className="min-h-[44px]" onClick={startEmptyStudy}>
                {t('today.emptyCta')}
              </Button>
            }
          />
          {emptyStudyOpen && nextTopic ? (
            <StudyInlineForm
              id="today-empty-study"
              title={nextTopic.title}
              defaultMinutes={topicMinutes(nextTopic, state)}
              busy={actions.busyId === nextTopic.id}
              onCancel={() => setEmptyStudyOpen(false)}
              onSave={saveNextTopic}
            />
          ) : null}
        </div>
      ) : (
        <>
          {/* 01 — Temas que vencen */}
          <div>
            <SectionHead
              no="01"
              title={t('today.topics.title')}
              hint={t('today.topics.hint', { count: queue.topics.length })}
            />
            {queue.topics.length === 0 ? (
              <EmptyLine text={t('today.topics.empty')} />
            ) : (
              <Card>
                <ul>
                  {queue.topics.map((topic) => {
                    const cert = certById(state, topic.certId);
                    return (
                      <TopicRow
                        key={topic.id}
                        topic={topic}
                        certCode={cert?.code ?? topic.certId}
                        certName={cert?.name ?? topic.certId}
                        domainName={domainById(state, topic.certId, topic.domainId)?.name ?? null}
                        minutes={topicMinutes(topic, state)}
                        overdue={topicUrgency(topic, now) === 'overdue'}
                        recording={recordingId === topic.id}
                        busy={actions.busyId === topic.id}
                        onStartStudy={() => setRecordingId(topic.id)}
                        onCancelStudy={() => setRecordingId(null)}
                        onSaveStudy={(values) => {
                          void saveStudy(topic, values);
                        }}
                        onSnooze={(days) => {
                          void actions.snooze(topic, days);
                        }}
                        onOpenNote={() => openNote(topic)}
                        onArchive={() => {
                          void actions.archive(topic);
                        }}
                      />
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>

          {/* 02 — Checklist pendiente */}
          <div>
            <SectionHead
              no="02"
              title={t('today.checklist.title')}
              hint={t('today.checklist.hint', { count: queue.checklist.length })}
            />
            {queue.checklist.length === 0 ? (
              <EmptyLine text={t('today.checklist.empty')} />
            ) : (
              <>
                <Card>
                  <ul>
                    {visibleChecklist.map((item) => (
                      <ChecklistRow
                        key={item.id}
                        item={item}
                        certCode={certById(state, item.certId)?.code ?? item.certId}
                        overdue={item.dueDate !== null && item.dueDate < today}
                        busy={actions.busyId === item.id}
                        onDone={() => {
                          void actions.completeChecklist(item);
                        }}
                      />
                    ))}
                  </ul>
                </Card>
                {remainingChecklist > 0 || showAllChecklist ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-meta text-muted" role="status">
                      {t('today.checklist.trimmed', {
                        shown: visibleChecklist.length,
                        total: queue.checklist.length,
                      })}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllChecklist((current) => !current)}
                      aria-expanded={showAllChecklist}
                    >
                      {showAllChecklist
                        ? t('today.checklist.less')
                        : t('today.checklist.more', {
                            count: remainingChecklist,
                            n: remainingChecklist,
                          })}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      )}

      {/* 03 — Avisos */}
      <div>
        <SectionHead
          no={nothingToDo ? '01' : '03'}
          title={t('today.alerts.title')}
          hint={t('today.alerts.hint')}
        />
        {queue.alerts.length === 0 ? (
          <EmptyLine text={t('today.alerts.empty')} />
        ) : (
          <ul className="flex flex-col gap-2">
            {queue.alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
