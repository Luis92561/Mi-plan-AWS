import type { Dict } from './shape';
import * as shared from './en/shared';
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

/**
 * Diccionario inglés. El tipo `Dict` obliga a tener exactamente las claves de `es`:
 * si se olvida una, `tsc` falla antes del build.
 */
export const en: Dict = {
  common: shared.common,
  nav: shared.nav,
  action: shared.action,
  enums: shared.enums,
  dashboard: shared.dashboard,
  today: today.en,
  roadmap: roadmap.en,
  cert: cert.en,
  log: log.en,
  practice: practice.en,
  resources: resources.en,
  budget: budget.en,
  review: review.en,
  checklist: checklist.en,
  notes: notes.en,
  reminders: reminders.en,
  exporter: exporter.en,
  settings: settings.en,
};
