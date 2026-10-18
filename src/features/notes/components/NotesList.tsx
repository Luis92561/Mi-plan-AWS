import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Button, Card, CardBody, CardHead, EmptyState, Field, Input, Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId, nowIso, useAppState } from '@/data/store';
import type { Note } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import { noteMarkdown, obsidianMarkdown } from '../copy';
import {
  NOTE_TEMPLATES,
  buildNoteIndex,
  emptyDraft,
  matchesAllTerms,
  queryTerms,
  sortNotes,
  type NoteDraft,
} from '../model';
import { useCopy } from '../useCopy';
import { DeleteNoteModal } from './DeleteNoteModal';
import { NoteCard } from './NoteCard';

/**
 * Lista de notas (§7.11): búsqueda local con resaltado, filtro por certificación,
 * plantillas rápidas y acciones de copiar.
 *
 * `/notas?new=1` (paleta de comandos) crea una nota vacía y limpia el query param.
 */
export function NotesList() {
  const { t, locale } = useT();
  const { state } = useAppState();
  const { notify } = useToast();
  const copy = useCopy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [certFilter, setCertFilter] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const newHandled = useRef(false);

  const terms = useMemo(() => queryTerms(query), [query]);
  const index = useMemo(() => buildNoteIndex(state.notes), [state.notes]);
  const certs = useMemo(
    () => [...state.certifications].sort((a, b) => a.code.localeCompare(b.code)),
    [state.certifications],
  );

  const filtered = useMemo(
    () =>
      sortNotes(
        state.notes.filter((note) => {
          if (certFilter && note.certId !== certFilter) return false;
          if (pinnedOnly && !note.pinned) return false;
          if (terms.length === 0) return true;
          return matchesAllTerms(index.get(note.id) ?? '', terms);
        }),
      ),
    [state.notes, certFilter, pinnedOnly, terms, index],
  );

  const createNote = useCallback(
    async (patch: Partial<NoteDraft> = {}) => {
      try {
        const id = newId('note');
        const stamp = nowIso();
        const draft = emptyDraft({ certId: state.settings.activeCertId ?? null, ...patch });
        await getDb().notes.put({ id, source: 'manual', createdAt: stamp, updatedAt: stamp, ...draft });
        navigate(`/notas/${id}`);
      } catch (cause) {
        notify(
          t('common.genericError', { message: cause instanceof Error ? cause.message : String(cause) }),
          'err',
        );
      }
    },
    [navigate, notify, state.settings.activeCertId, t],
  );

  // La paleta enlaza a /notas?new=1: se crea una nota y se limpia el parámetro.
  useEffect(() => {
    if (newHandled.current) return;
    if (searchParams.get('new') !== '1') return;
    newHandled.current = true;
    setSearchParams({}, { replace: true });
    void createNote();
  }, [createNote, searchParams, setSearchParams]);

  const togglePin = async (note: Note) => {
    const title = note.title.trim().length > 0 ? note.title : t('notes.list.untitled');
    try {
      await getDb().notes.put({ ...note, pinned: !note.pinned, updatedAt: nowIso() });
      notify(note.pinned ? t('notes.list.unpin', { title }) : t('notes.list.pin', { title }), 'ok');
    } catch (cause) {
      notify(
        t('common.genericError', { message: cause instanceof Error ? cause.message : String(cause) }),
        'err',
      );
    }
  };

  const clearFilters = () => {
    setQuery('');
    setCertFilter('');
    setPinnedOnly(false);
  };

  const countLabel =
    terms.length > 0
      ? t('notes.search.results', { count: filtered.length })
      : t('notes.count', { count: state.notes.length });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h2 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('notes.title')}
          </h1>
          <p className="mt-1 max-w-prose text-ui text-muted">{t('notes.lead')}</p>
        </div>
        <Button variant="primary" glyph onClick={() => void createNote()} className="min-h-11 md:min-h-10">
          {t('notes.new')}
        </Button>
      </header>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('notes.templates.title')}</h2>
          <span className="text-meta text-muted">{t('notes.templates.hint')}</span>
        </CardHead>
        <CardBody className="flex flex-wrap gap-2">
          {NOTE_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              variant="secondary"
              size="sm"
              onClick={() => void createNote({ title: t(template.titleKey), bodyMd: t(template.bodyKey) })}
              className="min-h-11 md:min-h-8"
            >
              {t(template.titleKey)}
            </Button>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
          <Field label={t('notes.search.label')} htmlFor="notes-q" hint={t('notes.search.scope')}>
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="text-muted">
                <Search size={14} />
              </span>
              <Input
                id="notes-q"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('notes.search.placeholder')}
                autoComplete="off"
                className="min-h-11 md:min-h-9"
              />
              {query.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuery('')}
                  aria-label={t('notes.search.clear')}
                  title={t('notes.search.clear')}
                  className="min-h-11 min-w-11 md:min-h-9 md:min-w-0"
                >
                  <X size={14} aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          </Field>

          <Field label={t('notes.filter.cert')} htmlFor="notes-cert">
            <Select
              id="notes-cert"
              value={certFilter}
              onChange={(event) => setCertFilter(event.target.value)}
              className="min-h-11 md:min-h-9"
            >
              <option value="">{t('notes.filter.allCerts')}</option>
              {certs.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.code} · {cert.name}
                </option>
              ))}
            </Select>
          </Field>

          <Button
            variant={pinnedOnly ? 'secondary' : 'ghost'}
            onClick={() => setPinnedOnly((current) => !current)}
            aria-pressed={pinnedOnly}
            className="min-h-11 self-end justify-self-start md:min-h-9"
          >
            <span aria-hidden="true">{pinnedOnly ? '●' : '○'}</span>
            {t('notes.filter.pinned')}
          </Button>
        </CardBody>
      </Card>

      <p role="status" aria-live="polite" className="tnum text-meta text-muted">
        {countLabel}
      </p>

      {state.notes.length === 0 ? (
        <EmptyState
          title={t('notes.empty.title')}
          body={t('notes.empty.body')}
          action={
            <Button variant="primary" glyph onClick={() => void createNote()} className="min-h-11 md:min-h-10">
              {t('notes.empty.cta')}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('notes.search.emptyTitle')}
          body={t('notes.search.emptyBody')}
          action={
            <Button variant="secondary" onClick={clearFilters} className="min-h-11 md:min-h-10">
              {t('notes.search.clear')}
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((note) => {
            const cert = note.certId ? state.certifications.find((item) => item.id === note.certId) : undefined;
            const domainName =
              cert && note.domainId ? (cert.domains.find((domain) => domain.id === note.domainId)?.name ?? null) : null;
            return (
              <li key={note.id}>
                <NoteCard
                  note={note}
                  terms={terms}
                  certCode={cert?.code ?? null}
                  domainName={domainName}
                  onCopy={() => void copy(noteMarkdown(note))}
                  onCopyForObsidian={() => void copy(obsidianMarkdown(state, note, locale, new Date()).text)}
                  onTogglePin={() => void togglePin(note)}
                  onDelete={() => setDeleting(note)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-meta leading-relaxed text-muted">{t('notes.versions.note')}</p>

      <DeleteNoteModal note={deleting} onOpenChange={(open) => (open ? undefined : setDeleting(null))} onDeleted={() => undefined} />
    </div>
  );
}
