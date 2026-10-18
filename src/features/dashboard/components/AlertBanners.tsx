import { Link } from 'react-router-dom';
import { SectionHead } from '@/components/ui/primitives';
import type { AppAlert } from '@/domain/alerts';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/useT';

/**
 * Tono por severidad: glifo `▲` + color, nunca solo color (§9.8).
 * Colores sólidos del token: Tailwind no genera modificadores de opacidad sobre
 * `var(--token)`, así que no se usan clases con `/`.
 */
const TONES: Record<AppAlert['severity'], string> = {
  info: 'border-accent text-accent',
  warn: 'border-warn text-warn',
  error: 'border-err text-err',
};

/** Banners de aviso (§8.5): máximo 3, en el orden de prioridad que da el dominio. */
export function AlertBanners({ alerts }: { alerts: AppAlert[] }) {
  const { t } = useT();
  if (alerts.length === 0) return null;

  return (
    <section aria-live="polite">
      <SectionHead no="04" title={t('dashboard.section.alerts')} />
      <ul className="flex flex-col gap-2">
        {alerts.slice(0, 3).map((alert) => (
          <li key={alert.id}>
            <Link
              to={alert.href}
              className={cn(
                'flex min-h-[44px] items-center gap-2 rounded-card border bg-panel px-3 py-2 text-ui transition-colors duration-hover hover:bg-hover',
                TONES[alert.severity],
              )}
            >
              <span aria-hidden="true" className="shrink-0 leading-none">
                ▲
              </span>
              <span className="min-w-0">{t(alert.messageKey, alert.vars)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
