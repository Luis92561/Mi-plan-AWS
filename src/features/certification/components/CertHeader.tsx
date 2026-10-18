import { useNavigate } from 'react-router-dom';
import type { Certification, PlanItem } from '@/data/types';
import { Button, Card, Chip } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { CertMenu } from './CertMenu';

export interface CertHeaderProps {
  cert: Certification;
  planItem: PlanItem | null;
}

/** Cabecera del detalle (§7.3): código, nombre oficial, nivel, fase, datos y ciclo de vida. */
export function CertHeader({ cert, planItem }: CertHeaderProps) {
  const { t, f } = useT();
  const navigate = useNavigate();

  const cells = [
    {
      key: 'price',
      label: t('cert.head.price'),
      value: cert.priceUsd === null ? t('cert.head.priceUnknown') : f.currency(cert.priceUsd),
    },
    { key: 'duration', label: t('cert.head.duration'), value: f.minutes(cert.durationMin) },
    { key: 'questions', label: t('cert.head.questions'), value: f.number(cert.questions) },
    {
      key: 'scored',
      label: t('cert.head.scored'),
      value: cert.scoredQuestions === null ? null : f.number(cert.scoredQuestions),
    },
    { key: 'passing', label: t('cert.head.passing'), value: f.number(cert.passingScore) },
    { key: 'lifecycle', label: t('cert.summary.lifecycle'), value: t(`enum.lifecycle.${cert.lifecycle}`) },
  ];

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ruta')}>
          <span aria-hidden="true">←</span>
          {t('cert.back')}
        </Button>
        <Chip title={t('cert.head.level')}>{t(`enum.level.${cert.level}`)}</Chip>
        <Chip title={t('cert.head.phase')}>{t(`enum.phase.${cert.phase}`)}</Chip>
        {planItem ? (
          <Chip>{t(`enum.plan.${planItem.status}`)}</Chip>
        ) : (
          <Chip>{t('cert.head.notInPlan')}</Chip>
        )}
        <div className="ml-auto">
          <CertMenu cert={cert} planItem={planItem} />
        </div>
      </div>

      <div>
        <p className="label-mono tnum">{cert.code}</p>
        <h1 className="mt-1 text-h2 font-bold leading-tight text-text">{cert.name}</h1>
      </div>

      {cert.lifecycle === 'retired' ? (
        <p role="status" className="flex items-start gap-1.5 rounded-card border border-line bg-panel px-3 py-2 text-ui text-muted">
          <span aria-hidden="true">▲</span>
          {t('cert.lifecycle.retired')}
        </p>
      ) : null}

      {cert.lifecycle === 'retiring' && cert.retirementDate ? (
        <p
          role="status"
          className="flex items-start gap-1.5 rounded-card border border-warn/45 bg-panel px-3 py-2 text-ui text-warn"
        >
          <span aria-hidden="true">▲</span>
          {t('cert.lifecycle.retiring', { date: f.date(cert.retirementDate) })}
        </p>
      ) : null}

      <Card className="px-3.5 py-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {cells.map((cell) => (
            <div key={cell.key} className="min-w-0">
              <dt className="label-mono">{cell.label}</dt>
              <dd className="tnum truncate text-ui text-text">
                {cell.value === null ? <span aria-hidden="true">—</span> : cell.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-meta">
        <a href={cert.examGuideUrl} target="_blank" rel="noopener" className="text-accent">
          {t('cert.head.examGuide')} <span aria-hidden="true">↗</span>
        </a>
        <a href={cert.officialUrl} target="_blank" rel="noopener" className="text-accent">
          {t('cert.head.official')} <span aria-hidden="true">↗</span>
        </a>
        <span className="text-muted">{t('cert.head.verified', { date: f.date(cert.verifiedOn) })}</span>
      </div>
    </header>
  );
}
