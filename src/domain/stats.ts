import type { PlanItem, Settings, StudySession } from '@/data/types';
import { addDaysToDate, daysBetween, localDate, startOfWeekMonday, weekdayOf } from '@/lib/dates';

export function minutesOn(sessions: StudySession[], date: string): number {
  return sessions.filter((s) => s.date === date).reduce((sum, s) => sum + s.minutes, 0);
}

/** Minutos de la semana en curso (corte lunes–domingo). */
export function weekMinutes(sessions: StudySession[], today: string): number {
  const monday = startOfWeekMonday(today);
  const sunday = addDaysToDate(monday, 6);
  return sessions
    .filter((s) => s.date >= monday && s.date <= sunday)
    .reduce((sum, s) => sum + s.minutes, 0);
}

/** Semanas consecutivas de historial para la gráfica de horas (§3). */
export function weeklyTotals(sessions: StudySession[], today: string, weeks = 8): { week: string; minutes: number }[] {
  const currentMonday = startOfWeekMonday(today);
  const out: { week: string; minutes: number }[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const monday = addDaysToDate(currentMonday, -7 * i);
    const sunday = addDaysToDate(monday, 6);
    const minutes = sessions
      .filter((s) => s.date >= monday && s.date <= sunday)
      .reduce((sum, s) => sum + s.minutes, 0);
    out.push({ week: monday, minutes });
  }
  return out;
}

/**
 * Racha §8.4 — días consecutivos (según `studyDays`) con ≥1 sesión registrada.
 * Si hoy es día de estudio y aún no hay sesión, la racha se cuenta desde ayer
 * (no se rompe hasta que el día termina).
 */
export function streakDays(sessions: StudySession[], today: string, studyDays: number[]): number {
  const days = new Set(sessions.map((s) => s.date));
  const isStudyDay = (date: string) => studyDays.includes(weekdayOf(date));
  let streak = 0;
  let cursor = today;
  if (isStudyDay(today) && !days.has(today)) {
    cursor = addDaysToDate(today, -1);
  }
  for (let guard = 0; guard < 3650; guard += 1) {
    if (isStudyDay(cursor)) {
      if (days.has(cursor)) streak += 1;
      else break;
    }
    cursor = addDaysToDate(cursor, -1);
  }
  return streak;
}

export interface HeatmapCell {
  date: string;
  minutes: number;
  /** 0 = nada, 1..4 = intensidad */
  level: 0 | 1 | 2 | 3 | 4;
}

/** Heatmap tipo GitHub de los últimos `days` días (§7.1, M4). */
export function heatmap(sessions: StudySession[], today: string, days = 120): HeatmapCell[] {
  const byDate = new Map<string, number>();
  for (const session of sessions) {
    byDate.set(session.date, (byDate.get(session.date) ?? 0) + session.minutes);
  }
  const cells: HeatmapCell[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDaysToDate(today, -i);
    const minutes = byDate.get(date) ?? 0;
    cells.push({ date, minutes, level: levelOf(minutes) });
  }
  return cells;
}

export function levelOf(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

export function lastSessionDate(sessions: StudySession[]): string | null {
  if (sessions.length === 0) return null;
  return sessions.reduce((latest, s) => (s.date > latest ? s.date : latest), sessions[0].date);
}

/** Días sin registrar sesiones (null si nunca hubo sesiones). */
export function inactiveDays(sessions: StudySession[], today: string): number | null {
  const last = lastSessionDate(sessions);
  if (!last) return null;
  return daysBetween(last, today);
}

/** Horas registradas de una certificación. */
export function hoursForCert(sessions: StudySession[], certId: string): number {
  return sessions.filter((s) => s.certId === certId).reduce((sum, s) => sum + s.minutes, 0) / 60;
}

/** Recalcula `hoursDone` de los planItems a partir de las sesiones reales. */
export function withHoursDone(planItems: PlanItem[], sessions: StudySession[]): PlanItem[] {
  return planItems.map((item) => ({ ...item, hoursDone: round1(hoursForCert(sessions, item.certId)) }));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** % de la meta semanal (0..1). */
export function weeklyGoalRatio(sessions: StudySession[], settings: Settings, today: string): number {
  const goal = settings.weeklyHoursGoal * 60;
  if (goal <= 0) return 0;
  return Math.min(1, weekMinutes(sessions, today) / goal);
}

export function todayIso(now: Date = new Date()): string {
  return localDate(now);
}
