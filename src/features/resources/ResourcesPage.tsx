import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHead,
  EmptyState,
  Field,
  Select,
  Skeleton,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { useAppState } from '@/data/store';
import type { Resource, ResourceStatus } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import { ResourceFormModal } from './components/ResourceFormModal';
import { ResourceLedger } from './components/ResourceLedger';
import { ResourceProgress } from './components/ResourceProgress';
import {
  CERT_FILTER_NONE,
  EMPTY_FILTERS,
  RESOURCE_STATUSES,
  RESOURCE_TYPES,
  filterResources,
  hasActiveFilters,
  sortResources,
  totalsByCert,
  type ResourceFilters,
} from './helpers';

function statusMessageKey(status: ResourceStatus): TKey {
  if (status === 'completado') return 'resources.row.completed';
  if (status === 'descartado') return 'resources.row.discarded';
  return 'resources.row.reopened';
}

/**
 * Recursos (§7.3, M6).
 * CRUD completo, filtros por certificación/tipo/coste/estado, totales por certificación
 * y acciones rápidas. Sin red: los enlaces abren en pestaña nueva.
 */
export function ResourcesPage() {
  const { t } = useT();
  const { state, ready } = useAppState();
  const { notify } = useToast();

  const [filters, setFilters] = useState<ResourceFilters>(EMPTY_FILTERS);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => sortResources(filterResources(state.resources, filters), state.certifications),
    [state.resources, state.certifications, filters],
  );
  const totals = useMemo(
    () => totalsByCert(state.resources, state.certifications),
    [state.resources, state.certifications],
  );
  const active = hasActiveFilters(filters);
  const defaultCertId =
    filters.cert !== '' && filters.cert !== CERT_FILTER_NONE ? filters.cert : undefined;

  const patch = (next: Partial<ResourceFilters>) =>
    setFilters((current) => ({ ...current, ...next }));

  const setStatus = async (resource: Resource, status: ResourceStatus) => {
    try {
      await getDb().resources.update(resource.id, { status });
      notify(t(statusMessageKey(status), { title: resource.title }), 'ok');
    } catch (cause) {
      notify(t('resources.row.error', { message: (cause as Error).message }), 'err');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await getDb().resources.delete(deleting.id);
      notify(t('resources.delete.done', { title: deleting.title }), 'ok');
      setDeleting(null);
    } catch (cause) {
      notify(t('resources.delete.error', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
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
            {t('resources.title')}
          </h1>
          <p className="mt-1 max-w-prose text-ui text-muted">{t('resources.lead')}</p>
        </div>
        <Button
          variant="primary"
          glyph
          onClick={() => setCreating(true)}
          aria-label={t('resources.action.new')}
        >
          {t('resources.action.new')}
        </Button>
      </header>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('resources.filters.title')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <p aria-live="polite" className="tnum text-meta text-muted">
              {active
                ? t('resources.countOf', { shown: filtered.length, total: state.resources.length })
                : t('resources.count', { count: filtered.length })}
            </p>
            {active ? (
              <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                {t('resources.filters.clear')}
              </Button>
            ) : null}
          </div>
        </CardHead>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t('resources.filters.cert')} htmlFor="flt-cert">
              <Select
                id="flt-cert"
                value={filters.cert}
                onChange={(event) => patch({ cert: event.target.value })}
              >
                <option value="">{t('resources.filters.certAll')}</option>
                <option value={CERT_FILTER_NONE}>{t('resources.certNone')}</option>
                {state.certifications.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.code} · {cert.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t('resources.filters.type')} htmlFor="flt-type">
              <Select
                id="flt-type"
                value={filters.type}
                onChange={(event) => patch({ type: event.target.value })}
              >
                <option value="">{t('resources.filters.typeAll')}</option>
                {RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`enum.resource.${type}` as TKey)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t('resources.filters.cost')} htmlFor="flt-cost">
              <Select
                id="flt-cost"
                value={filters.cost}
                onChange={(event) =>
                  patch({ cost: event.target.value as ResourceFilters['cost'] })
                }
              >
                <option value="all">{t('resources.filters.costAll')}</option>
                <option value="free">{t('resources.filters.costFree')}</option>
                <option value="paid">{t('resources.filters.costPaid')}</option>
              </Select>
            </Field>

            <Field label={t('resources.filters.status')} htmlFor="flt-status">
              <Select
                id="flt-status"
                value={filters.status}
                onChange={(event) => patch({ status: event.target.value })}
              >
                <option value="">{t('resources.filters.statusAll')}</option>
                {RESOURCE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`enum.resourceStatus.${status}` as TKey)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('resources.totals.title')}</h2>
          <span className="text-meta text-muted">{t('resources.totals.hint')}</span>
        </CardHead>
        <CardBody>
          <ResourceProgress totals={totals} />
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('resources.ledger.title')}</h2>
          <span className="text-meta text-muted">{t('resources.ledger.hint')}</span>
        </CardHead>
        <CardBody className="p-0">
          {state.resources.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={t('resources.empty.title')}
                body={t('resources.empty.body')}
                action={
                  <Button variant="primary" glyph onClick={() => setCreating(true)}>
                    {t('resources.empty.cta')}
                  </Button>
                }
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={t('resources.emptyFiltered.title')}
                body={t('resources.emptyFiltered.body')}
                action={
                  <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                    {t('resources.emptyFiltered.cta')}
                  </Button>
                }
              />
            </div>
          ) : (
            <ResourceLedger
              resources={filtered}
              certifications={state.certifications}
              onEdit={(resource) => setEditing(resource)}
              onDelete={(resource) => setDeleting(resource)}
              onStatus={(resource, status) => {
                void setStatus(resource, status);
              }}
            />
          )}
        </CardBody>
      </Card>

      {creating ? (
        <ResourceFormModal
          key="new-resource"
          resource={null}
          defaultCertId={defaultCertId}
          onOpenChange={(open) => {
            if (!open) setCreating(false);
          }}
        />
      ) : null}

      {editing ? (
        <ResourceFormModal
          key={editing.id}
          resource={editing}
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
        title={t('resources.delete.title')}
        description={
          deleting ? t('resources.delete.body', { title: deleting.title }) : undefined
        }
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={busy}>
              {t('resources.delete.confirm')}
            </Button>
          </>
        }
      >
        {deleting ? (
          <p className="text-ui text-text">
            <span aria-hidden="true" className="mr-1.5 text-warn">
              ▲
            </span>
            {deleting.title}
          </p>
        ) : null}
      </Modal>

      <Button
        variant="primary"
        glyph
        onClick={() => setCreating(true)}
        aria-label={t('resources.action.new')}
        className="fixed bottom-24 right-4 z-40 shadow-overlay md:hidden"
      >
        <Plus size={15} aria-hidden="true" />
        {t('resources.action.newShort')}
      </Button>
    </div>
  );
}
