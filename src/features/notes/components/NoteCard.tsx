import { Link } from 'react-router-dom';
import { Copy, Ellipsis } from 'lucide-react';
import { Button, Chip } from '@/components/ui/primitives';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import type { Note } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import { excerpt, productDay } from '../model';
import { HighlightText } from './HighlightText';

export interface NoteCardProps {
  note: Note;
  /** Términos de la búsqueda activa, para resaltar. */
  terms: string[];
  certCode: string | null;
  domainName: string | null;
  onCopy: () => void;
  onCopyForObsidian: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

/** Fila de la lista de notas: metadatos, extracto, copiar y menú `⋯`. */
export function NoteCard({
  note,
  terms,
  certCode,
  domainName,
  onCopy,
  onCopyForObsidian,
  onTogglePin,
  onDelete,
}: NoteCardProps) {
  const { t, f } = useT();
  const title = note.title.trim().length > 0 ? note.title : t('notes.list.untitled');
  const preview = excerpt(note.bodyMd);

  return (
    <article className="rounded-card border border-line bg-panel px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/notas/${note.id}`}
            aria-label={t('notes.list.open', { title })}
            className="block truncate text-body font-medium text-text hover:text-accent hover:no-underline"
          >
            {note.title.trim().length > 0 ? (
              <HighlightText text={note.title} terms={terms} />
            ) : (
              <span className="text-muted">{title}</span>
            )}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-muted">
            {certCode ? <Chip>{certCode}</Chip> : null}
            {domainName ? <span className="truncate">{domainName}</span> : null}
            {note.pinned ? (
              <span className="text-accent">
                <span aria-hidden="true">● </span>
                {t('notes.list.pinned')}
              </span>
            ) : null}
            <span className="tnum">{t('notes.list.updated', { date: f.date(productDay(note.updatedAt)) })}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            aria-label={t('action.copyNote')}
            title={t('action.copyNote')}
            className="min-h-11 min-w-11 md:min-h-8 md:min-w-0"
          >
            <Copy size={15} aria-hidden="true" />
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={t('notes.list.menu', { title })}
                className="flex h-11 w-11 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text"
              >
                <Ellipsis size={16} aria-hidden="true" />
              </button>
            </MenuTrigger>
            <MenuContent ariaLabel={t('notes.list.menu', { title })}>
              <MenuItem onSelect={onCopyForObsidian}>{t('action.copyForObsidian')}</MenuItem>
              <MenuItem onSelect={onTogglePin}>
                {note.pinned ? t('notes.list.unpin', { title }) : t('notes.list.pin', { title })}
              </MenuItem>
              <MenuSeparator />
              <MenuItem danger onSelect={onDelete}>
                {t('notes.delete.action')}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      <p className="mt-1.5 text-ui leading-relaxed text-muted">
        {preview.length > 0 ? <HighlightText text={preview} terms={terms} /> : t('notes.list.noBody')}
      </p>

      {note.tags.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="sr-only">{t('notes.editor.tags')}</span>
          {note.tags.map((tag) => (
            <Chip key={tag}>#{tag}</Chip>
          ))}
        </div>
      ) : null}
    </article>
  );
}
