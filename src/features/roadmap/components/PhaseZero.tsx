import type { Resource } from '@/data/types';
import { Chip, Progress, StatusGlyph } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/cn';
import { resourceGlyph } from '../helpers';

/**
 * Fase 0 del timeline (§6.2 orden 0, §6.3): la preparación gratis antes de pagar.
 * Los recursos con `certId === null` se muestran como checklist visual con su estado.
 */
export function PhaseZero({ resources }: { resources: Resource[] }) {
  const { t, f } = useT();
  const live = resources.filter((resource) => resource.status !== 'descartado');
  const done = live.filter((resource) => resource.status === 'completado').length;

  return (
    <section aria-labelledby="fase-0" className="flex flex-col">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 border-ok/50 pb-1.5">
        <h2 id="fase-0" className="text-h3 font-bold text-ok">
          {t('enum.phase.0')}
        </h2>
        <span className="tnum text-meta text-muted">
          {t('roadmap.phase0.progress', { done, total: live.length })}
        </span>
      </div>

      <p className="mb-2 max-w-prose text-ui text-muted">{t('roadmap.phase0.body')}</p>

      {live.length === 0 ? (
        <p className="text-ui text-muted">{t('roadmap.phase0.empty')}</p>
      ) : (
        <>
          <Progress
            value={done}
            max={live.length}
            tone="ok"
            className="mb-2"
            label={t('roadmap.phase0.progress', { done, total: live.length })}
          />
          <ul className="flex flex-col">
            {live.map((resource) => (
              <li
                key={resource.id}
                className="flex items-start gap-2.5 border-b border-line py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className={cn('text-ui text-text', resource.status === 'completado' && 'text-muted line-through')}>
                    {resource.title}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
                    <StatusGlyph
                      state={resourceGlyph(resource.status)}
                      label={t(`enum.resourceStatus.${resource.status}`)}
                    />
                    <span>{resource.provider}</span>
                    <Chip>{t(`enum.resource.${resource.type}`)}</Chip>
                    <Chip>{t('common.free')}</Chip>
                    {resource.estimatedMin !== null ? (
                      <span className="tnum">{f.minutes(resource.estimatedMin)}</span>
                    ) : null}
                  </p>
                </div>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener"
                  aria-label={t('roadmap.phase0.open')}
                  title={resource.title}
                  className="shrink-0 self-center text-meta"
                >
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
