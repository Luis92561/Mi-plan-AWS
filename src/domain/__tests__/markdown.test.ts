import { describe, expect, it } from 'vitest';
import {
  renderBudgetReport,
  renderFullReport,
  renderWeeklySummary,
} from '@/domain/markdown';
import { createVaultState, VAULT_NOW } from './vaultFixtures';

describe('renderWeeklySummary', () => {
  it('incluye horas, sesiones y próximos hitos', () => {
    const summary = renderWeeklySummary(createVaultState(), 'es', VAULT_NOW);
    expect(summary).toContain('# Resumen semanal');
    expect(summary).toContain('2026-10-12 → 2026-10-18');
    expect(summary).toContain('3 h 30 min');
    expect(summary).toContain('3,5 h');
    expect(summary).toContain('210 min');
    expect(summary).toContain('**Sesiones:** 4');
    expect(summary).toContain('## Próximos hitos');
    expect(summary).toContain('2026-10-21');
    expect(summary).toContain('S3 — Clases de almacenamiento');
    expect(summary).toContain('Examen SAA-C03');
    expect(summary).toContain('2026-12-05');
    expect(summary).toContain('## Temas dominados');
    expect(summary).not.toContain('\r');
    expect(summary.startsWith('\uFEFF')).toBe(false);
    expect(summary.endsWith('\n')).toBe(true);
    expect(summary).toMatchSnapshot();
  });

  it('cambia los encabezados con el idioma manteniendo los datos', () => {
    const summary = renderWeeklySummary(createVaultState(), 'en', VAULT_NOW);
    expect(summary).toContain('# Weekly summary');
    expect(summary).toContain('**Hours:** 3h 30m');
    expect(summary).toContain('3.5h');
    expect(summary).toContain('## Upcoming milestones');
    expect(summary).toContain('Exam SAA-C03');
    expect(summary).toContain('S3 — Clases de almacenamiento');
  });

  it('es idempotente con el mismo now', () => {
    const state = createVaultState();
    expect(renderWeeklySummary(state, 'es', VAULT_NOW)).toBe(
      renderWeeklySummary(state, 'es', VAULT_NOW),
    );
  });
});

describe('renderFullReport', () => {
  it('incluye resumen, ruta, certificaciones, presupuesto e hitos', () => {
    const report = renderFullReport(createVaultState(), 'es', VAULT_NOW);
    expect(report).toContain('# Mi Plan AWS — Reporte completo');
    expect(report).toContain('## Resumen');
    expect(report).toContain('## Ruta');
    expect(report).toContain('## SAA-C03 — Solutions Architect Associate');
    expect(report).toContain('### Datos del examen');
    expect(report).toContain('### Dominios');
    expect(report).toContain('### Checklist');
    expect(report).toContain('### Temas');
    expect(report).toContain('### Simulacros');
    expect(report).toContain('### Sesiones');
    expect(report).toContain('### Notas');
    expect(report).toContain('## Presupuesto');
    expect(report).toContain('## Próximos hitos');
    expect(report).toContain('CLF-C02');
  });

  it('no contiene HTML crudo, wikilinks, CRLF ni BOM', () => {
    const report = renderFullReport(createVaultState(), 'es', VAULT_NOW);
    expect(report).not.toMatch(/<[A-Za-z][^>]*>/);
    expect(report).not.toContain('[[');
    expect(report).not.toContain('\r');
    expect(report.startsWith('\uFEFF')).toBe(false);
    expect(report).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('traduce encabezados y conserva códigos y nombres oficiales', () => {
    const report = renderFullReport(createVaultState(), 'en', VAULT_NOW);
    expect(report).toContain('## Summary');
    expect(report).toContain('## Route');
    expect(report).toContain('### Exam facts');
    expect(report).toContain('## Budget');
    expect(report).toContain('## Upcoming milestones');
    expect(report).toContain('Design Secure Architectures');
    expect(report).toContain('SAA-C03');
  });
});

describe('renderBudgetReport', () => {
  it('resume totales, ruta con vouchers, partidas y gasto mensual', () => {
    const report = renderBudgetReport(createVaultState(), 'es', VAULT_NOW);
    expect(report).toContain('# Presupuesto');
    expect(report).toContain('## Totales');
    expect(report).toContain('279 US$');
    expect(report).toContain('100 US$');
    expect(report).toContain('179 US$');
    expect(report).toContain('## Ruta restante');
    expect(report).toContain('150 US$');
    expect(report).toContain('75 US$');
    expect(report).toContain('50 % por aprobar CLF-C02');
    expect(report).toContain('## Partidas');
    expect(report).toContain('Suscripción Skill Builder');
    expect(report).toContain('## Vouchers');
    expect(report).toContain('## Gasto por mes');
    expect(report).toContain('2026-02');
  });

  it('mantiene el formato sin CRLF y traduce encabezados', () => {
    const es = renderBudgetReport(createVaultState(), 'es', VAULT_NOW);
    const en = renderBudgetReport(createVaultState(), 'en', VAULT_NOW);
    expect(es).not.toContain('\r');
    expect(en).toContain('# Budget');
    expect(en).toContain('## Totals');
    expect(en).toContain('## Remaining route');
    expect(en).toContain('## Items');
    expect(en).toContain('## Vouchers');
    expect(en).toContain('## Monthly spend');
  });

  it('es determinista con el mismo now', () => {
    const state = createVaultState();
    expect(renderBudgetReport(state, 'es', VAULT_NOW)).toBe(
      renderBudgetReport(state, 'es', VAULT_NOW),
    );
  });
});
