/** Traducción de los pasos derivados en `model.ts` (texto visible + tipo). */
import type { TKey } from '@/lib/i18n/shape';
import type { I18nApi } from '@/lib/i18n/useT';
import type { DashboardStep, StepKind } from './model';

/** Texto accionable del paso, con los datos del usuario interpolados. */
export function stepText(step: DashboardStep, t: I18nApi['t']): string {
  switch (step.kind) {
    case 'topic':
      return t('dashboard.step.topic', { title: step.label ?? step.certCode });
    case 'checklist':
      return t('dashboard.step.checklist', { title: step.label ?? step.certCode });
    case 'exam':
      return t('dashboard.step.exam', {
        code: step.certCode,
        n: step.daysLeft ?? 0,
        count: step.daysLeft ?? 0,
      });
    case 'mock':
      return step.label
        ? t('dashboard.step.mockNamed', { title: step.label })
        : t('dashboard.step.readiness', { code: step.certCode });
  }
}

/** Etiqueta del tipo de paso (chip). */
export function stepKindKey(kind: StepKind): TKey {
  switch (kind) {
    case 'topic':
      return 'common.topic';
    case 'checklist':
      return 'nav.checklist';
    case 'exam':
      return 'enum.reminder.examen';
    case 'mock':
      return 'enum.attempt.mock';
  }
}
