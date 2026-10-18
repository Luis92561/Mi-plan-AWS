import { describe, expect, it } from 'vitest';
import {
  heatmap,
  inactiveDays,
  lastSessionDate,
  levelOf,
  minutesOn,
  streakDays,
  weekMinutes,
  weeklyGoalRatio,
  weeklyTotals,
  withHoursDone,
} from '../stats';
import type { PlanItem, Settings, StudySession } from '@/data/types';

function session(date: string, minutes = 45, certId = 'SAA-C03'): StudySession {
  return {
    id: `s-${date}-${minutes}`,
    date,
    certId,
    domainId: null,
    minutes,
    type: 'lab',
    confidence: 4,
    notes: '',
    createdAt: `${date}T20:00:00.000Z`,
  };
}

const settings: Settings = {
  id: 'app',
  displayName: '',
  weeklyHoursGoal: 6,
  studyDays: [1, 2, 3, 4, 5, 6],
  startDate: '2026-01-01',
  activeCertId: 'SAA-C03',
  theme: 'dark',
  locale: 'es',
  passphraseEnabled: false,
  schemaVersion: 1,
  fontMode: 'terminal',
  fontScale: 1,
  remindersEnabled: true,
  dailyReminderTime: '19:00',
  quietHours: { from: '22:00', to: '07:00' },
  maxRemindersPerDay: 3,
  defaultExportProfileId: null,
};

describe('minutesOn / weekMinutes', () => {
  it('suma los minutos del día', () => {
    expect(minutesOn([session('2026-10-18', 30), session('2026-10-18', 15), session('2026-10-17')], '2026-10-18')).toBe(45);
  });

  it('la semana corta lunes y domingo', () => {
    // 2026-10-18 es domingo: la semana es 2026-10-12 (lunes) .. 2026-10-18
    const sessions = [
      session('2026-10-11', 60), // domingo anterior: fuera
      session('2026-10-12', 30),
      session('2026-10-18', 30),
      session('2026-10-19', 60), // lunes siguiente: fuera
    ];
    expect(weekMinutes(sessions, '2026-10-18')).toBe(60);
  });
});

describe('weeklyTotals', () => {
  it('devuelve las últimas 8 semanas con sus minutos', () => {
    const rows = weeklyTotals([session('2026-10-18', 60)], '2026-10-18', 8);
    expect(rows).toHaveLength(8);
    expect(rows[7].minutes).toBe(60);
    expect(rows[0].week).toBe('2026-08-24');
  });
});

describe('streakDays §8.4', () => {
  it('cuenta días consecutivos de estudio', () => {
    const sessions = [session('2026-10-18'), session('2026-10-17'), session('2026-10-16')];
    expect(streakDays(sessions, '2026-10-18', [0, 1, 2, 3, 4, 5, 6])).toBe(3);
  });

  it('se rompe al faltar un día de estudio', () => {
    const sessions = [session('2026-10-18'), session('2026-10-17'), session('2026-10-15')];
    expect(streakDays(sessions, '2026-10-18', [0, 1, 2, 3, 4, 5, 6])).toBe(2);
  });

  it('ignora los días que no son de estudio', () => {
    // 12-oct (lunes) y 18-oct (domingo) con studyDays = [1] ⇒ racha 1, porque el 13..18 no cuentan
    const sessions = [session('2026-10-12'), session('2026-10-05')];
    expect(streakDays(sessions, '2026-10-18', [1])).toBe(2);
  });

  it('si hoy es día de estudio y no hay sesión, la racha se mide desde ayer', () => {
    const sessions = [session('2026-10-17')];
    expect(streakDays(sessions, '2026-10-18', [0, 1, 2, 3, 4, 5, 6])).toBe(1);
  });

  it('sin sesiones la racha es 0', () => {
    expect(streakDays([], '2026-10-18', [1, 2, 3, 4, 5])).toBe(0);
  });
});

describe('heatmap', () => {
  it('devuelve 120 celdas con intensidad', () => {
    const cells = heatmap([session('2026-10-18', 90)], '2026-10-18', 120);
    expect(cells).toHaveLength(120);
    expect(cells[119].date).toBe('2026-10-18');
    expect(cells[119].minutes).toBe(90);
    expect(cells[119].level).toBe(3);
  });

  it('niveles: 0, <30, <60, <120, ≥120', () => {
    expect([0, 20, 45, 90, 200].map(levelOf)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('inactiveDays / lastSessionDate', () => {
  it('cuenta días desde la última sesión', () => {
    expect(inactiveDays([session('2026-10-15')], '2026-10-18')).toBe(3);
  });

  it('sin sesiones devuelve null', () => {
    expect(inactiveDays([], '2026-10-18')).toBeNull();
    expect(lastSessionDate([])).toBeNull();
  });

  it('encuentra la sesión más reciente aunque el array no esté ordenado', () => {
    expect(lastSessionDate([session('2026-10-01'), session('2026-10-18'), session('2026-10-05')])).toBe('2026-10-18');
  });
});

describe('weeklyGoalRatio / withHoursDone', () => {
  it('meta semanal en proporción 0..1', () => {
    expect(weeklyGoalRatio([session('2026-10-18', 180)], settings, '2026-10-18')).toBe(0.5);
    expect(weeklyGoalRatio([session('2026-10-18', 600)], settings, '2026-10-18')).toBe(1);
  });

  it('recalcula hoursDone desde las sesiones', () => {
    const planItems: PlanItem[] = [
      {
        id: 'p1',
        certId: 'SAA-C03',
        order: 3,
        status: 'estudiando',
        targetDate: null,
        hoursPlanned: 40,
        hoursDone: 99,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ];
    const result = withHoursDone(planItems, [session('2026-10-18', 90)]);
    expect(result[0].hoursDone).toBe(1.5);
  });
});
