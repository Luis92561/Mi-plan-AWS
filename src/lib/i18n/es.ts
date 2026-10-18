import type { Dict } from './shape';
import * as shared from './es/shared';
import { budget } from './features/budget';
import { cert } from './features/cert';
import { checklist } from './features/checklist';
import { exporter } from './features/exporter';
import { log } from './features/log';
import { notes } from './features/notes';
import { practice } from './features/practice';
import { reminders } from './features/reminders';
import { resources } from './features/resources';
import { review } from './features/review';
import { roadmap } from './features/roadmap';
import { settings } from './features/settings';
import { today } from './features/today';

/** Diccionario español: define la forma (as const) del resto. */
export const es = {
  common: shared.common,
  nav: shared.nav,
  action: shared.action,
  enums: shared.enums,
  dashboard: shared.dashboard,
  today: today.es,
  roadmap: roadmap.es,
  cert: cert.es,
  log: log.es,
  practice: practice.es,
  resources: resources.es,
  budget: budget.es,
  review: review.es,
  checklist: checklist.es,
  notes: notes.es,
  reminders: reminders.es,
  exporter: exporter.es,
  settings: settings.es,
} as const;

export type EsDict = typeof es;

/** Verificación de forma: `es` debe satisfacer `Dict`. */
const _shapeCheck: Dict = es;
void _shapeCheck;
