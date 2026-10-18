import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/primitives';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '@/data/store';
import { computeReadiness } from '@/domain/readiness';
import { useT } from '@/lib/i18n/useT';
import { CertHeader } from './components/CertHeader';
import { SummaryTab } from './components/SummaryTab';
import { DomainsTab } from './components/DomainsTab';
import { TopicsTab } from './components/TopicsTab';
import { ChecklistTab } from './components/ChecklistTab';
import { ResourcesTab } from './components/ResourcesTab';
import { PracticeTab } from './components/PracticeTab';
import { NotesTab } from './components/NotesTab';
import { ExamTab } from './components/ExamTab';

const TABS = [
  { value: 'resumen', key: 'cert.tab.summary' },
  { value: 'dominios', key: 'cert.tab.domains' },
  { value: 'temas', key: 'cert.tab.topics' },
  { value: 'checklist', key: 'cert.tab.checklist' },
  { value: 'recursos', key: 'cert.tab.resources' },
  { value: 'practica', key: 'cert.tab.practice' },
  { value: 'notas', key: 'cert.tab.notes' },
  { value: 'examen', key: 'cert.tab.exam' },
] as const;

/**
 * Detalle de certificación (§7.3): cabecera con los datos oficiales y ocho pestañas
 * (Resumen, Dominios, Temas, Checklist, Recursos, Práctica, Notas, Examen real).
 */
export function CertPage() {
  const { certId } = useParams<{ certId: string }>();
  const { t } = useT();
  const { state, ready } = useAppState();
  const now = useMemo(() => new Date(), []);

  const cert = state.certifications.find((candidate) => candidate.id === certId);

  if (!ready) {
    return (
      <section aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (!cert) return <Navigate to="/ruta" replace />;

  const planItem = state.planItems.find((item) => item.certId === cert.id) ?? null;
  const attempts = state.attempts.filter((attempt) => attempt.certId === cert.id);
  const resources = state.resources.filter((resource) => resource.certId === cert.id);
  const topics = state.topics.filter((topic) => topic.certId === cert.id);
  const checklistItems = state.checklistItems.filter((item) => item.certId === cert.id);
  const notes = state.notes.filter((note) => note.certId === cert.id);
  const sessions = state.studySessions.filter((session) => session.certId === cert.id);

  const readiness = computeReadiness({ cert, planItem, attempts, resources, sessions });
  const realAttempts = attempts.filter((attempt) => attempt.kind === 'real');

  return (
    <section className="flex flex-col gap-4">
      <CertHeader cert={cert} planItem={planItem} />

      <TabsRoot defaultValue="resumen" className="flex flex-col">
        <TabsList ariaLabel={t('cert.tabs.label')}>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.key)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumen">
          <SummaryTab cert={cert} planItem={planItem} readiness={readiness} sessions={sessions} />
        </TabsContent>

        <TabsContent value="dominios">
          <DomainsTab cert={cert} attempts={attempts} />
        </TabsContent>

        <TabsContent value="temas">
          <TopicsTab cert={cert} topics={topics} />
        </TabsContent>

        <TabsContent value="checklist">
          <ChecklistTab cert={cert} items={checklistItems} />
        </TabsContent>

        <TabsContent value="recursos">
          <ResourcesTab resources={resources} />
        </TabsContent>

        <TabsContent value="practica">
          <PracticeTab cert={cert} attempts={attempts} />
        </TabsContent>

        <TabsContent value="notas">
          <NotesTab notes={notes} />
        </TabsContent>

        <TabsContent value="examen">
          <ExamTab cert={cert} planItem={planItem} attempts={realAttempts} now={now} />
        </TabsContent>
      </TabsRoot>
    </section>
  );
}
