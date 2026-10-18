import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Chip } from '@/components/ui/primitives';
import { ReadinessRing } from '@/components/ui/ring';
import type { ReadinessResult } from '@/domain/readiness';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/useT';
import type { DashboardModel } from '../model';
import { stepText } from '../stepText';

/** Pesos exactos de §8.1 (suman 1). */
const PARTS = [
  { id: 'domains', weight: 0.35 },
  { id: 'mocks', weight: 0.35 },
  { id: 'resources', weight: 0.2 },
  { id: 'hours', weight: 0.1 },
] as const;

function ringTone(score: number): 'accent' | 'ok' {
  return score >= 80 ? 'ok' : 'accent';
}

/**
 * Tarjeta hero (§7.1): certificación activa, anillo de readiness, siguiente
 * paso accionable y acceso a la ficha completa.
 */
export function HeroPanel({ model }: { model: DashboardModel }) {
  const { t, f } = useT();
  const navigate = useNavigate();
  const { activeCert, activeItem, readiness, nextStep } = model;

  if (!activeCert) {
    return (
      <Card className="p-5">
        <p className="label-mono">{t('dashboard.activeCert')}</p>
        <p className="mt-1 text-body text-muted">{t('dashboard.noActiveCert')}</p>
      </Card>
    );
  }

  const stepLabel = nextStep
    ? stepText(nextStep, t)
    : t('dashboard.step.allDone', { code: activeCert.code });

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 p-4 md:flex-row md:items-start md:justify-between md:p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-mono">{t('dashboard.activeCert')}</span>
            <Badge tone="accent">{t(`enum.level.${activeCert.level}`)}</Badge>
            {activeItem ? <Chip>{t(`enum.plan.${activeItem.status}`)}</Chip> : null}
            {readiness?.preliminary ? <Chip>{t('dashboard.estimateOnly')}</Chip> : null}
          </div>

          <div className="min-w-0">
            <h2 className="text-h2 font-bold leading-tight">
              <span className="text-accent">{activeCert.code}</span> · {activeCert.name}
            </h2>
            <p className="mt-1 text-meta text-muted">
              {t(`enum.phaseShort.${activeCert.phase}`)} · {f.currency(activeCert.priceUsd)}
            </p>
          </div>

          <Link
            to={nextStep?.href ?? `/ruta/${activeCert.id}`}
            className="flex flex-col gap-0.5 rounded-card border border-line bg-panel-2 px-3 py-2 transition-colors duration-hover hover:border-line-strong"
          >
            <span className="label-mono">{t('dashboard.nextStep')}</span>
            <span className="flex items-baseline gap-1.5 text-ui text-text">
              <span aria-hidden="true" className="text-accent">
                ❯
              </span>
              <span className="min-w-0">{stepLabel}</span>
            </span>
          </Link>

          <div>
            <Button
              variant="primary"
              glyph
              className="min-h-[44px]"
              onClick={() => navigate(`/ruta/${activeCert.id}`)}
            >
              {t('dashboard.openCert')}
            </Button>
          </div>
        </div>

        {readiness ? (
          <div className="shrink-0 self-center md:self-start md:pl-4">
            <ReadinessRing
              value={readiness.score}
              label={t('common.readiness')}
              caption={readiness.preliminary ? t('dashboard.estimateOnly') : t('common.readiness')}
              preliminary={readiness.preliminary}
              tone={ringTone(readiness.score)}
            />
          </div>
        ) : null}
      </div>

      {readiness ? (
        <ReadinessBreakdown readiness={readiness} className="border-t border-line px-4 py-3 md:px-5" />
      ) : null}
    </Card>
  );
}

/** Desglose visible de §8.1 en un acordeón ("¿cómo se calcula?"). */
function ReadinessBreakdown({
  readiness,
  className,
}: {
  readiness: ReadinessResult;
  className?: string;
}) {
  const { t, f } = useT();
  const values: Record<(typeof PARTS)[number]['id'], number> = {
    domains: readiness.breakdown.domainCoverage,
    mocks: readiness.breakdown.mockPerformance,
    resources: readiness.breakdown.resourcesDone,
    hours: readiness.breakdown.hoursVsPlan,
  };

  return (
    <details className={cn('group', className)}>
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 text-ui text-muted transition-colors duration-hover hover:text-text [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-accent">
          ❯
        </span>
        {t('dashboard.tooltip')}
        <span
          aria-hidden="true"
          className="ml-auto text-meta transition-transform duration-hover group-open:rotate-90"
        >
          ›
        </span>
      </summary>

      <div className="mt-2 grid gap-x-6 gap-y-1.5 md:grid-cols-2">
        {PARTS.map((part) => (
          <div
            key={part.id}
            className="flex items-baseline justify-between gap-3 border-b border-line pb-1"
          >
            <span className="text-meta text-muted">
              {t(`dashboard.part.${part.id}`)} <span className="tnum">{f.percent(part.weight)}</span>
            </span>
            <span className="tnum text-meta text-text">{f.percent(values[part.id])}</span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-meta text-muted">{t('dashboard.formula')}</p>
      {readiness.preliminary ? (
        <p className="mt-1 text-meta text-warn">
          <span aria-hidden="true">▲</span> {t('dashboard.noAttempts')}
        </p>
      ) : null}
    </details>
  );
}
