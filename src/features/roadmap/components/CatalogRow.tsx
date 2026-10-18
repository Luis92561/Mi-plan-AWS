import { Link } from 'react-router-dom';
import type { Certification } from '@/data/types';
import { Badge, Button, Chip } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { retiringSoon } from '@/domain/recommend';
import { OPTIONAL_CERTS } from '@/data/seed';

export interface CatalogRowProps {
  cert: Certification;
  now: Date;
  pending: boolean;
  onAdd: (cert: Certification) => void;
}

/** Certificación del catálogo fuera de mi plan, con su botón "Añadir a mi plan" (§7.2). */
export function CatalogRow({ cert, now, pending, onAdd }: CatalogRowProps) {
  const { t, f } = useT();
  const optional = OPTIONAL_CERTS.includes(cert.code);
  const retiring = retiringSoon(cert, now);

  return (
    <li className="flex flex-col gap-2 border-b border-line py-2.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/ruta/${cert.id}`}
            aria-label={t('roadmap.card.open', { code: cert.code })}
            className="text-body font-bold text-text hover:text-accent hover:no-underline"
          >
            {cert.code}
          </Link>
          <Chip>{t(`enum.phaseShort.${cert.phase}`)}</Chip>
          <Chip>{t(`enum.level.${cert.level}`)}</Chip>
          {optional ? <Chip title={t('roadmap.card.optionalNote')}>{t('roadmap.optional')}</Chip> : null}
          {cert.lifecycle === 'retired' ? <Chip>{t('roadmap.retired')}</Chip> : null}
          {retiring && cert.retirementDate ? (
            <Badge tone="warn">
              <span aria-hidden="true">▲</span>
              {t('roadmap.retiring', { date: f.date(cert.retirementDate), code: cert.code })}
            </Badge>
          ) : null}
        </div>
        <p className="text-ui text-muted">{cert.name}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
          <span className="tnum">{f.currency(cert.priceUsd)}</span>
          {optional && cert.notes ? <span>{cert.notes}</span> : null}
        </p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        glyph
        disabled={pending}
        onClick={() => onAdd(cert)}
        className="shrink-0 self-start"
      >
        {t('action.addToPlan')}
      </Button>
    </li>
  );
}
