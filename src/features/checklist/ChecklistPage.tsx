import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Field,
  Select,
  Skeleton,
} from '@/components/ui/primitives';
import { useAppState } from '@/data/store';
import type { Certification, ChecklistItem } from '@/data/types';
import { localDate } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import { useChecklistActions, type ItemInput } from './actions';
import {
  certificationsWithItems,
  EMPTY_FILTERS,
  filterItems,
  GROUPS,
  isFiltering,
  type ChecklistFilters,
} from './model';
import { CertBlock } from './components/CertBlock';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DuplicateTemplateModal } from './components/DuplicateTemplateModal';
import { ItemFormModal } from './components/ItemFormModal';

type FormState = { kind: 'new' } | { kind: 'edit'; item: ChecklistItem };

type ToggleKey = 'overdueOnly' | 'pendingOnly' | 'showArchived';

const TOGGLES: {
  key: ToggleKey;
  labelKey: 'checklist.filter.overdue' | 'checklist.filter.pending' | 'checklist.filter.archived';
}[] = [
  { key: 'overdueOnly', labelKey: 'checklist.filter.overdue' },
  { key: 'pendingOnly', labelKey: 'checklist.filter.pending' },
  { key: 'showArchived', labelKey: 'checklist.filter.archived' },
];

/**
 * Checklist (§7.10, §8.9): vista global agrupada por certificación y por grupo
 * fijo (`preparacion`, `practica`, `examen`, `personal`), con progreso
 * `hechos / (hechos + pendientes)` —los archivados no cuentan—, filtros, ítem
 * propio, reordenado con ↑/↓, plantilla (restaurar y duplicar) y archivado en
 * bloque de los completados.
 *
 * Sin red: las escrituras van por `getDb()` y la reactividad la aporta
 * `useAppState()` (LiveQuery sobre IndexedDB).
 */
