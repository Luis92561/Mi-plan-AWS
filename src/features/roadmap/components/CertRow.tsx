import { Link } from 'react-router-dom';
import type { AppState, Certification, PlanItem } from '@/data/types';
import { Badge, Chip, Progress, StatusGlyph } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { blockingPrerequisites, retiringSoon } from '@/domain/recommend';
import { OPTIONAL_CERTS } from '@/data/seed';
import { isLocked, planGlyph, readinessOf } from '../helpers';

export interface CertRowProps {
  cert: Certification;
  item: PlanItem;
  state: AppState;
  now: Date;
  isNext: boolean;
}

/** Vista compacta (§7.2): una línea por certificación con glifo, cifra y barra de 4 px. */
export function CertRow({ cert, item, state, now, isNext }: CertRowProps) {
  const { t, f } = useT();
  const readiness = readinessOf(state, cert, item);
  const locked = isLocked(state, cert);
  const blocking = locked ? blockingPrerequisites(cert.id, state.planItems, state.certifications) : [];
  const optional = OPTIONAL_CERTS.includes(cert.code);
  const retiring = retiringSoon(cert, now);
  const tone = readiness.score >= 80 ? 'ok' : readiness.score >= 50 ? 'warn' : 'err';

  return (
    <li className="flex items-start gap-3 border-b border-line py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/ruta/${cert.id}`}
            aria-label={t('roadmap.card.open', { code: cert.code })}
            className="text-body font-bold text-text hover:text-accent hover:no-underline"
          >
            {cert.code}
          </Link>
          {isNext ? <Badge tone="accent">{t('roadmap.next')}</Badge> : null}
          {optional ? <Chip title={t('roadmap.card.optionalNote')}>{t('roadmap.optional')}</Chip> : null}
          {locked ? (
            <span className="flex items-center gap-1 text-meta text-muted">
              <span aria-hidden="true" className="text-body leading-none">
                ›
              </span>
              {t('roadmap.locked')}
            </span>
          ) : null}
        </div>
        <p className="truncate text-ui text-muted">{cert.name}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
          <span className="tnum">{f.currency(cert.priceUsd)}</span>
          <span className="tnum">{item.targetDate ? f.date(item.targetDate) : t('roadmap.card.noTarget')}</span>
          {locked && blocking.length > 0 ? (
            <span>{t('roadmap.card.lockedBy', { codes: blocking.join(', ') })}</span>
          ) : null}
          {retiring && cert.retirementDate ? (
            <span className="text-warn">
              <span aria-hidden="true">▲ </span>
              {t('roadmap.retiring', { date: f.date(cert.retirementDate), code: cert.code })}
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex w-14 shrink-0 flex-col items-end gap-1 pt-0.5">
        <span className="tnum text-meta text-text">{readiness.score} %</span>
        <Progress
          className="w-14"
          value={readiness.score}
          max={100}
          tone={tone}
          label={t('roadmap.readinessOf', { code: cert.code })}
        />
      </div>

      <StatusGlyph
        className="shrink-0 pt-0.5"
        state={planGlyph(item.status)}
        label={t(`enum.plan.${item.status}`)}
      />
    </li>
  );
}
