import { useMemo, useState } from 'react';
import { getDb } from '@/data/db';
import { loadDemoData, loadRecommendedRoute } from '@/data/seed';
import { useAppState } from '@/data/store';
import { Button, EmptyState, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/useT';
import { AlertBanners } from './components/AlertBanners';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { HeroPanel } from './components/HeroPanel';
import { KpiGrid } from './components/KpiGrid';
import { NextSteps } from './components/NextSteps';
import { StudyHeatmap } from './components/StudyHeatmap';
import { buildDashboardModel } from './model';

type SeedAction = 'route' | 'demo';

/**
 * Inicio (§7.1): hero con readiness y siguiente paso, 4 KPIs, heatmap de 120
 * días, banners de alerta y 3 próximos pasos. Sin red: todo sale de IndexedDB
 * y se recalcula solo con `liveQuery`.
 */
export function DashboardPage() {
  const { t, f } = useT();
  const { state, ready } = useAppState();
  const { notify } = useToast();
  const [seeding, setSeeding] = useState<SeedAction | null>(null);
  const model = useMemo(() => buildDashboardModel(state), [state]);

  const runSeed = async (action: SeedAction) => {
    setSeeding(action);
    try {
      const now = new Date();
      if (action === 'route') await loadRecommendedRoute(getDb(), now);
      else await loadDemoData(getDb(), now);
      notify(
        t(action === 'route' ? 'dashboard.routeLoaded' : 'dashboard.demoLoaded'),
        'ok',
      );
    } catch (cause) {
      notify(t('dashboard.loadFailed', { message: (cause as Error).message }), 'err');
    } finally {
      setSeeding(null);
    }
  };

  if (!ready) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-h2 font-bold">
          <span aria-hidden="true" className="mr-1.5 text-accent">
            ❯
          </span>
          {t('dashboard.title')}
        </h1>
        <span className="tnum text-meta text-muted">{f.date(model.today)}</span>
      </header>

      {model.hasPlan ? (
        <>
          <section>
            <SectionHead no="01" title={t('dashboard.section.hero')} />
            <HeroPanel model={model} />
          </section>

          <section>
            <SectionHead no="02" title={t('dashboard.section.kpis')} />
            <KpiGrid kpis={model.kpis} today={model.today} />
          </section>

          <StudyHeatmap cells={model.heat} />

          <AlertBanners alerts={model.alerts} />

          <NextSteps steps={model.steps} no={model.alerts.length > 0 ? '05' : '04'} />
        </>
      ) : (
        <EmptyState
          title={t('dashboard.emptyTitle')}
          body={`${t('dashboard.emptyBody')} ${t('dashboard.emptyDemo')}`}
          action={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="primary"
                glyph
                className="min-h-[44px]"
                disabled={seeding !== null}
                onClick={() => void runSeed('route')}
              >
                {t('action.loadRoute')}
              </Button>
              <Button
                variant="secondary"
                className="min-h-[44px]"
                disabled={seeding !== null}
                onClick={() => void runSeed('demo')}
              >
                {t('action.loadDemo')}
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
