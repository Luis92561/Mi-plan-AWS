import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, Field, Input } from '@/components/ui/primitives';
import { Switch } from '@/components/ui/toggle';
import { useToast } from '@/components/ui/toast';
import { saveSettings } from '@/data/store';
import type { Settings } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import { isValidTime, messageOf } from '../helpers';
import { StatusLine } from './StatusLine';

const MIN_PER_DAY = 1;
const MAX_PER_DAY = 10;

/**
 * Recordatorios (§7.8, §8.8): activar, hora diaria, máximo por día y horas de
 * silencio. Se guardan en `settings`, que es lo que respeta `buildReminders`.
 */
export function RemindersSection({ settings }: { settings: Settings }) {
  const { t } = useT();
  const { notify } = useToast();
  const [enabled, setEnabled] = useState(settings.remindersEnabled);
  const [dailyTime, setDailyTime] = useState(settings.dailyReminderTime);
  const [maxText, setMaxText] = useState(String(settings.maxRemindersPerDay));
  const [quietFrom, setQuietFrom] = useState(settings.quietHours.from);
  const [quietTo, setQuietTo] = useState(settings.quietHours.to);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const max = Number.parseInt(maxText, 10);
  const maxValid = Number.isInteger(max) && max >= MIN_PER_DAY && max <= MAX_PER_DAY;
  const timesValid = isValidTime(dailyTime) && isValidTime(quietFrom) && isValidTime(quietTo);
  const dirty =
    enabled !== settings.remindersEnabled ||
    dailyTime !== settings.dailyReminderTime ||
    max !== settings.maxRemindersPerDay ||
    quietFrom !== settings.quietHours.from ||
    quietTo !== settings.quietHours.to;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!maxValid || !timesValid) return;
    setSaving(true);
    setStatus('');
    try {
      await saveSettings({
        ...settings,
        remindersEnabled: enabled,
        dailyReminderTime: dailyTime,
        maxRemindersPerDay: max,
        quietHours: { from: quietFrom, to: quietTo },
      });
      const message = t('settings.reminders.saved');
      setStatus(message);
      notify(message, 'ok');
    } catch (cause) {
      const message = t('settings.reminders.error', { message: messageOf(cause) });
      setStatus(message);
      notify(message, 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)} noValidate>
          <p className="text-meta text-muted">{t('settings.reminders.hint')}</p>

          <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-input border border-line px-3 py-2">
            <div className="min-w-0">
              <p className="text-ui text-text">{t('settings.reminders.enabled')}</p>
              <p className="text-meta text-muted">{t('settings.reminders.enabledHint')}</p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              label={t('settings.reminders.enabled')}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={t('settings.reminders.dailyTime')}
              htmlFor="settings-daily-time"
              hint={t('settings.reminders.dailyTimeHint')}
              error={isValidTime(dailyTime) ? undefined : t('settings.reminders.timeError')}
            >
              <Input
                id="settings-daily-time"
                type="time"
                value={dailyTime}
                onChange={(event) => setDailyTime(event.target.value)}
              />
            </Field>

            <Field
              label={t('settings.reminders.maxPerDay')}
              htmlFor="settings-max-day"
              hint={t('settings.reminders.maxPerDayHint')}
              error={maxValid ? undefined : t('settings.reminders.maxError')}
            >
              <Input
                id="settings-max-day"
                type="number"
                inputMode="numeric"
                min={MIN_PER_DAY}
                max={MAX_PER_DAY}
                step={1}
                value={maxText}
                onChange={(event) => setMaxText(event.target.value)}
              />
            </Field>
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="label-mono">{t('settings.reminders.quiet')}</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t('settings.reminders.quietFrom')}
                htmlFor="settings-quiet-from"
                error={isValidTime(quietFrom) ? undefined : t('settings.reminders.timeError')}
              >
                <Input
                  id="settings-quiet-from"
                  type="time"
                  value={quietFrom}
                  onChange={(event) => setQuietFrom(event.target.value)}
                />
              </Field>
              <Field
                label={t('settings.reminders.quietTo')}
                htmlFor="settings-quiet-to"
                error={isValidTime(quietTo) ? undefined : t('settings.reminders.timeError')}
              >
                <Input
                  id="settings-quiet-to"
                  type="time"
                  value={quietTo}
                  onChange={(event) => setQuietTo(event.target.value)}
                />
              </Field>
            </div>
            <p className="text-meta text-muted">{t('settings.reminders.quietHint')}</p>
          </fieldset>

          <p className="text-meta text-muted">
            {t('settings.reminders.icsNote')}{' '}
            <Link to="/recordatorios" className="text-accent">
              {t('settings.reminders.icsLink')}
            </Link>
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {dirty ? <span className="mr-auto text-meta text-warn">{t('settings.profile.dirty')}</span> : null}
            <Button
              type="submit"
              variant="primary"
              className="min-h-[44px] sm:min-h-[40px]"
              disabled={saving || !dirty || !maxValid || !timesValid}
              aria-busy={saving}
            >
              {t('settings.reminders.save')}
            </Button>
          </div>

          <StatusLine text={status} />
        </form>
      </CardBody>
    </Card>
  );
}
