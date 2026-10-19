import { useMemo, useState, type ChangeEvent } from 'react';
import { Download, Pencil, Plus, Timer, Trash2, Upload } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHead,
  Chip,
  EmptyState,
  Field,
  Input,
  Progress,
  SectionHead,
  Select,
  Textarea,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { downloadText } from '@/data/backup';
import { getDb } from '@/data/db';
import type { AppState, Certification, Question } from '@/data/types';
import {
  buildQuestions,
  parseQuestionsCsv,
  parseQuestionsJson,
  questionsByDomain,
  questionsCsvTemplate,
  type QuestionParseResult,
} from '@/domain/questions';
import { useT } from '@/lib/i18n/useT';
import { QuestionEditModal } from './QuestionEditModal';

/** Zona táctil mínima de 44 px en móvil y compacta en escritorio (§9.8). */
const TAP = 'min-h-[44px] sm:min-h-[32px]';

/** El `input` real queda `sr-only`; el foco se dibuja en la etiqueta (§9.8). */
const FILE_PICKER = [
  'inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-input border border-control',
  'px-3.5 text-ui text-text transition-colors duration-hover hover:bg-hover sm:min-h-[36px]',
  'focus-within:border-accent focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
].join(' ');

const TEMPLATE_FILENAME = 'preguntas-plantilla.csv';

/** Límite del import de banco (F-04): el respaldo JSON usa 20 MB; aquí basta 5 MB. */
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

type ImportFormat = 'auto' | 'json' | 'csv';

/** Por extensión o, si no hay, por el primer carácter: `{`/`[` ⇒ JSON. */
function detectFormat(text: string, format: ImportFormat): 'json' | 'csv' {
  if (format !== 'auto') return format;
  const head = text.trimStart()[0];
  return head === '{' || head === '[' ? 'json' : 'csv';
}

function parseImportText(
  text: string,
  format: ImportFormat,
  certifications: Certification[],
  defaultCertId: string | undefined,
): QuestionParseResult {
  if (text.trim().length === 0) return { items: [], issues: [] };
  const options = { certifications, defaultCertId };
  return detectFormat(text, format) === 'json'
    ? parseQuestionsJson(text, options)
    : parseQuestionsCsv(text, options);
}

function letterOf(index: number): string {
  return String.fromCharCode(65 + index);
}

function shortText(value: string, max = 60): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function byNewest(a: Question, b: Question): number {
  if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt);
  return a.prompt.localeCompare(b.prompt);
}

export interface QuestionBankSectionProps {
  state: AppState;
  /** Abre el simulacro ponderado para la certificación indicada. */
  onStartMock: (certId: string) => void;
}

/**
 * Banco de preguntas propio (F3.2): resumen por dominio, importación CSV/JSON con
 * vista previa, gestión (editar, eliminar, archivar en bloque) y lanzamiento del
 * simulacro ponderado. Nunca admite preguntas reales de examen.
 */
