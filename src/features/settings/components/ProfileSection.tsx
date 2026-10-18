import { useState, type FormEvent } from 'react';
import { Button, Card, CardBody, Field, Input } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { saveSettings } from '@/data/store';
import type { Settings } from '@/data/types';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/useT';
import { isValidDay, messageOf } from '../helpers';
import { StatusLine } from './StatusLine';

/** Lunes primero; el tipo `Settings.studyDays` usa 0 = domingo … 6 = sábado. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MAX_HOURS = 80;

function parseHours(text: string): number {
  return Number.parseFloat(text.replace(',', '.'));
}

/**
 * Perfil (§7.8): nombre, meta semanal de horas, días de estudio y fecha de
 * inicio. Guarda con `saveSettings`; los campos no se aplican solos para que el
 * usuario vea qué cambió.
 */
export function ProfileSection({ settings }: { settings: Settings }) {
  const { t } = useT();
  const { notify } = useToast();
  const [name, setName] = useState(settings.displayName);
  const [hoursText, setHoursText] = useState(String(settings.weeklyHoursGoal));
  const [studyDays, setStudyDays] = useState<number[]>(settings.studyDays);
  const [startDate, setStartDate] = useState(settings.startDate);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const hours = parseHours(hoursText);
  const hoursValid = Number.isFinite(hours) && hours >= 0 && hours <= MAX_HOURS;
  const dateValid = isValidDay(startDate);
  const trimmedName = name.trim().length > 0 ? name.trim() : settings.displayName;
  const sameDays =
    studyDays.length === settings.studyDays.length &&
    studyDays.every((day) => settings.studyDays.includes(day));
  const dirty =
    trimmedName !== settings.displayName ||
    hours !== settings.weeklyHoursGoal ||
    startDate !== settings.startDate ||
    !sameDays;

  const toggleDay = (day: number) => {
    setStudyDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hoursValid || !dateValid) return;
    setSaving(true);
    setStatus('');
    try {
      await saveSettings({
        ...settings,
        displayName: trimmedName,
        weeklyHoursGoal: hours,
        studyDays,
        startDate,
      });
      const message = t('settings.profile.saved');
      setStatus(message);
      notify(message, 'ok');
    } catch (cause) {
      const message = t('settings.profile.error', { message: messageOf(cause) });
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
          <p className="text-meta text-muted">{t('settings.profile.hint')}</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('settings.profile.name')} htmlFor="settings-name">
              <Input
                id="settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('settings.profile.namePlaceholder')}
                maxLength={60}
                autoComplete="off"
              />
            </Field>

            <Field
              label={t('settings.profile.weeklyGoal')}
              htmlFor="settings-goal"
              hint={`${t('settings.profile.weeklyGoalUnit')} · ${t('settings.profile.weeklyGoalHint')}`}
              error={hoursValid ? undefined : t('settings.profile.hoursError')}
            >
              <Input
                id="settings-goal"
                type="number"
                inputMode="decimal"
                min={0}
                max={MAX_HOURS}
                step={0.5}
                value={hoursText}
                onChange={(event) => setHoursText(event.target.value)}
              />
            </Field>

            <Field
              label={t('settings.profile.startDate')}
              htmlFor="settings-start"
              hint={t('settings.profile.startDateHint')}
              error={dateValid ? undefined : t('settings.profile.dateError')}
            >
              <Input
                id="settings-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>

          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="label-mono">{t('settings.profile.studyDays')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {DAY_ORDER.map((day) => {
                const active = studyDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    aria-label={t(`settings.weekdayFull.${day}`)}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'min-h-[44px] min-w-[52px] rounded-chip border px-3 text-ui transition-colors duration-hover',
                      active
                        ? 'border-accent text-accent'
                        : 'border-control text-muted hover:bg-hover hover:text-text',
                    )}
                  >
                    {t(`settings.weekday.${day}`)}
                  </button>
                );
              })}
            </div>
            <p className="text-meta text-muted">{t('settings.profile.studyDaysHint')}</p>
          </fieldset>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {dirty ? <span className="mr-auto text-meta text-warn">{t('settings.profile.dirty')}</span> : null}
            <Button
              type="submit"
              variant="primary"
              className="min-h-[44px] sm:min-h-[40px]"
              disabled={saving || !dirty || !hoursValid || !dateValid}
              aria-busy={saving}
            >
              {t('settings.profile.save')}
            </Button>
          </div>

          <StatusLine text={status} />
        </form>
      </CardBody>
    </Card>
  );
}
