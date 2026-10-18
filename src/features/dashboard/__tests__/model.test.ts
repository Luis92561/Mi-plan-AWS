import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { MiPlanDb } from '@/data/db';
import { defaultSettings, loadDemoData } from '@/data/seed';
import { EMPTY_STATE } from '@/data/store';
import type { AppState } from '@/data/types';
import { localDate } from '@/lib/dates';
import { translate } from '@/lib/i18n/translate';
import { buildDashboardModel } from '../model';
import { stepText } from '../stepText';

/** `t` real, para comprobar que cada paso sale traducido (§1.2 del contrato). */
const t = (key: string, vars?: Record<string, string | number | null | undefined>) =>
  translate('es', key, vars);

async function demoState(now: Date, dbName: string): Promise<AppState> {
  const db = new MiPlanDb(dbName);
  await loadDemoData(db, now);
  const tables = await Promise.all([
    db.certifications.toArray(),
    db.planItems.toArray(),
    db.resources.toArray(),
    db.studySessions.toArray(),
    db.attempts.toArray(),
    db.flashcards.toArray(),
    db.vouchers.toArray(),
    db.budgetItems.toArray(),
    db.topics.toArray(),
    db.checklistItems.toArray(),
    db.notes.toArray(),
    db.reminders.toArray(),
    db.exportProfiles.toArray(),
    db.settings.get('app'),
  ]);
  await db.close();
  const [
    certifications,
    planItems,
    resources,
    studySessions,
    attempts,
    flashcards,
    vouchers,
    budgetItems,
    topics,
    checklistItems,
    notes,
    reminders,
    exportProfiles,
    settings,
  ] = tables;
  return {
    certifications,
    planItems,
    resources,
    studySessions,
    attempts,
    flashcards,
    vouchers,
    budgetItems,
    topics,
    checklistItems,
    notes,
    reminders,
    exportProfiles,
    questions: [],
    settings: settings ?? defaultSettings(now),
  };
}

const NOW = new Date('2026-10-18T18:32:00Z');

describe('buildDashboardModel (§7.1)', () => {
  it('sin plan devuelve el estado vacío pero un heatmap completo', () => {
    const model = buildDashboardModel(EMPTY_STATE, NOW);
    expect(model.hasPlan).toBe(false);
    expect(model.activeCert).toBeNull();
    expect(model.readiness).toBeNull();
    expect(model.nextStep).toBeNull();
    expect(model.steps).toHaveLength(0);
    expect(model.heat).toHaveLength(120);
  });

  it('con datos de ejemplo deriva hero, KPIs, heatmap y pasos', async () => {
    const state = await demoState(NOW, 'dashboard-probe-demo');
    const model = buildDashboardModel(state, NOW);

    expect(model.hasPlan).toBe(true);
    expect(model.activeCert).not.toBeNull();
    expect(model.readiness).not.toBeNull();
    expect(model.readiness?.score).toBeGreaterThanOrEqual(0);
    expect(model.readiness?.score).toBeLessThanOrEqual(100);
    expect(model.heat).toHaveLength(120);
    expect(model.heat[model.heat.length - 1].date).toBe(localDate(NOW));
    expect(model.alerts.length).toBeLessThanOrEqual(3);
    expect(model.steps.length).toBeLessThanOrEqual(3);
    expect(model.steps.length).toBeGreaterThan(0);
    expect(model.kpis.mocksPassed).toBe(
      state.attempts.filter((attempt) => attempt.passed === true).length,
    );
    expect(model.kpis.plannedUsd).toBeGreaterThanOrEqual(model.kpis.paidUsd);
    expect(model.kpis.weekMinutes).toBeGreaterThanOrEqual(0);
    expect(model.kpis.studyDays).toEqual([...state.settings.studyDays].sort((a, b) => a - b));

    // Cada fila clicable apunta a una ruta interna y su texto está traducido.
    for (const step of model.steps) {
      expect(step.href.startsWith('/')).toBe(true);
      expect(stepText(step, t).startsWith('dashboard')).toBe(false);
    }
    if (model.nextStep) {
      expect(stepText(model.nextStep, t).startsWith('dashboard')).toBe(false);
    }
  });

  it('la certificación activa manda sobre la siguiente recomendada', async () => {
    const state = await demoState(NOW, 'dashboard-probe-active');
    const model = buildDashboardModel(state, NOW);
    const active = model.activeCert;
    expect(active).not.toBeNull();
    const item = state.planItems.find((row) => row.certId === active?.id);
    expect(item).toBeDefined();
    expect(model.readiness?.score).toBeGreaterThanOrEqual(0);
  });
});
