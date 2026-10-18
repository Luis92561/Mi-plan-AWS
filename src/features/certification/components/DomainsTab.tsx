import type { Attempt, Certification } from '@/data/types';
import { StatusGlyph } from '@/components/ui/primitives';
import { domainProgress } from '@/domain/scoring';
import { useT } from '@/lib/i18n/useT';

export interface DomainsTabProps {
  cert: Certification;
  attempts: Attempt[];
}

/** Pestaña Dominios (§7.3): peso, acierto de práctica y semáforo con glifo + texto. */
export function DomainsTab({ cert, attempts }: DomainsTabProps) {
  const { t, f } = useT();
  const progress = domainProgress(attempts);
  const rows = cert.domains.map((domain) => ({
    domain,
    row: progress.find((entry) => entry.domainId === domain.id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-meta text-muted">{t('cert.domains.hint')}</p>

      <div className="hidden overflow-x-auto md:block">
        <table className="ledger">
          <caption className="sr-only">{t('cert.tab.domains')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('cert.domains.col.domain')}</th>
              <th scope="col" className="num">
                {t('cert.domains.col.weight')}
              </th>
              <th scope="col" className="num">
                {t('cert.domains.col.practice')}
              </th>
              <th scope="col">{t('cert.domains.col.light')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ domain, row }) => (
              <tr key={domain.id}>
                <td>{domain.name}</td>
                <td className="num tnum">{f.percent(domain.weight)}</td>
                <td className="num tnum">
                  {row?.ratio === null || row?.ratio === undefined ? t('cert.domains.noData') : f.percent(row.ratio)}
                </td>
                <td>
                  <StatusGlyph
                    state={row?.light === 'ok' ? 'aprobado' : row?.light === 'warn' ? 'enCurso' : row?.light === 'err' ? 'alerta' : 'pendiente'}
                    label={t(`cert.domains.light.${row?.light ?? 'none'}`)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map(({ domain, row }) => (
          <li key={domain.id} className="rounded-card border border-line bg-panel px-3 py-2.5">
            <p className="text-ui text-text">{domain.name}</p>
            <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-meta">
              <div>
                <dt className="label-mono">{t('cert.domains.col.weight')}</dt>
                <dd className="tnum text-text">{f.percent(domain.weight)}</dd>
              </div>
              <div>
                <dt className="label-mono">{t('cert.domains.col.practice')}</dt>
                <dd className="tnum text-text">
                  {row?.ratio === null || row?.ratio === undefined ? t('cert.domains.noData') : f.percent(row.ratio)}
                </dd>
              </div>
            </dl>
            <div className="mt-1.5">
              <StatusGlyph
                state={row?.light === 'ok' ? 'aprobado' : row?.light === 'warn' ? 'enCurso' : row?.light === 'err' ? 'alerta' : 'pendiente'}
                label={t(`cert.domains.light.${row?.light ?? 'none'}`)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
