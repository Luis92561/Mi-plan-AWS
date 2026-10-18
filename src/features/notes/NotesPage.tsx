import { Link, useParams } from 'react-router-dom';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { useAppState } from '@/data/store';
import { useT } from '@/lib/i18n/useT';
import { NoteEditor } from './components/NoteEditor';
import { NotesList } from './components/NotesList';

/**
 * Ruta de Notas (§7.11):
 *  · `/notas`      → lista con búsqueda, filtros y plantillas.
 *  · `/notas/:id`  → editor Markdown con autosave.
 */
export function NotesPage() {
  const { t } = useT();
  const { noteId } = useParams<{ noteId: string }>();
  const { state, ready } = useAppState();

  if (!ready) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!noteId) return <NotesList />;

  const note = state.notes.find((item) => item.id === noteId);
  if (!note) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-h2 font-bold">
          <span aria-hidden="true" className="mr-1.5 text-accent">
            ❯
          </span>
          {t('notes.title')}
        </h1>
        <EmptyState
          title={t('notes.notFound.title')}
          body={t('notes.notFound.body')}
          action={
            <Link to="/notas" className="text-ui text-accent">
              {t('notes.notFound.cta')} <span aria-hidden="true">→</span>
            </Link>
          }
        />
      </div>
    );
  }

  // `key` reinicia el borrador y el autosave al cambiar de nota.
  return <NoteEditor key={note.id} note={note} />;
}