export function QuestionBankSection({ state, onStartMock }: QuestionBankSectionProps) {
  const { t, f } = useT();
  const { notify } = useToast();

  // Certificación del banco por defecto: la activa si ya tiene preguntas; si no,
  // la primera que tenga alguna (así el simulacro nunca arranca deshabilitado).
  const [summaryCertId, setSummaryCertId] = useState(() => {
    const active = state.settings.activeCertId;
    const hasActive = active !== null && state.questions.some((question) => question.certId === active);
    if (hasActive) return active as string;
    const withQuestions = state.certifications.find((cert) =>
      state.questions.some((question) => question.certId === cert.id),
    );
    return withQuestions?.id ?? active ?? state.certifications[0]?.id ?? '';
  });
  const [filterCertId, setFilterCertId] = useState('');
  const [filterDomainId, setFilterDomainId] = useState('');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState<ImportFormat>('auto');
  const [importName, setImportName] = useState<string | null>(null);

  const [editing, setEditing] = useState<Question | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [bulkCert, setBulkCert] = useState<Certification | null>(null);
  const [busy, setBusy] = useState(false);

  const summaryCert = state.certifications.find((cert) => cert.id === summaryCertId) ?? state.certifications[0];
  const certQuestions = summaryCert
    ? state.questions.filter((question) => question.certId === summaryCert.id)
    : [];
  const activeCertQuestions = certQuestions.filter((question) => !question.archived);
  const archivedCount = certQuestions.length - activeCertQuestions.length;
  const unassignedCount = activeCertQuestions.filter(
    (question) => !summaryCert?.domains.some((domain) => domain.id === question.domainId),
  ).length;
  const domainRows = summaryCert ? questionsByDomain(state.questions, summaryCert) : [];
  const summaryTotal = activeCertQuestions.length;

  const parsedImport = useMemo(
    () => parseImportText(importText, importFormat, state.certifications, summaryCert?.id),
    [importText, importFormat, state.certifications, summaryCert?.id],
  );
  const builtImport = useMemo(
    () => buildQuestions(parsedImport.items, new Date(), state.questions),
    [parsedImport.items, state.questions],
  );
  const duplicateCount = parsedImport.items.length - builtImport.length;

  const domainNameOf = (domainId: string | null): string => {
    if (!domainId) return t('practice.bank.import.noDomain');
    const found = state.certifications
      .flatMap((cert) => cert.domains)
      .find((domain) => domain.id === domainId);
    return found?.name ?? domainId;
  };

  const coverage = (() => {
    const counts = new Map<string | null, number>();
    for (const item of parsedImport.items) {
      counts.set(item.domainId, (counts.get(item.domainId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([domainId, count]) => ({
      key: domainId ?? '__none',
      name: domainNameOf(domainId),
      count,
    }));
  })();

  const domainOptions = useMemo(() => {
    const scope = filterCertId
      ? state.certifications.filter((cert) => cert.id === filterCertId)
      : state.certifications;
    const names = new Map<string, string>();
    for (const cert of scope) {
      for (const domain of cert.domains) {
        if (!names.has(domain.id)) names.set(domain.id, domain.name);
      }
    }
    return [...names.entries()].map(([id, name]) => ({ id, name }));
  }, [state.certifications, filterCertId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...state.questions]
      .filter((question) => (filterCertId === '' ? true : question.certId === filterCertId))
      .filter((question) => {
        if (filterDomainId === '') return true;
        if (filterDomainId === '__none') return question.domainId === null;
        return question.domainId === filterDomainId;
      })
      .filter((question) => (showArchived ? true : !question.archived))
      .filter((question) => {
        if (term === '') return true;
        return (
          question.prompt.toLowerCase().includes(term) ||
          question.tags.some((tag) => tag.toLowerCase().includes(term))
        );
      })
      .sort(byNewest);
  }, [state.questions, filterCertId, filterDomainId, showArchived, search]);

  const resetFilters = () => {
    setFilterCertId('');
    setFilterDomainId('');
    setSearch('');
    setShowArchived(false);
  };

  /* ---------------------------------------------------------------- plantilla */

  const downloadTemplate = () => {
    try {
      downloadText(TEMPLATE_FILENAME, questionsCsvTemplate(), 'text/csv');
      notify(t('practice.bank.import.templateDone', { name: TEMPLATE_FILENAME }), 'ok');
    } catch (cause) {
      notify(t('practice.bank.import.readError', { message: (cause as Error).message }), 'err');
    }
  };

  /* ---------------------------------------------------------------- importar */

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      notify(t('practice.bank.import.fileTooBig'), 'err');
      return;
    }
    try {
      const text = await file.text();
      if (text.trim().length === 0) {
        notify(t('practice.bank.import.emptyFile'), 'err');
        return;
      }
      const lower = file.name.toLowerCase();
      setImportName(file.name);
      setImportFormat(lower.endsWith('.json') ? 'json' : lower.endsWith('.csv') ? 'csv' : 'auto');
      setImportText(text);
    } catch (cause) {
      notify(t('practice.bank.import.readError', { message: (cause as Error).message }), 'err');
    }
  };

  const clearImport = () => {
    setImportText('');
    setImportFormat('auto');
    setImportName(null);
  };

  const runImport = async () => {
    if (builtImport.length === 0) return;
    setBusy(true);
    try {
      await getDb().questions.bulkPut(builtImport);
      notify(t('practice.bank.import.done', { count: builtImport.length }), 'ok');
      clearImport();
    } catch (cause) {
      notify(t('practice.bank.import.error', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  /* ----------------------------------------------------------------- gestión */

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };

  const openEdit = (question: Question) => {
    setEditing(question);
    setEditOpen(true);
  };

  const archiveFiltered = async (archived: boolean) => {
    if (filtered.length === 0) return;
    setBusy(true);
    try {
      await getDb().questions.bulkPut(
        filtered.map((question) => ({ ...question, archived: archived ? true : undefined })),
      );
      notify(
        t(archived ? 'practice.bank.bulk.archiveDone' : 'practice.bank.bulk.unarchiveDone', {
          count: filtered.length,
        }),
        'ok',
      );
    } catch (cause) {
      notify(t('practice.bank.bulk.error', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await getDb().questions.delete(deleting.id);
      notify(t('practice.bank.delete.done'), 'ok');
      setDeleting(null);
    } catch (cause) {
      notify(t('practice.bank.delete.error', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (!bulkCert) return;
    const ids = state.questions.filter((question) => question.certId === bulkCert.id).map((question) => question.id);
    setBusy(true);
    try {
      await getDb().questions.bulkDelete(ids);
      notify(t('practice.bank.bulk.deleted', { count: ids.length }), 'ok');
      setBulkCert(null);
    } catch (cause) {
      notify(t('practice.bank.bulk.error', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------------------------------------------- UI */

  return (
    <section aria-label={t('practice.bank.title')} className="flex flex-col gap-3">
      <SectionHead
        title={t('practice.bank.title')}
        hint={t('practice.bank.hint')}
        action={
          <Button
            variant="secondary"
            className={TAP}
            onClick={() => onStartMock(summaryCert?.id ?? '')}
            aria-label={t('practice.bankMock.action')}
            disabled={summaryTotal === 0 || !summaryCert}
          >
            <Timer size={15} aria-hidden="true" />
            {t('practice.bankMock.action')}
          </Button>
        }
      />

      <p className="flex flex-wrap items-baseline gap-x-1.5 text-meta text-muted">
        <span aria-hidden="true" className="text-warn">
          ▲
        </span>
        {t('practice.bank.notice')}
      </p>

      <Card>
        <CardHead>
          <h3 className="text-ui font-bold">{t('practice.bank.import.title')}</h3>
          <span className="text-meta text-muted">{t('practice.bank.import.hint')}</span>
        </CardHead>
        <CardBody className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
            <Field label={t('practice.bank.summary.cert')} htmlFor="bank-cert">
              <Select
                id="bank-cert"
                value={summaryCert?.id ?? ''}
                onChange={(event) => setSummaryCertId(event.target.value)}
              >
                {state.certifications.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.code} · {cert.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="label-mono">{t('practice.bank.summary.total')}</span>
              <span className="tnum text-h3 font-bold text-accent">{f.number(summaryTotal)}</span>
              {archivedCount > 0 ? (
                <Chip>{t('practice.bank.summary.archived', { count: archivedCount })}</Chip>
              ) : null}
              {unassignedCount > 0 ? (
                <Chip>{t('practice.bank.summary.unassigned', { count: unassignedCount })}</Chip>
              ) : null}
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {domainRows.map((row) => (
              <li key={row.domainId} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="min-w-0 text-ui text-text">{row.name}</span>
                  <span className="tnum shrink-0 text-meta text-muted">
                    {t('practice.bank.summary.domainCount', { count: row.count })}
                  </span>
                </div>
                <Progress
                  value={row.count}
                  max={Math.max(1, summaryTotal)}
                  tone={row.count === 0 ? 'warn' : 'accent'}
                  label={row.name}
                />
                {row.count === 0 ? (
                  <p className="text-meta text-warn">
                    <span aria-hidden="true">▲ </span>
                    {t('practice.bank.summary.emptyDomain')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <label className={FILE_PICKER}>
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="sr-only"
                disabled={busy}
                onChange={(event) => void onFile(event)}
              />
              <Upload size={15} aria-hidden="true" />
              {t('practice.bank.import.file')}
            </label>
            <Button className={TAP} onClick={downloadTemplate}>
              <Download size={15} aria-hidden="true" />
              {t('practice.bank.import.template')}
            </Button>
          </div>

          <Field
            label={t('practice.bank.import.paste')}
            htmlFor="bank-import-text"
            hint={importName ? t('practice.bank.import.fromFile', { name: importName }) : t('common.optional')}
          >
            <Textarea
              id="bank-import-text"
              rows={4}
              value={importText}
              spellCheck={false}
              className="font-mono text-meta"
              placeholder={t('practice.bank.import.pastePlaceholder')}
              onChange={(event) => {
                setImportName(null);
                setImportFormat('auto');
                setImportText(event.target.value);
              }}
            />
          </Field>

          <div aria-live="polite" className="flex flex-col gap-2 rounded-card border border-line bg-panel-2 px-3 py-2.5">
            <span className="label-mono">{t('practice.bank.import.preview')}</span>
            <p className="text-ui text-text">
              {builtImport.length > 0
                ? t('practice.bank.import.count', { count: builtImport.length })
                : t('practice.bank.import.none')}
            </p>
            {duplicateCount > 0 ? (
              <p className="text-meta text-muted">
                {t('practice.bank.import.duplicates', { count: duplicateCount })}
              </p>
            ) : null}

            {coverage.length > 0 ? (
              <>
                <span className="label-mono">{t('practice.bank.import.domains')}</span>
                <ul className="flex flex-wrap gap-1.5">
                  {coverage.map((entry) => (
                    <li key={entry.key}>
                      <Chip className="whitespace-normal">{`${entry.name} · ${f.number(entry.count)}`}</Chip>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {parsedImport.issues.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-meta text-warn">
                  <span aria-hidden="true">▲ </span>
                  {t('practice.bank.import.issues', { count: parsedImport.issues.length })}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {parsedImport.issues.slice(0, 8).map((issue, position) => (
                    <li key={`${issue.line}-${position}`} className="text-meta text-muted">
                      {t('practice.bank.import.issueLine', { line: issue.line, message: issue.message })}
                    </li>
                  ))}
                </ul>
                {parsedImport.issues.length > 8 ? (
                  <p className="text-meta text-muted">
                    {t('practice.bank.import.issuesMore', { count: parsedImport.issues.length - 8 })}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                className={TAP}
                onClick={() => void runImport()}
                disabled={busy || builtImport.length === 0}
              >
                {t('practice.bank.import.action')}
              </Button>
              <Button
                variant="ghost"
                className={TAP}
                onClick={clearImport}
                disabled={busy || importText.length === 0}
              >
                {t('practice.bank.import.clear')}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h3 className="text-ui font-bold">{t('practice.bank.list.title')}</h3>
          <span className="text-meta text-muted">{t('practice.bank.list.hint')}</span>
        </CardHead>

        <div className="grid grid-cols-1 gap-2 border-b border-line px-3 py-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('practice.bank.list.search')} htmlFor="bank-search">
            <Input
              id="bank-search"
              type="search"
              value={search}
              placeholder={t('practice.bank.list.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label={t('practice.bank.list.cert')} htmlFor="bank-filter-cert">
            <Select
              id="bank-filter-cert"
              value={filterCertId}
              onChange={(event) => {
                setFilterCertId(event.target.value);
                setFilterDomainId('');
              }}
            >
              <option value="">{t('practice.bank.list.certAll')}</option>
              {state.certifications.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.code} · {cert.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('practice.bank.list.domain')} htmlFor="bank-filter-domain">
            <Select
              id="bank-filter-domain"
              value={filterDomainId}
              onChange={(event) => setFilterDomainId(event.target.value)}
            >
              <option value="">{t('practice.bank.list.domainAll')}</option>
              <option value="__none">{t('practice.bank.list.domainNone')}</option>
              {domainOptions.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-ui text-text sm:min-h-[32px]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            {t('practice.bank.list.showArchived')}
          </label>
          <span className="tnum text-meta text-muted">
            {t('practice.bank.list.count', { count: filtered.length })}
          </span>
          <span className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              className={TAP}
              onClick={openNew}
              aria-label={t('practice.bank.form.new')}
            >
              <Plus size={14} aria-hidden="true" />
              {t('practice.bank.form.new')}
            </Button>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 pb-2.5">
          <span className="label-mono">{t('practice.bank.bulk.title')}</span>
          <Button
            size="sm"
            className={TAP}
            onClick={() => void archiveFiltered(true)}
            disabled={busy || filtered.length === 0}
          >
            {t('practice.bank.bulk.archive')}
          </Button>
          <Button
            size="sm"
            className={TAP}
            onClick={() => void archiveFiltered(false)}
            disabled={busy || filtered.length === 0}
          >
            {t('practice.bank.bulk.unarchive')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            className={TAP}
            onClick={() => setBulkCert(summaryCert ?? null)}
            disabled={busy || certQuestions.length === 0 || !summaryCert}
          >
            {t('practice.bank.bulk.deleteCert', { cert: summaryCert?.code ?? '' })}
          </Button>
        </div>

        {state.questions.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={t('practice.bank.list.empty')}
              body={t('practice.bank.list.emptyBody')}
              action={
                <Button variant="primary" glyph className={TAP} onClick={downloadTemplate}>
                  {t('practice.bank.import.template')}
                </Button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={t('practice.bank.list.emptyFiltered')}
              body={t('practice.bank.list.emptyFilteredBody')}
              action={
                <Button variant="secondary" className={TAP} onClick={resetFilters}>
                  {t('practice.bank.list.certAll')}
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((question) => {
              const cert = state.certifications.find((item) => item.id === question.certId);
              const domainName = question.domainId
                ? cert?.domains.find((domain) => domain.id === question.domainId)?.name
                : undefined;
              const correctOption = question.options[question.correctIndex] ?? '';
              return (
                <li key={question.id} className="flex flex-col gap-1.5 border-b border-line px-3 py-2.5 last:border-b-0">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-ui text-text">{question.prompt}</p>
                    <span className="flex shrink-0">
                      <button
                        type="button"
                        aria-label={t('practice.bank.row.edit', { prompt: shortText(question.prompt) })}
                        className="flex h-11 w-11 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text"
                        onClick={() => openEdit(question)}
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={t('practice.bank.row.delete', { prompt: shortText(question.prompt) })}
                        className="flex h-11 w-11 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-err"
                        onClick={() => setDeleting(question)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip>{cert?.code ?? question.certId}</Chip>
                    <Chip>{domainName ?? t('practice.bank.list.domainNone')}</Chip>
                    {question.source ? <Chip className="whitespace-normal">{question.source}</Chip> : null}
                    <Badge tone="ok">
                      <span aria-hidden="true">✓</span>
                      {`${t('practice.bank.list.correct')} ${letterOf(question.correctIndex)}`}
                    </Badge>
                    {question.archived ? <Badge tone="neutral">{t('practice.bank.list.archived')}</Badge> : null}
                  </div>
                  {correctOption ? (
                    <p className="truncate text-meta text-muted">{correctOption}</p>
                  ) : null}
                  {question.tags.length > 0 ? (
                    <ul className="flex flex-wrap gap-1">
                      {question.tags.map((tag) => (
                        <li key={tag}>
                          <Chip>{tag}</Chip>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {editOpen ? (
        <QuestionEditModal
          key={editing?.id ?? 'new-question'}
          question={editing}
          certifications={state.certifications}
          defaultCertId={summaryCert?.id ?? ''}
          onOpenChange={(open) => {
            if (!open) {
              setEditOpen(false);
              setEditing(null);
            }
          }}
        />
      ) : null}

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t('practice.bank.delete.title')}
        description={
          deleting ? t('practice.bank.delete.body', { prompt: shortText(deleting.prompt, 90) }) : undefined
        }
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={busy}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        {deleting ? <p className="text-ui text-text">{deleting.prompt}</p> : null}
      </Modal>

      <Modal
        open={bulkCert !== null}
        onOpenChange={(open) => {
          if (!open) setBulkCert(null);
        }}
        title={t('practice.bank.bulk.deleteCertTitle', { cert: bulkCert?.code ?? '' })}
        description={
          bulkCert
            ? t('practice.bank.bulk.deleteCertBody', {
                count: state.questions.filter((question) => question.certId === bulkCert.id).length,
                cert: bulkCert.code,
              })
            : undefined
        }
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkCert(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void confirmBulkDelete()} disabled={busy}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-ui text-text">{bulkCert?.name}</p>
      </Modal>
    </section>
  );
}
