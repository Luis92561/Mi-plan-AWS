import { SectionHead, Skeleton } from '@/components/ui/primitives';
import { useAppState } from '@/data/store';
import { useT } from '@/lib/i18n/useT';
import { AppearanceSection } from './components/AppearanceSection';
import { BackupSection } from './components/BackupSection';
import { DangerSection } from './components/DangerSection';
import { ProfileSection } from './components/ProfileSection';
import { RemindersSection } from './components/RemindersSection';

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-[220px] w-full" />
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-[180px] w-full" />
    </div>
  );
}

/**
 * Ajustes (§7.8, §7.14): perfil con meta semanal y días de estudio, idioma, tema
 * y tipografía, recordatorios, respaldo (JSON, Markdown, demo, cifrado con frase
 * de paso) y borrado total con doble confirmación. Todo local: sin red.
 */
export function SettingsPage() {
  const { t } = useT();
  const { state, ready } = useAppState();

  if (!ready) return <SettingsSkeleton />;

  const settings = state.settings;
  // Las secciones con formulario se remontan cuando el dato guardado cambia
  // (por ejemplo tras importar un respaldo), para no mostrar valores viejos.
  const profileKey = [
    settings.displayName,
    settings.weeklyHoursGoal,
    settings.studyDays.join('.'),
    settings.startDate,
  ].join('|');
  const remindersKey = [
    settings.remindersEnabled ? '1' : '0',
    settings.dailyReminderTime,
    settings.maxRemindersPerDay,
    settings.quietHours.from,
    settings.quietHours.to,
  ].join('|');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold">
          <span aria-hidden="true" className="mr-1.5 text-accent">
            ❯
          </span>
          {t('settings.title')}
        </h1>
        <p className="max-w-prose text-ui text-muted">{t('settings.subtitle')}</p>
        <p className="label-mono tnum">
          {t('settings.profile.schemaVersion', { n: settings.schemaVersion })}
        </p>
      </header>

      <section aria-label={t('settings.section.profile')}>
        <SectionHead
          no="01"
          title={t('settings.section.profile')}
          hint={t('settings.section.profileHint')}
        />
        <ProfileSection key={profileKey} settings={settings} />
      </section>

      <section aria-label={t('settings.section.appearance')}>
        <SectionHead
          no="02"
          title={t('settings.section.appearance')}
          hint={t('settings.section.appearanceHint')}
        />
        <AppearanceSection />
      </section>

      <section aria-label={t('settings.section.reminders')}>
        <SectionHead
          no="03"
          title={t('settings.section.reminders')}
          hint={t('settings.section.remindersHint')}
        />
        <RemindersSection key={remindersKey} settings={settings} />
      </section>

      <section aria-label={t('settings.section.backup')}>
        <SectionHead
          no="04"
          title={t('settings.section.backup')}
          hint={t('settings.section.backupHint')}
        />
        <BackupSection state={state} />
      </section>

      <section aria-label={t('settings.section.danger')}>
        <SectionHead
          no="05"
          title={t('settings.section.danger')}
          hint={t('settings.section.dangerHint')}
        />
        <DangerSection />
      </section>
    </div>
  );
}
