import type { Certification, PlanItem, StudySession } from '@/data/types';
import type { ReadinessResult } from '@/domain/readiness';
import { Card, CardBody, CardHead, Chip, Progress } from '@/components/ui/primitives';
import { ReadinessRing } from '@/components/ui/ring';
import { useT } from '@/lib/i18n/useT';

export interface SummaryTabProps {
  cert: Certification;
  planItem: PlanItem | null;
  readiness: ReadinessResult;
  sessions: StudySession[];
}

/** Pestaña Resumen (§7.3): datos oficiales, readiness con desglose y enlaces. */
export function SummaryTab({ cert, planItem, readiness, sessions }: SummaryTabProps) {
  const { t, f } = useT();
  const minutes = sessions.reduce((sum, session) => sum + session.minutes, 0);

  const rows = [
    { key: 'coverage', label: t('cert.summary.coverage'), value: readiness.breakdown.domainCoverage },
    { key: 'mocks', label: t('cert.summary.mocks'), value: readiness.breakdown.mockPerformance },
    { key: 'resources', label: t('cert.summary.resources'), value: readiness.breakdown.resourcesDone },
    { key: 'hours', label: t('cert.summary.hours'), value: readiness.breakdown.hoursVsPlan },
  ];
  const toneOf = (value: number) => (value >= 0.8 ? 'ok' : value >= 0.5 ? 'warn' : 'err');

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('cert.summary.readiness')}
          </h2>
          <span className="text-meta text-muted">{t('cert.summary.how')}</span>
        </CardHead>
        <CardBody className="flex flex-col gap-3">
          <ReadinessRing
            value={readiness.score}
            preliminary={readiness.preliminary}
            tone={readiness.score >= 80 ? 'ok' : 'accent'}
            label={t('cert.summary.readiness')}
            caption={
              readiness.preliminary
                ? t('cert.summary.preliminary')
                : t('cert.summary.attempts', { n: readiness.attemptsCount, count: readiness.attemptsCount })
            }
            size={96}
          />
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-2 text-meta">
                  <span className="text-muted">{row.label}</span>
                  <span className="tnum text-text">{f.percent(row.value)}</span>
                </div>
                <Progress
                  className="mt-1"
                  value={row.value}
                  tone={toneOf(row.value)}
                  label={row.label}
                />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('cert.summary.official')}
          </h2>
          <Chip>{t(`enum.level.${cert.level}`)}</Chip>
        </CardHead>
        <CardBody className="flex flex-col gap-2.5">
          <div>
            <p className="label-mono">{t('cert.summary.recommended')}</p>
            <p className="text-ui text-text">{cert.recommendedExperience || t('cert.summary.none')}</p>
          </div>
          <div>
            <p className="label-mono">{t('cert.summary.prerequisites')}</p>
            {cert.prerequisites.length > 0 ? (
              <>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {cert.prerequisites.map((code) => (
                    <li key={code}>
                      <Chip>{code}</Chip>
                    </li>
                  ))}
                </ul>
                {cert.prerequisiteMode === 'any' ? (
                  <p className="mt-1 text-meta text-muted">{t('cert.summary.prerequisiteAny')}</p>
                ) : null}
              </>
            ) : (
              <p className="text-ui text-text">{t('cert.summary.none')}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <p className="label-mono">{t('cert.tab.domains')}</p>
              <p className="tnum text-ui text-text">
                {t('cert.summary.domainsCount', { n: cert.domains.length, count: cert.domains.length })}
              </p>
            </div>
            <div>
              <p className="label-mono">{t('cert.summary.retirement')}</p>
              <p className="tnum text-ui text-text">
                {cert.retirementDate ? f.date(cert.retirementDate) : t('cert.summary.none')}
              </p>
            </div>
          </div>
          {cert.notes ? (
            <div>
              <p className="label-mono">{t('cert.summary.notes')}</p>
              <p className="max-w-prose text-ui text-muted">{cert.notes}</p>
            </div>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-2.5 text-meta">
            <a href={cert.examGuideUrl} target="_blank" rel="noopener" className="text-accent">
              {t('cert.head.examGuide')} <span aria-hidden="true">↗</span>
            </a>
            <a href={cert.officialUrl} target="_blank" rel="noopener" className="text-accent">
              {t('cert.head.official')} <span aria-hidden="true">↗</span>
            </a>
            <span className="text-muted">{t('cert.head.verified', { date: f.date(cert.verifiedOn) })}</span>
          </div>
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHead>
          <h2 className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('cert.summary.plan')}
          </h2>
          {planItem ? (
            <Chip>{t(`enum.plan.${planItem.status}`)}</Chip>
          ) : (
            <Chip>{t('cert.head.notInPlan')}</Chip>
          )}
        </CardHead>
        <CardBody>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
            <div className="min-w-0">
              <dt className="label-mono">{t('cert.summary.planStatus')}</dt>
              <dd className="text-ui text-text">
                {planItem ? t(`enum.plan.${planItem.status}`) : t('cert.head.notInPlan')}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="label-mono">{t('cert.summary.target')}</dt>
              <dd className="tnum text-ui text-text">
                {planItem?.targetDate ? f.date(planItem.targetDate) : t('cert.exam.noDate')}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="label-mono">{t('cert.summary.hoursPlanned')}</dt>
              <dd className="tnum text-ui text-text">{f.hours((planItem?.hoursPlanned ?? 0) * 60)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="label-mono">{t('cert.summary.hoursDone')}</dt>
              <dd className="tnum text-ui text-text">{f.hours(minutes)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
