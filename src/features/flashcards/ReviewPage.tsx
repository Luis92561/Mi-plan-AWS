import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHead,
  EmptyState,
  Skeleton,
} from '@/components/ui/primitives';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '@/data/store';
import type { Flashcard } from '@/data/types';
import type { Grade } from '@/domain/sm2';
import { localDate } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import { useReviewActions, type CardInput } from './actions';
import { ALL_DECKS, certificationsWithCards, deckQueue, dueQueue, isFiltering, nextDue, type DeckFilter } from './model';
import { CardFormModal } from './components/CardFormModal';
import { CardTable } from './components/CardTable';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DeckFilterBar } from './components/DeckFilterBar';
import { StudyCard } from './components/StudyCard';

type ViewMode = 'session' | 'all';
type FormState = { kind: 'new' } | { kind: 'edit'; card: Flashcard };

/**
 * Sesión en curso. Guarda una **foto** de las tarjetas elegidas para que el
 * contador "n de m" no cambie cuando cada calificación reprograma su `dueDate`.
 */
interface Session {
  cards: Flashcard[];
  index: number;
}

/**
 * Repaso (§7.7): cola de hoy con `dueCards`, tarjeta con volteo, calificación
 * SM-2 ("Otra vez / Bien / Fácil"), alta/edición/borrado en `Modal` y la vista
 * "todas las tarjetas" con `dueDate`, `ease`, `reps` y `lapses`.
 *
 * Sin red: las escrituras van por `getDb()` y la reactividad la aporta
 * `useAppState()` (LiveQuery sobre IndexedDB).
 */