export function ChecklistPage() {
  const { t } = useT();
  const { state, ready } = useAppState();
  const actions = useChecklistActions(state);
  const now = useMemo(() => new Date(), []);
  const today = localDate(now);

  const [filters, setFilters] = useState<ChecklistFilters>(EMPTY_FILTERS);
  const [form, setForm] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<ChecklistItem | null>(null);
  const [duplicating, setDuplicating] = useState<Certification | null>(null);

  const visible = useMemo(
    () => filterItems(state.checklistItems, filters, today),
    [state.checklistItems, filters, today],
  );
  const certOptions = useMemo(
    () => certificationsWithItems(state.certifications, state.planItems, state.checklistItems),
    [state.certifications, state.planItems, state.checklistItems],
  );
  const blocks = useMemo(
    () =>
      certificationsWithItems(state.certifications, state.planItems, visible).map((cert) => ({
        cert,
        items: visible.filter((item) => item.certId === cert.id),
      })),
    [state.certifications, state.planItems, visible],
  );
  const liveCount = state.checklistItems.filter((item) => !item.archived).length;
  const defaultCertId =
    filters.certId ?? state.settings.activeCertId ?? state.certifications[0]?.id ?? null;

  if (!ready) {
    return (
      <section aria-busy="true" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  const saveItem = async (input: ItemInput) => {
    const saved =
      form?.kind === 'edit'
        ? await actions.update(form.item, input)
        : await actions.create(input);
    if (saved) setForm(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const removed = await actions.remove(deleting);
    if (removed) setDeleting(null);
  };

  const confirmDuplicate = async (source: Certification, target: Certification) => {
    await actions.duplicate(source, target);
    setDuplicating(null);
  };

  const toggleFilter = (key: ToggleKey) => {
    setFilters((previous) => ({ ...previous, [key]: !previous[key] }));
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
            {t('checklist.title')}
          </h1>
          <p className="mt-1.5 max-w-prose text-ui text-muted">{t('checklist.lead')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{t('checklist.count', { count: liveCount })}</Badge>
          <Button
            variant="primary"
            glyph
            className="min-h-[44px]"
            disabled={state.certifications.length === 0}
            onClick={() => setForm({ kind: 'new' })}
          >
            {t('action.newItem')}
          </Button>
        </div>
      </header>

      {state.checklistItems.length === 0 ? (
        <EmptyState
          title={t('checklist.empty.title')}
          body={t('checklist.empty.body')}
          action={
            <Button
              variant="primary"
              glyph
              className="min-h-[44px]"
              disabled={state.certifications.length === 0}
              onClick={() => setForm({ kind: 'new' })}
            >
              {t('checklist.empty.cta')}
            </Button>
          }
        />
      ) : (
        <>
          <Card role="group" aria-label={t('checklist.filters.legend')}>
            <CardBody className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('checklist.filter.cert')} htmlFor="checklist-filter-cert">
                  <Select
                    id="checklist-filter-cert"
                    value={filters.certId ?? ''}
                    onChange={(event) =>
                      setFilters((previous) => ({
                        ...previous,
                        certId: event.target.value === '' ? null : event.target.value,
                      }))
                    }
                  >
                    <option value="">{t('checklist.filter.allCerts')}</option>
                    {certOptions.map((cert) => (
                      <option key={cert.id} value={cert.id}>
                        {t('checklist.form.certOption', { code: cert.code, name: cert.name })}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label={t('checklist.filter.group')} htmlFor="checklist-filter-group">
                  <Select
                    id="checklist-filter-group"
                    value={filters.groupId ?? ''}
                    onChange={(event) =>
                      setFilters((previous) => ({
                        ...previous,
                        groupId: event.target.value === '' ? null : (event.target.value as ChecklistFilters['groupId']),
                      }))
                    }
                  >
                    <option value="">{t('checklist.filter.allGroups')}</option>
                    {GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {t(`enum.group.${group}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {TOGGLES.map(({ key, labelKey }) => (
                  <Button
                    key={key}
                    variant={filters[key] ? 'primary' : 'secondary'}
                    aria-pressed={filters[key]}
                    className="min-h-[44px]"
                    onClick={() => toggleFilter(key)}
                  >
                    {t(labelKey)}
                  </Button>
                ))}
                <span className="tnum text-meta text-muted">
                  {t('checklist.count', { count: visible.length })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  className="min-h-[44px]"
                  disabled={actions.busyId === 'archive'}
                  onClick={() => {
                    void actions.archiveCompleted(filters.certId);
                  }}
                >
                  {t('checklist.bulk.archive')}
                </Button>
                {isFiltering(filters) ? (
                  <Button
                    variant="ghost"
                    className="min-h-[44px]"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                  >
                    {t('checklist.filter.clear')}
                  </Button>
                ) : null}
              </div>
            </CardBody>
          </Card>

          {visible.length === 0 ? (
            <EmptyState
              title={t('checklist.filter.none')}
              action={
                <Button
                  variant="secondary"
                  className="min-h-[44px]"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  {t('checklist.filter.clear')}
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {blocks.map(({ cert, items }) => (
                <CertBlock
                  key={cert.id}
                  cert={cert}
                  items={items}
                  today={today}
                  busyId={actions.busyId}
                  onToggle={(item) => {
                    void actions.toggle(item);
                  }}
                  onMove={(item, direction, visibleIds) => {
                    void actions.move(item, direction, visibleIds);
                  }}
                  onEdit={(item) => setForm({ kind: 'edit', item })}
                  onDelete={(item) => setDeleting(item)}
                  onUnarchive={(item) => {
                    void actions.unarchive(item);
                  }}
                  onRestore={(source) => {
                    void actions.restore(source);
                  }}
                  onDuplicate={(source) => setDuplicating(source)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {form ? (
        <ItemFormModal
          key={form.kind === 'edit' ? form.item.id : 'new'}
          item={form.kind === 'edit' ? form.item : null}
          certifications={state.certifications}
          defaultCertId={defaultCertId}
          busy={actions.busyId !== null}
          onClose={() => setForm(null)}
          onSubmit={(input) => {
            void saveItem(input);
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('checklist.deleteTitle')}
          body={t('checklist.deleteBody')}
          confirmLabel={t('checklist.deleteConfirm')}
          busy={actions.busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            void confirmDelete();
          }}
        />
      ) : null}

      {duplicating ? (
        <DuplicateTemplateModal
          source={duplicating}
          certifications={state.certifications}
          busy={actions.busyId === `duplicate-${duplicating.id}`}
          onClose={() => setDuplicating(null)}
          onConfirm={(target) => {
            void confirmDuplicate(duplicating, target);
          }}
        />
      ) : null}
    </section>
  );
}
