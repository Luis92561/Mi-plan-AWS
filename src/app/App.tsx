import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { I18nBridge, PrefsProvider, usePrefs } from './prefs';
import { Layout } from './layout';
import { ToastProvider } from '@/components/ui/toast';
import { QuickSessionProvider } from '@/features/studylog/QuickSession';
import { useBoot } from './boot';
import { useT } from '@/lib/i18n/useT';
import { Skeleton } from '@/components/ui/primitives';
import { NotFoundPage } from './NotFoundPage';

/**
 * Rutas cargadas bajo demanda: el bundle inicial solo trae el shell, el dashboard
 * y las utilidades. `recharts`, `react-markdown` y `jszip` llegan con su pantalla.
 */
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const TodayPage = lazy(() => import('@/features/today/TodayPage').then((m) => ({ default: m.TodayPage })));
const RoadmapPage = lazy(() => import('@/features/roadmap/RoadmapPage').then((m) => ({ default: m.RoadmapPage })));
const CertPage = lazy(() => import('@/features/certification/CertPage').then((m) => ({ default: m.CertPage })));
const StudyLogPage = lazy(() =>
  import('@/features/studylog/StudyLogPage').then((m) => ({ default: m.StudyLogPage })),
);
const PracticePage = lazy(() => import('@/features/exams/PracticePage').then((m) => ({ default: m.PracticePage })));
const ResourcesPage = lazy(() =>
  import('@/features/resources/ResourcesPage').then((m) => ({ default: m.ResourcesPage })),
);
const BudgetPage = lazy(() => import('@/features/budget/BudgetPage').then((m) => ({ default: m.BudgetPage })));
const ReviewPage = lazy(() => import('@/features/flashcards/ReviewPage').then((m) => ({ default: m.ReviewPage })));
const ChecklistPage = lazy(() =>
  import('@/features/checklist/ChecklistPage').then((m) => ({ default: m.ChecklistPage })),
);
const NotesPage = lazy(() => import('@/features/notes/NotesPage').then((m) => ({ default: m.NotesPage })));
const RemindersPage = lazy(() =>
  import('@/features/reminders/RemindersPage').then((m) => ({ default: m.RemindersPage })),
);
const ExportPage = lazy(() => import('@/features/export/ExportPage').then((m) => ({ default: m.ExportPage })));
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function RouteFallback() {
  const { t } = useT();
  return (
    <div className="mx-auto flex max-w-shell flex-col gap-3 px-1 py-6" aria-busy="true">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/** Aplica los atajos globales de tema e idioma (§7.14). */
function GlobalShortcuts() {
  const { toggleTheme, toggleLocale } = usePrefs();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === 't') {
        event.preventDefault();
        toggleTheme();
      }
      if (key === 'l') {
        event.preventDefault();
        toggleLocale();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleTheme, toggleLocale]);
  return null;
}

function BootGate({ children }: { children: React.ReactNode }) {
  const { booted, error } = useBoot();
  const { t } = useT();
  if (!booted) {
    return (
      <div className="mx-auto flex max-w-shell flex-col gap-3 px-4 py-10" aria-busy="true">
        <span className="label-mono">{t('common.loading')}</span>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="mx-auto max-w-shell px-4 py-10">
        <p className="text-err">▲ {t('common.genericError', { message: error })}</p>
      </div>
    );
  }
  return <>{children}</>;
}

function Shell() {
  const { prefs, setLocale, toggleLocale } = usePrefs();
  return (
    <I18nBridge locale={prefs.locale} setLocale={setLocale} toggleLocale={toggleLocale}>
      <GlobalShortcuts />
      <ToastProvider>
        <QuickSessionProvider>
          <BootGate>
            <HashRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="hoy" element={<TodayPage />} />
                    <Route path="ruta" element={<RoadmapPage />} />
                    <Route path="ruta/:certId" element={<CertPage />} />
                    <Route path="bitacora" element={<StudyLogPage />} />
                    <Route path="practica" element={<PracticePage />} />
                    <Route path="recursos" element={<ResourcesPage />} />
                    <Route path="presupuesto" element={<BudgetPage />} />
                    <Route path="repaso" element={<ReviewPage />} />
                    <Route path="checklist" element={<ChecklistPage />} />
                    <Route path="notas" element={<NotesPage />} />
                    <Route path="notas/:noteId" element={<NotesPage />} />
                    <Route path="recordatorios" element={<RemindersPage />} />
                    <Route path="exportar" element={<ExportPage />} />
                    <Route path="ajustes" element={<SettingsPage />} />
                    <Route path="inicio" element={<Navigate to="/" replace />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </HashRouter>
          </BootGate>
        </QuickSessionProvider>
      </ToastProvider>
    </I18nBridge>
  );
}

export function App() {
  return (
    <PrefsProvider>
      <Shell />
    </PrefsProvider>
  );
}
