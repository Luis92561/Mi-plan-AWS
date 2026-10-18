import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardBody, CardHead, EmptyState, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAppState } from '@/data/store';
import { useT } from '@/lib/i18n/useT';
import { IcsExportCard } from './components/IcsExportCard';
import { PermissionCard } from './components/PermissionCard';
import { ReminderRow } from './components/ReminderRow';
import { buildReminderViews, groupReminders, reminderWindowDays, type ReminderView } from './model';
import {
  isNotificationSupported,
  readPermission,
  requestPermission,
  showLocalNotification,
  type PermissionState,
} from './permission';
import { useReminderActions } from './useReminderActions';

interface GroupSectionProps {
  title: string;
  emptyLabel: string;
  views: ReminderView[];
  busyId: string | null;
  onDone: (view: ReminderView) => void;
  onSnooze: (view: ReminderView, days: number) => void;
  onDiscard: (view: ReminderView) => void;
}

function GroupSection({ title, emptyLabel, views, busyId, onDone, onSnooze, onDiscard }: GroupSectionProps) {
  const { t } = useT();
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-baseline gap-2 text-body font-bold">
        <span aria-hidden="true" className="text-accent">
          ❯
        </span>
        {title}
        <span className="tnum text-meta font-normal text-muted">{t('reminders.group.hint', { count: views.length })}</span>
      </h3>
      {views.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-3 py-2 text-meta text-muted">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {views.map((view) => (
            <ReminderRow
              key={view.reminder.id}
              view={view}
              busy={busyId === view.reminder.id}
              onDone={() => onDone(view)}
              onSnooze={(days) => onSnooze(view, days)}
              onDiscard={() => onDiscard(view)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Recordatorios y calendario (§7.13, §8.8).
 *
 * · Estado del permiso de notificaciones + aviso de que son locales.
 * · Bandeja con los recordatorios del plan (pendientes, enviados, pospuestos).
 * · Exportación `.ics` con aviso de privacidad y `SEQUENCE` incremental.
 *
 * La pantalla no hace red: el permiso y las notificaciones son del navegador y
 * el calendario se serializa en memoria.
 */
export function RemindersPage() {
  const { t } = useT();
  const { state, ready } = useAppState();
  const { notify } = useToast();
  const [permission, setPermission] = useState<PermissionState>(() => readPermission());
  const [requesting, setRequesting] = useState(false);
  const icsRef = useRef<HTMLDivElement | null>(null);

  // El permiso se puede cambiar fuera de la app (candado del sitio): al volver
  // el foco a la pestaña se relee, sin pedirlo.
  useEffect(() => {
    const sync = () => setPermission(readPermission());
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  const now = useMemo(() => new Date(), [state]);
  const groups = useMemo(() => groupReminders(buildReminderViews(state, now)), [state, now]);
  const actions = useReminderActions(state);
  const total = groups.pending.length + groups.sent.length + groups.snoozed.length;

  const enable = async () => {
    setRequesting(true);
    try {
      const next = await requestPermission();
      setPermission(next);
      if (next === 'granted') notify(t('reminders.permission.enabled'), 'ok');
    } catch (cause) {
      notify(
        t('reminders.permission.error', { message: cause instanceof Error ? cause.message : String(cause) }),
        'err',
      );
    } finally {
      setRequesting(false);
    }
  };

  const testNotification = () => {
    if (!isNotificationSupported() || permission === 'unsupported') {
      notify(t('reminders.test.unsupported'), 'err');
      return;
    }
    if (permission !== 'granted') {
      notify(t('reminders.test.blocked'), 'err');
      return;
    }
    const shown = showLocalNotification(t('reminders.test.title'), t('reminders.test.body'));
    notify(shown ? t('reminders.test.done') : t('reminders.test.error', { message: t('reminders.permission.denied') }), shown ? 'ok' : 'err');
  };

  const goToIcs = useCallback(() => {
    const target = icsRef.current ?? document.getElementById('ics-export');
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
    }
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h2 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('reminders.title')}
          </h1>
          <p className="mt-1 max-w-prose text-ui text-muted">{t('reminders.lead')}</p>
        </div>
        <p className="tnum rounded-chip border border-line px-2.5 py-1 text-meta text-muted">
          {t('reminders.inbox.hint', { count: total })}
        </p>
      </header>

      <PermissionCard
        permission={permission}
        busy={requesting}
        settings={state.settings}
        windowDays={reminderWindowDays()}
        onEnable={() => void enable()}
        onTest={testNotification}
        onGoToIcs={goToIcs}
      />

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('reminders.inbox.title')}</h2>
          <span className="tnum text-meta text-muted">{t('reminders.inbox.hint', { count: total })}</span>
        </CardHead>
        <CardBody className="flex flex-col gap-4">
          {total === 0 ? (
            <EmptyState title={t('reminders.inbox.empty')} body={t('reminders.inbox.emptyBody')} />
          ) : (
            <>
              <GroupSection
                title={t('reminders.group.pending')}
                emptyLabel={t('reminders.group.empty')}
                views={groups.pending}
                busyId={actions.busyId}
                onDone={(view) => void actions.markDone(view)}
                onSnooze={(view, days) => void actions.snooze(view, days)}
                onDiscard={(view) => void actions.discard(view)}
              />
              <GroupSection
                title={t('reminders.group.snoozed')}
                emptyLabel={t('reminders.group.empty')}
                views={groups.snoozed}
                busyId={actions.busyId}
                onDone={(view) => void actions.markDone(view)}
                onSnooze={(view, days) => void actions.snooze(view, days)}
                onDiscard={(view) => void actions.discard(view)}
              />
              <GroupSection
                title={t('reminders.group.sent')}
                emptyLabel={t('reminders.group.empty')}
                views={groups.sent}
                busyId={actions.busyId}
                onDone={(view) => void actions.markDone(view)}
                onSnooze={(view, days) => void actions.snooze(view, days)}
                onDiscard={(view) => void actions.discard(view)}
              />
            </>
          )}
        </CardBody>
      </Card>

      <div ref={icsRef} tabIndex={-1} className="outline-none">
        <IcsExportCard state={state} />
      </div>

      <p className="text-meta leading-relaxed text-muted">{t('reminders.footer.note')}</p>

      <p role="status" aria-live="polite" className="sr-only">
        {actions.status}
      </p>
    </div>
  );
}
