import { Button, Chip, Progress } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useAppState } from '@/data/store';
import type { Attempt } from '@/data/types';
import { attemptScore } from '@/domain/scoring';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';

function lightOf(ratio: number): { tone: 'ok' | 'warn' | 'err'; glyph: string; key: string } {
  if (ratio >= 0.8) return { tone: 'ok', glyph: '●', key: 'practice.light.ok' };
  if (ratio >= 0.6) return { tone: 'warn', glyph: '◐', key: 'practice.light.warn' };
  return { tone: 'err', glyph: '▲', key: 'practice.light.err' };
}

export interface AttemptDetailModalProps {
  attempt: Attempt;
  onOpenChange: (open: boolean) => void;
}

/** Desglose de un intento (§7.5): puntaje, metadatos y acierto por dominio. */
export function AttemptDetailModal({ attempt, onOpenChange }: AttemptDetailModalProps) {
  const { t, f } = useT();
  const { state } = useAppState();

  const cert = state.certifications.find((item) => item.id === attempt.certId);
  const voucher = attempt.voucherId
    ? state.vouchers.find((item) => item.id === attempt.voucherId)
    : undefined;
  const shown = attemptScore(attempt);
  const isEstimate = attempt.score === null && attempt.estimatedScore !== null;
  const passing = cert?.passingScore ?? null;

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={t('practice.detail.title')}
      description={t('practice.detail.meta', {
        cert: cert?.code ?? attempt.certId,
        date: f.date(attempt.date),
      })}
      closeLabel={t('common.close')}
      className="w-[min(640px,calc(100vw-24px))]"
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 rounded-card border border-line bg-panel-2 px-3 py-2.5">
          <span className="label-mono">
            {isEstimate ? t('practice.detail.estimated') : t('practice.detail.score')}
          </span>
          <span className="tnum text-h2 font-bold">
            {shown === null ? '—' : f.score(shown, passing)}
          </span>
          {isEstimate && cert ? (
            <p className="text-meta text-muted">
              {t('practice.detail.estimateNote', {
                cert: cert.code,
                passing: cert.passingScore,
              })}
            </p>
          ) : null}
          <Progress
            className="mt-1"
            value={shown ?? 0}
            max={1000}
            tone={attempt.passed === true ? 'ok' : attempt.passed === false ? 'err' : 'accent'}
            label={isEstimate ? t('practice.detail.estimated') : t('practice.detail.score')}
          />
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-ui">
          <div className="flex flex-col gap-0.5">
            <dt className="label-mono">{t('practice.detail.kind')}</dt>
            <dd>{t(`enum.attempt.${attempt.kind}` as TKey)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="label-mono">{t('practice.detail.source')}</dt>
            <dd className="break-words">{attempt.source || '—'}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="label-mono">{t('practice.detail.duration')}</dt>
            <dd className="tnum">{f.minutes(attempt.durationMin)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="label-mono">{t('practice.detail.cost')}</dt>
            <dd className="tnum">{f.currency(attempt.costUsd)}</dd>
          </div>
          {voucher ? (
            <div className="col-span-2 flex flex-col gap-0.5">
              <dt className="label-mono">{t('practice.detail.voucher')}</dt>
              <dd className="flex flex-wrap items-center gap-1.5">
                <Chip>{voucher.label}</Chip>
                <span className="tnum text-muted">{f.percent(voucher.percent / 100)}</span>
              </dd>
            </div>
          ) : null}
        </dl>

        <section aria-labelledby="att-breakdown" className="flex flex-col gap-2">
          <h3 id="att-breakdown" className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('practice.detail.breakdown')}
          </h3>
          {attempt.breakdown.length === 0 ? (
            <p className="text-ui text-muted">{t('practice.detail.empty')}</p>
          ) : (
            <table className="ledger text-ui">
              <caption className="sr-only">{t('practice.detail.breakdown')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('practice.detail.domain')}</th>
                  <th scope="col" className="num">
                    {t('practice.detail.correct')}
                  </th>
                  <th scope="col">{t('practice.detail.ratio')}</th>
                </tr>
              </thead>
              <tbody>
                {attempt.breakdown.map((row) => {
                  const domain = cert?.domains.find((item) => item.id === row.domainId);
                  const ratio = row.total > 0 ? row.correct / row.total : 0;
                  const light = lightOf(ratio);
                  return (
                    <tr key={row.domainId}>
                      <td className="break-words">{domain?.name ?? row.domainId}</td>
                      <td className="num">
                        {f.number(row.correct)}/{f.number(row.total)}
                      </td>
                      <td>
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            aria-hidden="true"
                            className={
                              light.tone === 'ok'
                                ? 'text-ok'
                                : light.tone === 'warn'
                                  ? 'text-warn'
                                  : 'text-err'
                            }
                          >
                            {light.glyph}
                          </span>
                          <span className="tnum">{f.percent(ratio)}</span>
                          <span className="text-meta text-muted">{t(light.key as TKey)}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="label-mono">{t('practice.detail.notes')}</h3>
          <p className="whitespace-pre-wrap text-ui text-text">
            {attempt.notes ? attempt.notes : t('practice.detail.noNotes')}
          </p>
        </section>
      </div>
    </Modal>
  );
}
