import { Check, Ellipsis } from 'lucide-react';
import { Chip, StatusGlyph } from '@/components/ui/primitives';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import type { Certification, Resource, ResourceStatus } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import { resourceGlyph } from '../helpers';

export interface ResourceLedgerProps {
  resources: Resource[];
  certifications: Certification[];
  onEdit: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
  onStatus: (resource: Resource, status: ResourceStatus) => void;
}

function certCode(certifications: Certification[], certId: string | null, fallback: string): string {
  if (certId === null) return fallback;
  return certifications.find((cert) => cert.id === certId)?.code ?? certId;
}

/**
 * Tabla de recursos (§7.3, M6): tabla con `th scope` en desktop y tarjetas con
 * label en móvil (§9.9). Acciones rápidas: completar, editar, descartar, eliminar.
 */
export function ResourceLedger({ resources, certifications, onEdit, onDelete, onStatus }: ResourceLedgerProps) {
  const { t, f } = useT();
  const noneLabel = t('resources.totals.none');

  const costText = (resource: Resource): string =>
    resource.isFree ? t('common.free') : f.currency(resource.costUsd);

  const actions = (resource: Resource, compact: boolean) => {
    const size = compact ? 'h-9 w-9' : 'h-11 w-11';
    return (
      <span className="flex items-center justify-end gap-1">
        {resource.status !== 'completado' && resource.status !== 'descartado' ? (
          <button
            type="button"
            onClick={() => onStatus(resource, 'completado')}
            aria-label={t('resources.row.complete')}
            className={`flex ${size} items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-ok`}
          >
            <Check size={15} aria-hidden="true" />
          </button>
        ) : null}
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label={t('resources.row.menu', { title: resource.title })}
              className={`flex ${size} items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text`}
            >
              <Ellipsis size={16} aria-hidden="true" />
            </button>
          </MenuTrigger>
          <MenuContent ariaLabel={t('resources.row.menu', { title: resource.title })}>
            <MenuItem onSelect={() => onEdit(resource)}>{t('resources.row.edit')}</MenuItem>
            {resource.status === 'descartado' ? (
              <MenuItem onSelect={() => onStatus(resource, 'pendiente')}>
                {t('resources.row.restore')}
              </MenuItem>
            ) : (
              <>
                {resource.status === 'completado' ? (
                  <MenuItem onSelect={() => onStatus(resource, 'pendiente')}>
                    {t('resources.row.reopen')}
                  </MenuItem>
                ) : (
                  <MenuItem onSelect={() => onStatus(resource, 'completado')}>
                    {t('resources.row.complete')}
                  </MenuItem>
                )}
                <MenuItem onSelect={() => onStatus(resource, 'descartado')}>
                  {t('resources.row.discard')}
                </MenuItem>
              </>
            )}
            <MenuSeparator />
            <MenuItem danger onSelect={() => onDelete(resource)}>
              {t('resources.row.delete')}
            </MenuItem>
          </MenuContent>
        </Menu>
      </span>
    );
  };

  const titleLink = (resource: Resource) => (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener"
      aria-label={t('resources.row.open', { title: resource.title })}
      className="text-ui text-text underline-offset-2 hover:text-accent hover:underline"
    >
      {resource.title}
      <span aria-hidden="true" className="ml-1 text-muted">
        ↗
      </span>
    </a>
  );

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="ledger">
          <caption className="sr-only">{t('resources.ledger.title')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('resources.col.resource')}</th>
              <th scope="col">{t('resources.col.cert')}</th>
              <th scope="col">{t('resources.col.type')}</th>
              <th scope="col" className="num">
                {t('resources.col.cost')}
              </th>
              <th scope="col">{t('resources.col.status')}</th>
              <th scope="col" className="num">
                {t('resources.col.minutes')}
              </th>
              <th scope="col" className="num">
                {t('resources.col.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id}>
                <td>
                  {titleLink(resource)}
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
                    <span>{resource.provider}</span>
                    {resource.domainIds.length > 0 ? (
                      <Chip>{t('resources.row.domains', { count: resource.domainIds.length })}</Chip>
                    ) : null}
                  </p>
                </td>
                <td>
                  <Chip>{certCode(certifications, resource.certId, noneLabel)}</Chip>
                </td>
                <td className="text-meta text-muted">{t(`enum.resource.${resource.type}` as TKey)}</td>
                <td className="num tnum">{costText(resource)}</td>
                <td>
                  <StatusGlyph
                    state={resourceGlyph(resource.status)}
                    label={t(`enum.resourceStatus.${resource.status}` as TKey)}
                  />
                </td>
                <td className="num tnum">
                  {resource.estimatedMin === null ? '—' : f.minutes(resource.estimatedMin)}
                </td>
                <td className="num">{actions(resource, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {resources.map((resource) => (
          <li key={resource.id} className="rounded-card border border-line bg-panel px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {titleLink(resource)}
                <p className="mt-0.5 text-meta text-muted">{resource.provider}</p>
              </div>
              {actions(resource, false)}
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-meta">
              <div>
                <dt className="label-mono">{t('resources.col.cert')}</dt>
                <dd>
                  <Chip>{certCode(certifications, resource.certId, noneLabel)}</Chip>
                </dd>
              </div>
              <div>
                <dt className="label-mono">{t('resources.col.type')}</dt>
                <dd className="text-text">{t(`enum.resource.${resource.type}` as TKey)}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('resources.col.cost')}</dt>
                <dd className="tnum text-text">{costText(resource)}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('resources.col.minutes')}</dt>
                <dd className="tnum text-text">
                  {resource.estimatedMin === null ? '—' : f.minutes(resource.estimatedMin)}
                </dd>
              </div>
            </dl>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <StatusGlyph
                state={resourceGlyph(resource.status)}
                label={t(`enum.resourceStatus.${resource.status}` as TKey)}
              />
              {resource.domainIds.length > 0 ? (
                <Chip>{t('resources.row.domains', { count: resource.domainIds.length })}</Chip>
              ) : null}
            </div>
            {resource.note ? (
              <p className="mt-1.5 text-meta text-muted">{resource.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
