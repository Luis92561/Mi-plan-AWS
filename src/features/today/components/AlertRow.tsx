import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/cn';
import type { AppAlert } from '@/domain/alerts';

/** Tono por severidad: el texto del aviso y la etiqueta llevan el peso, no el color. */
const STYLES: Record<AppAlert['severity'], { tone: 'accent' | 'warn' | 'err'; border: string; text: string }> = {
  info: { tone: 'accent', border: 'border-line hover:border-accent', text: 'text-accent' },
  warn: { tone: 'warn', border: 'border-line hover:border-warn', text: 'text-warn' },
  error: { tone: 'err', border: 'border-line hover:border-err', text: 'text-err' },
};

/**
 * §7.9 — aviso del bloque 3 (examen ≤30 días, voucher por vencer, inactividad…).
 * El texto viene traducido del `messageKey` que arma `buildAlerts`; el enlace
 * lleva a la pantalla donde se resuelve.
 */
export function AlertRow({ alert }: { alert: AppAlert }) {
  const { t } = useT();
  const style = STYLES[alert.severity];

  return (
    <li>
      <Link
        to={alert.href}
        className={cn(
          'flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-card border bg-panel px-3 py-2.5',
          'text-ui transition-colors duration-hover',
          style.border,
        )}
      >
        <span aria-hidden="true" className={cn('text-body leading-none', style.text)}>
          {alert.severity === 'info' ? '●' : '▲'}
        </span>
        <span className="min-w-0 flex-1 break-words">{t(alert.messageKey, alert.vars)}</span>
        <Badge tone={style.tone}>{t(`today.severity.${alert.severity}` as 'today.severity.info')}</Badge>
        <span className="label-mono whitespace-nowrap">
          {t('common.open')} <span aria-hidden="true">›</span>
        </span>
      </Link>
    </li>
  );
}
