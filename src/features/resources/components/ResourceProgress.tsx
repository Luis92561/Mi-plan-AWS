import { Progress } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import type { ResourceCertTotal } from '../helpers';

export interface ResourceProgressProps {
  totals: ResourceCertTotal[];
}

/** Totales por certificación: completados / total con barra (§7.3). */
export function ResourceProgress({ totals }: ResourceProgressProps) {
  const { t } = useT();

  if (totals.length === 0) {
    return <p className="text-ui text-muted">{t('resources.totals.empty')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {totals.map((row) => {
        const label = row.code ?? t('resources.totals.none');
        const complete = row.total > 0 && row.done === row.total;
        return (
          <li key={row.certId ?? 'none'}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <span className="text-ui text-text">{label}</span>
              <span className="flex items-baseline gap-1.5 tnum text-meta text-muted">
                <span aria-hidden="true" className={complete ? 'text-ok' : undefined}>
                  {complete ? '✓' : '○'}
                </span>
                <span>{t('resources.totals.ratio', { done: row.done, total: row.total })}</span>
              </span>
            </div>
            <Progress
              className="mt-1.5"
              value={row.total > 0 ? row.done / row.total : 0}
              tone={complete ? 'ok' : 'accent'}
              label={t('resources.totals.label', { cert: label })}
            />
          </li>
        );
      })}
    </ul>
  );
}
