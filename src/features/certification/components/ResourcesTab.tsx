import type { Resource } from '@/data/types';
import { Chip, EmptyState, StatusGlyph } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { resourceGlyph } from '../helpers';

export interface ResourcesTabProps {
  resources: Resource[];
}

/** Pestaña Recursos (§7.3): lista compacta con estado y enlace externo. */
export function ResourcesTab({ resources }: ResourcesTabProps) {
  const { t, f } = useT();
  const live = resources.filter((resource) => resource.status !== 'descartado');

  if (live.length === 0) {
    return <EmptyState title={t('cert.resources.empty')} body={t('cert.resources.alreadyInRoute')} />;
  }

  return (
    <ul className="flex flex-col">
      {live.map((resource) => (
        <li
          key={resource.id}
          className="flex items-start gap-2.5 border-b border-line py-2 last:border-b-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-ui text-text">{resource.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
              <span>{resource.provider}</span>
              <Chip>{t(`enum.resource.${resource.type}`)}</Chip>
              <Chip>{resource.isFree ? t('common.free') : f.currency(resource.costUsd)}</Chip>
              <StatusGlyph
                state={resourceGlyph(resource.status)}
                label={t(`enum.resourceStatus.${resource.status}`)}
              />
              {resource.estimatedMin !== null ? (
                <span className="tnum">{f.minutes(resource.estimatedMin)}</span>
              ) : null}
            </p>
          </div>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener"
            aria-label={t('cert.resources.open', { title: resource.title })}
            className="shrink-0 self-center text-meta"
          >
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
