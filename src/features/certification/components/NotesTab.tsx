import { Link } from 'react-router-dom';
import type { Note } from '@/data/types';
import { useT } from '@/lib/i18n/useT';

export interface NotesTabProps {
  notes: Note[];
}

/** Pestaña Notas (§7.3): notas vinculadas a la certificación, con enlace a su editor. */
export function NotesTab({ notes }: NotesTabProps) {
  const { t, f } = useT();
  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-ui text-muted">{t('cert.notes.empty')}</p>
        <Link to="/notas?new=1" className="text-meta text-accent">
          {t('cert.notes.new')} <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((note) => (
        <li key={note.id} className="rounded-card border border-line bg-panel px-3 py-2.5">
          <Link
            to={`/notas/${note.id}`}
            aria-label={t('cert.notes.open', { title: note.title })}
            className="flex items-baseline justify-between gap-2 text-ui font-medium text-text hover:text-accent hover:no-underline"
          >
            <span className="truncate">{note.title}</span>
            {note.pinned ? (
              <span aria-hidden="true" className="text-accent">
                ●
              </span>
            ) : null}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
            <span className="tnum">{t('cert.notes.updated', { date: f.date(note.updatedAt) })}</span>
            {note.tags.length > 0 ? (
              <span className="truncate">
                {note.tags.map((tag) => `#${tag}`).join(' ')}
              </span>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
