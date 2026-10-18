import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Ellipsis } from 'lucide-react';
import { Button, Card, CardBody, CardHead, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Switch } from '@/components/ui/toggle';
import { useAppState } from '@/data/store';
import type { Note } from '@/data/types';
import { applyFormat, tagsFromInput, tagsToInput, type MarkdownFormat } from '../model';
import { cn } from '@/lib/cn';
import { localTime } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import { noteMarkdown, obsidianMarkdown } from '../copy';
import { useCopy } from '../useCopy';
import { useNoteAutosave } from '../useNoteAutosave';
import { DeleteNoteModal } from './DeleteNoteModal';
import { FormatBar } from './FormatBar';
import { MarkdownPreview } from './MarkdownPreview';

type Pane = 'edit' | 'preview';

/**
 * Editor de una nota (§7.11): metadatos, barra de formato mínima, autosave de
 * 600 ms y vista previa dividida en desktop / pestañas en móvil.
 */
export function NoteEditor({ note }: { note: Note }) {
  const { t, locale } = useT();
  const { state } = useAppState();
  const navigate = useNavigate();
  const copy = useCopy();
  const { draft, dirty, saving, savedAt, error, update, flush, retry, discard } = useNoteAutosave(note);

  const [pane, setPane] = useState<Pane>('edit');
  const [tagsText, setTagsText] = useState(() => tagsToInput(note.tags));
  const [deleting, setDeleting] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<[number, number] | null>(null);

  const displayTitle = draft.title.trim().length > 0 ? draft.title : t('notes.list.untitled');

  const cert = draft.certId ? state.certifications.find((item) => item.id === draft.certId) : undefined;
  const certs = useMemo(
    () => [...state.certifications].sort((a, b) => a.code.localeCompare(b.code)),
    [state.certifications],
  );
  const domains = cert?.domains ?? [];
  const topics = useMemo(
    () =>
      cert
        ? state.topics
            .filter((topic) => topic.certId === cert.id)
            .sort((a, b) => a.title.localeCompare(b.title))
        : [],
    [state.topics, cert],
  );

  /* --------------------------------------------------------------- atajos */

  // Ctrl/Cmd+S guarda ya, sin esperar el debounce (§7.11).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      void flush();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flush]);

  // La selección del `textarea` se restaura después de insertar la sintaxis.
  useEffect(() => {
    const element = bodyRef.current;
    const pending = pendingSelection.current;
    if (!element || !pending) return;
    pendingSelection.current = null;
    element.focus();
    element.setSelectionRange(pending[0], pending[1]);
  }, [draft.bodyMd]);

  const runFormat = useCallback(
    (format: MarkdownFormat) => {
      const element = bodyRef.current;
      if (!element) return;
      const result = applyFormat(format, element.value, element.selectionStart, element.selectionEnd);
      pendingSelection.current = [result.selectionStart, result.selectionEnd];
      update({ bodyMd: result.value });
    },
    [update],
  );

  const goBack = () => {
    void flush().then(() => navigate('/notas'));
  };

  const copyNote = () => {
    void copy(noteMarkdown({ ...note, ...draft }));
  };

  const copyForObsidian = () => {
    void copy(obsidianMarkdown(state, { ...note, ...draft }, locale, new Date()).text);
  };

  const statusText = saving
    ? t('notes.status.saving')
    : dirty
      ? t('notes.status.pending')
      : savedAt
        ? t('common.savedAt', { time: localTime(new Date(savedAt)) })
        : t('notes.autosave.hint');
  const statusGlyph = saving ? '◐' : dirty ? '▲' : '●';

  return (
    <div className="flex flex-col gap-3">
      <h1 className="sr-only">{displayTitle}</h1>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={goBack} className="min-h-11 md:min-h-8">
          <ArrowLeft size={15} aria-hidden="true" />
          {t('notes.editor.back')}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={copyNote} className="min-h-11 md:min-h-8">
            <Copy size={14} aria-hidden="true" />
            {t('action.copyNote')}
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={t('notes.list.menu', { title: displayTitle })}
                className="flex h-11 w-11 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text"
              >
                <Ellipsis size={16} aria-hidden="true" />
              </button>
            </MenuTrigger>
            <MenuContent ariaLabel={t('notes.list.menu', { title: displayTitle })}>
              <MenuItem onSelect={copyForObsidian}>{t('action.copyForObsidian')}</MenuItem>
              <MenuSeparator />
              <MenuItem
                danger
                onSelect={() => {
                  // Se guarda lo pendiente antes de confirmar: si se borra, no
                  // queda ningún volcado en cola que pudiera resucitar la nota.
                  void flush();
                  setDeleting(true);
                }}
              >
                {t('notes.delete.action')}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      {/* Indicador de guardado: única región viva de estado (§7.11, §9.8). */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 rounded-input border px-2.5 py-1.5 text-meta',
          dirty ? 'border-warn/45 text-warn' : 'border-line text-muted',
        )}
      >
        <p role="status" aria-live="polite" aria-atomic="true" className="flex items-center gap-2">
          <span aria-hidden="true">{statusGlyph}</span>
          <span className="tnum">{statusText}</span>
        </p>
        <span className="text-muted">{t('notes.autosave.hint')}</span>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-err/45 bg-panel px-3 py-2 text-ui text-err"
        >
          <span>
            <span aria-hidden="true">▲ </span>
            {t('notes.status.error', { message: error })}
          </span>
          <Button variant="secondary" size="sm" onClick={retry} className="min-h-11 md:min-h-8">
            {t('notes.status.retry')}
          </Button>
        </div>
      ) : null}

      <Field label={t('notes.editor.titleLabel')} htmlFor="note-title">
        <Input
          id="note-title"
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder={t('notes.editor.titlePlaceholder')}
          autoComplete="off"
          className="h-11 text-h3"
        />
      </Field>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('notes.editor.meta')}</h2>
          <span className="text-meta text-muted">{t('notes.editor.metaHint')}</span>
        </CardHead>
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('notes.editor.cert')} htmlFor="note-cert">
            <Select
              id="note-cert"
              value={draft.certId ?? ''}
              onChange={(event) => update({ certId: event.target.value || null, domainId: null, topicId: null })}
              className="min-h-11 md:min-h-9"
            >
              <option value="">{t('notes.editor.none')}</option>
              {certs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t('notes.editor.domain')}
            htmlFor="note-domain"
            hint={cert ? undefined : t('notes.editor.noDomainHint')}
          >
            <Select
              id="note-domain"
              value={draft.domainId ?? ''}
              onChange={(event) => update({ domainId: event.target.value || null })}
              disabled={domains.length === 0}
              className="min-h-11 md:min-h-9"
            >
              <option value="">{t('notes.editor.none')}</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('notes.editor.topic')} htmlFor="note-topic">
            <Select
              id="note-topic"
              value={draft.topicId ?? ''}
              onChange={(event) => update({ topicId: event.target.value || null })}
              disabled={topics.length === 0}
              className="min-h-11 md:min-h-9"
            >
              <option value="">{t('notes.editor.none')}</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t('notes.editor.tags')}
            htmlFor="note-tags"
            hint={t('notes.editor.tagsHint')}
            className="sm:col-span-2 lg:col-span-3"
          >
            <Input
              id="note-tags"
              value={tagsText}
              onChange={(event) => {
                setTagsText(event.target.value);
                update({ tags: tagsFromInput(event.target.value) });
              }}
              placeholder={t('notes.editor.tagsPlaceholder')}
              autoComplete="off"
              className="min-h-11 md:min-h-9"
            />
          </Field>

          <div className="flex min-h-11 items-center justify-between gap-3 rounded-input border border-line px-2.5 sm:col-span-2 lg:col-span-3">
            <span className="text-ui text-text">{t('notes.editor.pinned')}</span>
            <Switch
              checked={draft.pinned}
              onCheckedChange={(checked) => update({ pinned: checked })}
              label={t('notes.editor.pinned')}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('notes.editor.pane')}</h2>
        </CardHead>
        <CardBody className="flex flex-col gap-3">
          {/* Pestañas Editar / Vista: solo cuando no cabe la vista dividida (§9.9). */}
          <div
            role="tablist"
            aria-label={t('notes.editor.pane')}
            className="flex gap-1 rounded-input border border-line p-0.5 lg:hidden"
          >
            {(['edit', 'preview'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`note-tab-${value}`}
                aria-selected={pane === value}
                aria-controls={`note-pane-${value}`}
                tabIndex={pane === value ? 0 : -1}
                onClick={() => setPane(value)}
                className={cn(
                  'min-h-11 flex-1 rounded-input px-2 text-ui transition-colors duration-hover',
                  pane === value ? 'bg-hover font-medium text-text' : 'text-muted',
                )}
              >
                {value === 'edit' ? t('notes.editor.tab.edit') : t('notes.editor.tab.preview')}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section
              id="note-pane-edit"
              role="tabpanel"
              aria-labelledby="note-tab-edit"
              className={cn('flex min-w-0 flex-col gap-2', pane === 'preview' && 'hidden lg:flex')}
            >
              <FormatBar onFormat={runFormat} />
              <Field label={t('notes.editor.body')} htmlFor="note-body">
                <Textarea
                  id="note-body"
                  ref={bodyRef}
                  value={draft.bodyMd}
                  onChange={(event) => update({ bodyMd: event.target.value })}
                  onKeyDown={(event) => {
                    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
                    const key = event.key.toLowerCase();
                    if (key === 'b') {
                      event.preventDefault();
                      runFormat('bold');
                    }
                    if (key === 'k') {
                      // Ctrl/Cmd+K está reservado para el enlace dentro del editor:
                      // se frena el burbujeo para que no abra la paleta de comandos.
                      event.preventDefault();
                      event.stopPropagation();
                      runFormat('link');
                    }
                  }}
                  placeholder={t('notes.editor.bodyPlaceholder')}
                  rows={18}
                  spellCheck={false}
                  className="min-h-[46dvh] text-body leading-relaxed lg:min-h-[56dvh]"
                />
              </Field>
            </section>

            <section
              id="note-pane-preview"
              role="tabpanel"
              aria-labelledby="note-tab-preview"
              className={cn('flex min-w-0 flex-col gap-2', pane === 'edit' && 'hidden lg:flex')}
            >
              <span className="label-mono">{t('notes.editor.previewTitle')}</span>
              <div className="min-h-[24dvh] overflow-x-auto rounded-card border border-line bg-panel/60 px-3 py-2.5">
                <MarkdownPreview markdown={draft.bodyMd} emptyLabel={t('notes.editor.previewEmpty')} />
              </div>
            </section>
          </div>
        </CardBody>
      </Card>

      <p className="text-meta leading-relaxed text-muted">{t('notes.versions.note')}</p>

      <DeleteNoteModal
        note={deleting ? note : null}
        onOpenChange={(open) => setDeleting(open)}
        onDeleted={() => {
          discard();
          navigate('/notas', { replace: true });
        }}
      />
    </div>
  );
}
