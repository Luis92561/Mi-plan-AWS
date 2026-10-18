import { Link } from 'react-router-dom';
import { Card, Chip, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import type { DashboardStep } from '../model';
import { stepKindKey, stepText } from '../stepText';

/** "Próximos pasos" (§7.1): lista numerada 01/02/03, cada fila clicable. */
export function NextSteps({ steps, no }: { steps: DashboardStep[]; no: string }) {
  const { t } = useT();

  return (
    <section>
      <SectionHead no={no} title={t('dashboard.section.steps')} />
      {steps.length === 0 ? (
        <Card className="px-4 py-3 text-meta text-muted">{t('dashboard.stepsEmpty')}</Card>
      ) : (
        <Card>
          <ol className="flex flex-col">
            {steps.map((step, index) => (
              <li key={step.id} className="border-b border-line last:border-b-0">
                <Link
                  to={step.href}
                  className="flex min-h-[56px] items-center gap-3 px-3 py-2.5 transition-colors duration-hover hover:bg-hover"
                >
                  <span aria-hidden="true" className="section-no w-6 shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-ui text-text">{stepText(step, t)}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Chip>{step.certCode}</Chip>
                      <Chip>{t(stepKindKey(step.kind))}</Chip>
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-muted">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  );
}
