import { Link } from 'react-router-dom';
import type { AppState, Certification, PlanItem } from '@/data/types';
import { Badge, Card, Chip, Progress, StatusGlyph } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { blockingPrerequisites, retiringSoon } from '@/domain/recommend';
import { OPTIONAL_CERTS } from '@/data/seed';
import { isLocked, planGlyph, readinessOf } from '../helpers';

export interface CertCardProps {
  cert: Certification;
  item: PlanItem;
  state: AppState;
  now: Date;
  /** Primera certificación recomendada (§6.1.3): se marca con chip. */
  isNext: boolean;
}

/**
 * Tarjeta del timeline (§7.2, §9.7): código en mono 20 px, nombre 15 px,
 * precio y readiness en la línea de meta, barra de 4 px y glifo de estado.
 */
export function CertCard({ cert, item, state, now, isNext }: CertCardProps) {
  const { t, f } = useT();
  const readiness = readinessOf(state, cert, item);
  const locked = isLocked(state, cert);
  const blocking = locked ? blockingPrerequisites(cert.id, state.planItems, state.certifications) : [];
  const optional = OPTIONAL_CERTS.includes(cert.code);
  const retiring = retiringSoon(cert, now);
  const doneMinutes = state.studySessions
    .filter((session) => session.certId === cert.id)
    .reduce((sum, session) => sum + session.minutes, 0);
  const tone = readiness.score >= 80 ? 'ok' : readiness.score >= 50 ? 'warn' : 'err';

  return (
    <Card className="transition-colors duration-hover hover:border-control">
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link
            to={`/ruta/${cert.id}`}
            aria-label={t('roadmap.card.open', { code: cert.code })}
            className="text-h3 font-bold leading-none text-text hover:text-accent hover:no-underline"
          >
            {cert.code}
          </Link>
          {isNext ? <Badge tone="accent">{t('roadmap.next')}</Badge> : null}
          {optional ? <Chip title={t('roadmap.card.optionalNote')}>{t('roadmap.optional')}</Chip> : null}
          {cert.lifecycle === 'retired' ? <Chip>{t('roadmap.retired')}</Chip> : null}
          <StatusGlyph className="ml-auto" state={planGlyph(item.status)} label={t(`enum.plan.${item.status}`)} />
        </div>

        <Link
          to={`/ruta/${cert.id}`}
          className="text-body leading-snug text-text hover:text-accent hover:no-underline"
        >
          {cert.name}
        </Link>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-muted">
          <span className="flex items-baseline gap-1.5">
            <span className="label-mono">{t('roadmap.card.price')}</span>
            <span className="tnum text-text">{f.currency(cert.priceUsd)}</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="label-mono">{t('roadmap.card.target')}</span>
            <span className="tnum text-text">
              {item.targetDate ? f.date(item.targetDate) : t('roadmap.card.noTarget')}
            </span>
          </span>
          <span className="tnum">{t('roadmap.card.hours', { planned: f.hours(item.hoursPlanned * 60), done: f.hours(doneMinutes) })}</span>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="label-mono">{t('roadmap.card.readiness')}</span>
            <span className="tnum text-meta text-text">
              {readiness.score} %
              {readiness.preliminary ? (
                <span aria-hidden="true" className="ml-1 text-warn">
                  ▲
                </span>
              ) : null}
            </span>
          </div>
          <Progress
            className="mt-1"
            value={readiness.score}
            max={100}
            tone={tone}
            label={t('roadmap.readinessOf', { code: cert.code })}
          />
          {readiness.preliminary ? <p className="mt-1 text-meta text-muted">{t('roadmap.card.preliminary')}</p> : null}
        </div>

        {locked ? (
          <div className="flex flex-wrap items-center gap-1.5 text-meta text-muted">
            <span aria-hidden="true" className="text-body leading-none text-muted">
              ›
            </span>
            <span>{t('roadmap.card.lockedBy', { codes: blocking.join(', ') })}</span>
            {blocking.map((code) => (
              <Chip key={code} title={t('roadmap.card.lockedHint', { codes: code })}>
                {code}
              </Chip>
            ))}
          </div>
        ) : null}

        {retiring && cert.retirementDate ? (
          <p className="flex items-start gap-1.5 rounded-input border border-warn/40 px-2 py-1 text-meta text-warn" role="status">
            <span aria-hidden="true">▲</span>
            <span>{t('roadmap.retiring', { date: f.date(cert.retirementDate), code: cert.code })}</span>
          </p>
        ) : null}

        {optional && cert.notes ? <p className="text-meta text-muted">{cert.notes}</p> : null}
      </div>
    </Card>
  );
}