export function ReviewPage() {
  const { t, f } = useT();
  const { state, ready } = useAppState();
  const actions = useReviewActions();
  const now = useMemo(() => new Date(), []);
  const today = localDate(now);

  const [mode, setMode] = useState<ViewMode>('session');
  const [filter, setFilter] = useState<DeckFilter>(ALL_DECKS);
  const [session, setSession] = useState<Session | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<Flashcard | null>(null);

  const due = useMemo(() => dueQueue(state.flashcards, filter, today), [state.flashcards, filter, today]);
  const deck = useMemo(() => deckQueue(state.flashcards, filter), [state.flashcards, filter]);
  const filterCerts = useMemo(() => {
    const options = certificationsWithCards(state.certifications, state.flashcards);
    if (filter.certId === null || options.some((cert) => cert.id === filter.certId)) return options;
    // La certificación elegida pudo quedarse sin tarjetas: sigue en el select
    // para que el filtro no muestre un valor vacío.
    const selected = state.certifications.find((cert) => cert.id === filter.certId);
    return selected ? [...options, selected] : options;
  }, [state.certifications, state.flashcards, filter.certId]);
  const nextCardDate = useMemo(() => nextDue(deck), [deck]);

  const defaultCertId =
    filter.certId ?? state.settings.activeCertId ?? state.certifications[0]?.id ?? null;

  if (!ready) {
    return (
      <section aria-busy="true" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  const current = session && session.index < session.cards.length ? session.cards[session.index] : null;
  const finished = session !== null && session.index >= session.cards.length;

  const start = (cards: Flashcard[]) => {
    if (cards.length === 0) return;
    setSession({ cards, index: 0 });
    setRevealed(false);
  };

  const grade = async (value: Grade) => {
    if (!current) return;
    // La tarjeta pudo borrarse desde la vista "todas": se salta sin recrearla.
    if (!state.flashcards.some((card) => card.id === current.id)) {
      setRevealed(false);
      setSession((prev) => (prev ? { ...prev, index: prev.index + 1 } : prev));
      return;
    }
    const updated = await actions.grade(current, value);
    if (!updated) return;
    setRevealed(false);
    setSession((prev) => (prev ? { ...prev, index: prev.index + 1 } : prev));
  };

  const saveCard = async (input: CardInput) => {
    const existing = form?.kind === 'edit' ? form.card : null;
    const saved = await actions.save(input, existing);
    if (saved) setForm(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const removed = await actions.remove(deleting);
    if (removed) setDeleting(null);
  };

  const renderSession = () => {
    if (state.flashcards.length === 0) {
      return (
        <EmptyState
          title={t('review.empty.title')}
          body={t('review.empty.body')}
          action={
            <Button
              variant="primary"
              glyph
              className="min-h-[44px]"
              onClick={() => setForm({ kind: 'new' })}
            >
              {t('action.newCard')}
            </Button>
          }
        />
      );
    }

    if (deck.length === 0) {
      return (
        <EmptyState
          title={t('review.filter.empty')}
          action={
            <Button variant="secondary" className="min-h-[44px]" onClick={() => setFilter(ALL_DECKS)}>
              {t('review.filter.clear')}
            </Button>
          }
        />
      );
    }

    if (current) {
      const cert = state.certifications.find((candidate) => candidate.id === current.certId);
      const domain = cert?.domains.find((candidate) => candidate.id === current.domainId);
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-h3 font-bold">
              <span aria-hidden="true" className="mr-1.5 text-accent">
                ❯
              </span>
              {t('review.session.title')}
            </h2>
            <span className="tnum text-meta text-muted">
              {t('review.session.progress', { done: session?.index ?? 0, total: session?.cards.length ?? 0 })}
            </span>
          </div>
          <StudyCard
            card={current}
            certCode={cert?.code ?? current.certId}
            domainName={domain?.name ?? null}
            done={session?.index ?? 0}
            total={session?.cards.length ?? 0}
            revealed={revealed}
            busy={actions.busyId === current.id}
            onFlip={() => setRevealed((value) => !value)}
            onGrade={(value) => {
              void grade(value);
            }}
          />
        </div>
      );
    }

    if (finished && session) {
      return (
        <Card>
          <CardHead>
            <h2 className="text-h3 font-bold">{t('review.session.finishedTitle')}</h2>
            <span className="tnum text-meta text-muted">
              {t('review.session.progress', { done: session.cards.length, total: session.cards.length })}
            </span>
          </CardHead>
          <CardBody className="flex flex-col gap-4">
            <p className="max-w-prose text-ui text-muted">
              {t('review.session.finishedBody', { count: session.cards.length })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                glyph
                className="min-h-[44px]"
                onClick={() => start(due.length > 0 ? due : deck)}
              >
                {t('review.session.again')}
              </Button>
              <Button variant="secondary" className="min-h-[44px]" onClick={() => start(deck)}>
                {t('review.session.allDeck')}
              </Button>
            </div>
          </CardBody>
        </Card>
      );
    }

    if (due.length === 0) {
      return (
        <div className="flex flex-col gap-2">
          <EmptyState
            title={t('review.queue.emptyTitle')}
            body={t('review.queue.emptyBody')}
            action={
              <Button variant="primary" glyph className="min-h-[44px]" onClick={() => start(deck)}>
                {t('review.queue.emptyCta')}
              </Button>
            }
          />
          {nextCardDate ? (
            <p className="tnum text-center text-meta text-muted">
              {t('review.queue.nextDue', { date: f.date(nextCardDate) })}
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('review.queue.title')}
          </h2>
          <span className="tnum text-meta text-muted">{t('review.count', { count: due.length })}</span>
        </CardHead>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              glyph
              className="min-h-[44px]"
              aria-label={t('review.queue.startAria', { count: due.length })}
              onClick={() => start(due)}
            >
              {t('review.queue.start')}
            </Button>
            <Button variant="secondary" className="min-h-[44px]" onClick={() => start(deck)}>
              {t('review.session.allDeck')}
            </Button>
          </div>
          <p className="max-w-prose text-meta text-muted">{t('review.grade.hint')}</p>
        </CardBody>
      </Card>
    );
  };

  return (
    <section className="flex flex-col gap-6">
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
            {t('review.title')}
          </h1>
          <p className="mt-1.5 max-w-prose text-ui text-muted">{t('review.lead')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={due.length > 0 ? 'accent' : 'neutral'}>
            {t('review.count', { count: due.length })}
          </Badge>
          <Button
            variant="primary"
            glyph
            className="min-h-[44px]"
            onClick={() => setForm({ kind: 'new' })}
          >
            {t('action.newCard')}
          </Button>
        </div>
      </header>

      {state.flashcards.length > 0 ? (
        <DeckFilterBar
          certifications={filterCerts}
          cards={state.flashcards}
          filter={filter}
          onChange={(next) => {
            setFilter(next);
            // Cambiar de mazo reinicia la sesión: la cola era de otro mazo.
            setSession(null);
            setRevealed(false);
          }}
        />
      ) : null}

      <TabsRoot value={mode} onValueChange={(value) => setMode(value === 'all' ? 'all' : 'session')}>
        <TabsList ariaLabel={t('review.tabs.label')}>
          <TabsTrigger value="session">{t('review.tab.session')}</TabsTrigger>
          <TabsTrigger value="all">{t('review.tab.all')}</TabsTrigger>
        </TabsList>

        <TabsContent value="session">{renderSession()}</TabsContent>

        <TabsContent value="all">
          {deck.length === 0 ? (
            <div className="flex flex-col gap-3">
              <EmptyState
                title={state.flashcards.length === 0 ? t('review.empty.title') : t('review.filter.empty')}
                body={state.flashcards.length === 0 ? t('review.empty.body') : undefined}
                action={
                  state.flashcards.length === 0 ? (
                    <Button
                      variant="primary"
                      glyph
                      className="min-h-[44px]"
                      onClick={() => setForm({ kind: 'new' })}
                    >
                      {t('action.newCard')}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="min-h-[44px]"
                      onClick={() => setFilter(ALL_DECKS)}
                    >
                      {t('review.filter.clear')}
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-h3 font-bold">
                  <span aria-hidden="true" className="mr-1.5 text-accent">
                    ❯
                  </span>
                  {t('review.all.title')}
                </h2>
                <span className="tnum text-meta text-muted">
                  {t('review.all.hint', { count: deck.length })}
                </span>
              </div>
              <Card>
                <CardTable
                  cards={deck}
                  certifications={state.certifications}
                  today={today}
                  busyId={actions.busyId}
                  onEdit={(card) => setForm({ kind: 'edit', card })}
                  onDelete={(card) => setDeleting(card)}
                />
              </Card>
              {isFiltering(filter) ? (
                <div>
                  <Button variant="ghost" size="sm" onClick={() => setFilter(ALL_DECKS)}>
                    {t('review.filter.clear')}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>
      </TabsRoot>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('review.note.title')}
          </h2>
        </CardHead>
        <CardBody>
          <p className="max-w-prose text-ui text-muted">{t('review.note.body')}</p>
        </CardBody>
      </Card>

      {form ? (
        <CardFormModal
          key={form.kind === 'edit' ? form.card.id : 'new'}
          card={form.kind === 'edit' ? form.card : null}
          certifications={state.certifications}
          defaultCertId={defaultCertId}
          busy={actions.busyId !== null}
          onClose={() => setForm(null)}
          onSubmit={(input) => {
            void saveCard(input);
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('review.deleteTitle')}
          body={t('review.deleteBody')}
          confirmLabel={t('review.deleteConfirm')}
          busy={actions.busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            void confirmDelete();
          }}
        />
      ) : null}
    </section>
  );
}
