import { Bell, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardBody, CardHead } from '@/components/ui/primitives';
import type { Settings } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import type { TKey } from '@/lib/i18n/shape';
import type { PermissionState } from '../permission';

const LABEL_KEYS: Record<PermissionState, TKey> = {
  default: 'reminders.permission.default',
  granted: 'reminders.permission.granted',
  denied: 'reminders.permission.denied',
  unsupported: 'reminders.permission.unsupported',
};

const TONES: Record<PermissionState, 'neutral' | 'ok' | 'err' | 'warn'> = {
  default: 'neutral',
  granted: 'ok',
  denied: 'err',
  unsupported: 'warn',
};

const HINT_KEYS: Record<PermissionState, TKey> = {
  default: 'reminders.permission.defaultHint',
  granted: 'reminders.permission.grantedHint',
  denied: 'reminders.ics.alternative',
  unsupported: 'reminders.ics.alternative',
};

export interface PermissionCardProps {
  permission: PermissionState;
  /** Pidiendo permiso (deshabilita «Activar»). */
  busy: boolean;
  settings: Settings;
  windowDays: number;
  onEnable: () => void;
  onTest: () => void;
  /** Lleva el foco a la tarjeta del `.ics` (nunca cambia la ruta). */
  onGoToIcs: () => void;
}

/**
 * Estado del permiso de notificaciones (§7.13): `default` → *Activar*;
 * `granted` → *Probar notificación*; `denied`/`unsupported` → banner con la
 * alternativa `.ics`. Nunca falla en silencio (§8.8).
 */
export function PermissionCard({
  permission,
  busy,
  settings,
  windowDays,
  onEnable,
  onTest,
  onGoToIcs,
}: PermissionCardProps) {
  const { t } = useT();
  const blocked = permission === 'denied' || permission === 'unsupported';

  return (
    <Card>
      <CardHead>
        <h2 className="text-h3 font-bold">{t('reminders.permission.title')}</h2>
        <Badge tone={TONES[permission]}>{t(LABEL_KEYS[permission])}</Badge>
      </CardHead>
      <CardBody className="flex flex-col gap-3">
        <p className="text-ui text-text">{t('reminders.privacy')}</p>
        <p className="text-meta text-muted">{t(HINT_KEYS[permission])}</p>

        <div className="flex flex-wrap items-center gap-2">
          {permission === 'default' ? (
            <Button variant="primary" onClick={onEnable} disabled={busy} className="min-h-11 md:min-h-10">
              <Bell size={15} aria-hidden="true" />
              {busy ? t('reminders.permission.enabling') : t('reminders.permission.enable')}
            </Button>
          ) : null}
          {permission === 'granted' ? (
            <Button variant="secondary" onClick={onTest} className="min-h-11 md:min-h-10">
              <Bell size={15} aria-hidden="true" />
              {t('reminders.test.action')}
            </Button>
          ) : null}
        </div>

        {blocked ? (
          <div
            role="alert"
            className="flex flex-col gap-1.5 rounded-card border border-err/45 bg-panel-2 px-3 py-2"
          >
            <p className="text-ui text-err">
              <span aria-hidden="true">▲ </span>
              {permission === 'denied'
                ? t('reminders.permission.deniedBanner')
                : t('reminders.permission.unsupportedBanner')}
            </p>
            {permission === 'denied' ? <p className="text-meta text-muted">{t('reminders.permission.howTo')}</p> : null}
            <div>
              <Button variant="secondary" size="sm" onClick={onGoToIcs} className="min-h-11 md:min-h-8">
                <Download size={14} aria-hidden="true" />
                {t('action.exportIcs')}
              </Button>
            </div>
          </div>
        ) : null}

        <h3 className="label-mono">{t('reminders.config.title')}</h3>
        <ul className="grid gap-1 text-meta text-muted sm:grid-cols-2">
          <li className="tnum">{t('reminders.config.window', { count: windowDays })}</li>
          <li className="tnum">{t('reminders.config.time', { time: settings.dailyReminderTime })}</li>
          <li className="tnum">{t('reminders.config.limit', { count: settings.maxRemindersPerDay })}</li>
          <li className="tnum">
            {t('reminders.config.quiet', { from: settings.quietHours.from, to: settings.quietHours.to })}
          </li>
        </ul>

        {!settings.remindersEnabled ? (
          <p className="flex flex-wrap items-center gap-2 text-meta text-warn">
            <span aria-hidden="true">▲ </span>
            {t('reminders.config.disabled')}
            <Link to="/ajustes" className="text-accent">
              {t('reminders.config.settingsLink')}
            </Link>
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
