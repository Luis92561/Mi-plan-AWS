import { Card, Progress } from '@/components/ui/primitives';
import { addDaysToDate, startOfWeekMonday } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import type { DashboardKpis } from '../model';

/** Los 4 indicadores de §7.1: 2 columnas en móvil, 4 en desktop. */
export function KpiGrid({ kpis, today }: { kpis: DashboardKpis; today: string }) {
  const { t, f } = useT();
  const monday = startOfWeekMonday(today);
  const studyDays = kpis.studyDays
    .map((day) => f.weekday(addDaysToDate(monday, day === 0 ? -1 : day - 1)))
    .join(' · ');

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard
        label={t('dashboard.hoursWeek')}
        value={f.hours(kpis.weekMinutes)}
        caption={t('dashboard.hoursGoal', { hours: f.number(kpis.weeklyGoalHours) })}
        ratio={kpis.weekRatio}
      />
      <KpiCard
        label={t('dashboard.streak')}
        value={t('dashboard.streakValue', { n: kpis.streak, count: kpis.streak })}
        caption={studyDays.length > 0 ? t('dashboard.studyDays', { days: studyDays }) : undefined}
        captionTitle={studyDays}
      />
      <KpiCard
        label={t('dashboard.mocksPassed')}
        value={f.number(kpis.mocksPassed)}
        caption={`${t('common.of')} ${f.number(kpis.mocksTotal)}`}
      />
      <KpiCard
        label={t('dashboard.budgetSpent')}
        value={f.currency(kpis.paidUsd)}
        caption={t('dashboard.budgetOf', { amount: f.currency(kpis.plannedUsd) })}
        ratio={kpis.burnRatio}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  caption,
  captionTitle,
  ratio,
}: {
  label: string;
  value: string;
  caption?: string;
  captionTitle?: string;
  ratio?: number;
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-1 p-3">
      <p className="label-mono">{label}</p>
      <p className="tnum text-h3 font-bold leading-none text-text">{value}</p>
      {typeof ratio === 'number' ? <Progress className="mt-1" value={ratio} label={label} /> : null}
      {caption ? (
        <p className="truncate text-meta text-muted" title={captionTitle ?? caption}>
          {caption}
        </p>
      ) : null}
    </Card>
  );
}
