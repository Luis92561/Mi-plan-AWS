import { Card, CardBody, Field, Select } from '@/components/ui/primitives';
import type { Certification, Flashcard } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import { domainsWithCards, type DeckFilter } from '../model';

export interface DeckFilterBarProps {
  certifications: Certification[];
  cards: Flashcard[];
  filter: DeckFilter;
  onChange: (filter: DeckFilter) => void;
}

/**
 * §7.7 — filtro por certificación y por mazo (dominio). El mazo solo tiene
 * sentido dentro de una certificación, así que sin certificación queda
 * deshabilitado con su explicación.
 */
export function DeckFilterBar({ certifications, cards, filter, onChange }: DeckFilterBarProps) {
  const { t } = useT();
  const domains = domainsWithCards(certifications, cards, filter.certId);

  return (
    <Card role="group" aria-label={t('review.filter.legend')}>
      <CardBody className="flex flex-wrap items-end gap-3">
        <Field label={t('review.filter.cert')} htmlFor="review-filter-cert" className="min-w-[180px] flex-1">
          <Select
            id="review-filter-cert"
            value={filter.certId ?? ''}
            onChange={(event) =>
              onChange({
                certId: event.target.value === '' ? null : event.target.value,
                domainId: null,
              })
            }
          >
            <option value="">{t('review.filter.allCerts')}</option>
            {certifications.map((cert) => (
              <option key={cert.id} value={cert.id}>
                {t('review.form.certOption', { code: cert.code, name: cert.name })}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={t('review.filter.domain')}
          htmlFor="review-filter-domain"
          hint={filter.certId === null ? t('review.filter.domainNeedsCert') : undefined}
          className="min-w-[180px] flex-1"
        >
          <Select
            id="review-filter-domain"
            value={filter.domainId ?? ''}
            disabled={filter.certId === null || domains.length === 0}
            onChange={(event) =>
              onChange({
                certId: filter.certId,
                domainId: event.target.value === '' ? null : event.target.value,
              })
            }
          >
            <option value="">{t('review.filter.allDomains')}</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </Select>
        </Field>
      </CardBody>
    </Card>
  );
}
