import { Link } from 'react-router-dom';
import type { Attempt, Certification } from '@/data/types';
import { Chip, StatusGlyph } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { byDateDesc, attemptView } from '../helpers';

export interface PracticeTabProps {
  cert: Certification;
  attempts: Attempt[];
}

/** Pestaña Práctica (§7.3): intentos de la certificación con puntaje estimado vs. mínimo. */
export function PracticeTab({ cert, attempts }: PracticeTabProps) {
  const { t, f } = useT();
  const views = byDateDesc(attempts).map((attempt) => attemptView(attempt, cert));

  if (views.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-ui text-muted">{t('cert.practice.empty')}</p>
        <Link to="/practica" className="text-meta text-accent">
          {t('cert.practice.all')} <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col">
        {views.map(({ attempt, score, passed, estimated }) => (
          <li
            key={attempt.id}
            className="flex flex-col gap-1.5 border-b border-line py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ui text-text">
                <span className="tnum">{f.date(attempt.date)}</span>
                <Chip>{t(`enum.attempt.${attempt.kind}`)}</Chip>
                {attempt.source ? <span className="truncate text-muted">{attempt.source}</span> : null}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
                <span>
                  {t('cert.practice.col.correct')}:{' '}
                  <span className="tnum text-text">
                    {attempt.correct !== null && attempt.total !== null
                      ? `${attempt.correct}/${attempt.total}`
                      : t('cert.practice.noScore')}
                  </span>
                </span>
                {estimated ? <Chip>{t('cert.practice.estimated')}</Chip> : null}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="tnum text-ui text-text">
                {score === null ? t('cert.practice.noScore') : f.score(score, cert.passingScore)}
              </span>
              {passed === null ? (
                <StatusGlyph state="pendiente" label={t('cert.practice.noScore')} />
              ) : (
                <StatusGlyph
                  state={passed ? 'aprobado' : 'alerta'}
                  label={passed ? t('cert.practice.passed') : t('cert.practice.failed')}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-meta text-muted">{t('cert.practice.hint')}</p>
        <Link to="/practica" className="text-meta text-accent">
          {t('cert.practice.all')} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
