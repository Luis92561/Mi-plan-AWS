import { useMemo, useState } from 'react';
import { newId, useAppState } from '@/data/store';
import { getDb } from '@/data/db';
import { buildChecklistForCert, buildStarterTopics, loadRecommendedRoute } from '@/data/seed';
import type { Certification, PlanItem } from '@/data/types';
import { Badge, Button, EmptyState, SectionHead, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/useT';
import { groupByPhase, nextRecommended, retiringSoon } from '@/domain/recommend';
import { cn } from '@/lib/cn';
import { CertCard } from './components/CertCard';
import { CertRow } from './components/CertRow';
import { CatalogRow } from './components/CatalogRow';
import { PhaseZero } from './components/PhaseZero';
import { ViewToggle } from './components/ViewToggle';
import { phaseRule, phaseTone, readStoredView, storeView, type RoadmapView } from './helpers';

/**
 * Ruta (§7.2): timeline vertical agrupado por fase, con la fase 0 (preparación
 * gratuita) como primera sección y el catálogo de certificaciones fuera del plan.
 */
export function RoadmapPage() {
  const { t } = useT();
  const { state, ready } = useAppState();
  const { notify } = useToast();
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState<RoadmapView>(() => readStoredView());
  const [busy, setBusy] = useState(false);
  const [pendingCertId, setPendingCertId] = useState<string | null>(null);

  const changeView = (next: RoadmapView) => {
    setView(next);
    storeView(next);
  };

  if (!ready) {
    return (
      <section className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  const phases = groupByPhase(state.planItems, state.certifications);
  const nextItem = nextRecommended({ planItems: state.planItems, certifications: state.certifications, now });
  const phaseZeroResources = state.resources.filter((resource) => resource.certId === null);
  const plannedIds = new Set(state.planItems.map((item) => item.certId));
  const catalog = state.certifications
    .filter((cert) => !plannedIds.has(cert.id))
    .sort((a, b) => a.phase - b.phase || a.code.localeCompare(b.code));

  const loadRoute = async () => {
    setBusy(true);
    try {
      await loadRecommendedRoute(getDb(), new Date());
      notify(t('roadmap.loaded'), 'ok');
    } catch (cause) {
      notify(t('roadmap.error', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  /** "Añadir a mi plan": planItem + checklist de la plantilla + temas base (§7.2, §7.10). */
  const addToPlan = async (cert: Certification) => {
    setPendingCertId(cert.id);
    try {
      const db = getDb();
      const siblings = state.planItems.filter((item) => {
        const sibling = state.certifications.find((candidate) => candidate.id === item.certId);
        return sibling?.phase === cert.phase;
      });
      const order = siblings.reduce((max, item) => Math.max(max, item.order), 0) + 1;
      const createdAt = new Date().toISOString();
      const planItem: PlanItem = {
        id: newId('plan'),
        certId: cert.id,
        order,
        status: 'no_iniciado',
        targetDate: null,
        hoursPlanned: 40,
        hoursDone: 0,
        createdAt,
        updatedAt: createdAt,
      };

      const knownChecklist = new Set(state.checklistItems.map((item) => item.id));
      const knownTopics = new Set(state.topics.map((topic) => topic.id));
      const checklist = buildChecklistForCert(cert, new Date()).filter((item) => !knownChecklist.has(item.id));
      const topics = buildStarterTopics(cert, new Date()).filter((topic) => !knownTopics.has(topic.id));

      await db.planItems.put(planItem);
      if (checklist.length > 0) await db.checklistItems.bulkPut(checklist);
      if (topics.length > 0) await db.topics.bulkPut(topics);

      notify(
        `${t('roadmap.catalog.added', { code: cert.code })} · ${t('roadmap.catalog.seeded', {
          items: checklist.length,
          topics: topics.length,
        })}`,
        'ok',
      );
    } catch (cause) {
      notify(t('roadmap.catalog.error', { code: cert.code, message: (cause as Error).message }), 'err');
    } finally {
      setPendingCertId(null);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <SectionHead
        no="03"
        title={t('roadmap.title')}
        hint={t('roadmap.subtitle')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {state.planItems.length > 0 ? (
              <span className="tnum text-meta text-muted">
                {t('roadmap.planSize', { n: state.planItems.length, count: state.planItems.length })}
              </span>
            ) : null}
            <ViewToggle view={view} onChange={changeView} />
          </div>
        }
      />

      {state.planItems.length === 0 ? (
        <EmptyState
          title={t('roadmap.empty.title')}
          body={t('roadmap.empty.body')}
          action={
            <Button variant="primary" glyph disabled={busy} onClick={() => void loadRoute()}>
              {t('roadmap.empty.cta')}
            </Button>
          }
        />
      ) : (
        <>
          <PhaseZero resources={phaseZeroResources} />

          <div className="flex flex-col gap-6">
            {phases.map(({ phase, items }) => {
              const certs = items
                .map((item) => state.certifications.find((cert) => cert.id === item.certId))
                .filter((cert): cert is Certification => Boolean(cert));
              const approved = items.filter((item) => item.status === 'aprobado').length;
              const retiringCount = certs.filter((cert) => retiringSoon(cert, now)).length;

              return (
                <section key={phase} aria-labelledby={`fase-${phase}`} className="flex flex-col">
                  <div
                    className={cn(
                      'mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 pb-1.5',
                      phaseRule(certs),
                    )}
                  >
                    <h2 id={`fase-${phase}`} className={cn('text-h3 font-bold', phaseTone(certs))}>
                      {t(`enum.phase.${phase}`)}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      {retiringCount > 0 ? (
                        <Badge tone="warn">
                          <span aria-hidden="true">▲</span>
                          {t('roadmap.phase.retiring')}
                        </Badge>
                      ) : null}
                      <span className="tnum text-meta text-muted">
                        {t('roadmap.phase.progress', { done: approved, total: items.length })}
                      </span>
                    </div>
                  </div>

                  {view === 'detallada' ? (
                    <ol
                      aria-label={t('roadmap.timeline.label')}
                      className="relative flex flex-col gap-3 border-l border-line pl-3 md:pl-4"
                    >
                      {items.map((item) => {
                        const cert = state.certifications.find((candidate) => candidate.id === item.certId);
                        if (!cert) return null;
                        return (
                          <li key={item.id} className="relative">
                            <span
                              aria-hidden="true"
                              className="absolute -left-[19px] top-4 h-2 w-2 rounded-chip border border-line bg-panel md:-left-[23px]"
                            />
                            <CertCard
                              cert={cert}
                              item={item}
                              state={state}
                              now={now}
                              isNext={nextItem?.id === item.id}
                            />
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <ul aria-label={t('roadmap.timeline.label')} className="flex flex-col">
                      {items.map((item) => {
                        const cert = state.certifications.find((candidate) => candidate.id === item.certId);
                        if (!cert) return null;
                        return (
                          <CertRow
                            key={item.id}
                            cert={cert}
                            item={item}
                            state={state}
                            now={now}
                            isNext={nextItem?.id === item.id}
                          />
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <section aria-labelledby="catalogo" className="flex flex-col">
            <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-1.5">
              <h2 id="catalogo" className="text-h3 font-bold">
                <span aria-hidden="true" className="mr-1.5 text-accent">
                  ❯
                </span>
                {t('roadmap.catalog.title')}
              </h2>
              <span className="text-meta text-muted">{t('roadmap.catalog.hint')}</span>
            </div>
            {catalog.length === 0 ? (
              <p className="text-ui text-muted">{t('roadmap.catalog.empty')}</p>
            ) : (
              <ul className="flex flex-col">
                {catalog.map((cert) => (
                  <CatalogRow
                    key={cert.id}
                    cert={cert}
                    now={now}
                    pending={pendingCertId === cert.id}
                    onAdd={(item) => void addToPlan(item)}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
