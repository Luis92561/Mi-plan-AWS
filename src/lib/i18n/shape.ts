import type { Flat } from './define';
import type { action, common, dashboard, enums, nav } from './es/shared';
import type { budget } from './features/budget';
import type { cert } from './features/cert';
import type { checklist } from './features/checklist';
import type { exporter } from './features/exporter';
import type { log } from './features/log';
import type { notes } from './features/notes';
import type { practice } from './features/practice';
import type { reminders } from './features/reminders';
import type { resources } from './features/resources';
import type { review } from './features/review';
import type { roadmap } from './features/roadmap';
import type { settings } from './features/settings';
import type { today } from './features/today';
/**
 * Forma completa del diccionario. `en.ts` se tipa contra esto:
 * una clave faltante en inglés rompe `tsc`.
 */
export interface Dict {
  readonly common: Flat<typeof common>;
  readonly nav: Flat<typeof nav>;
  readonly action: Flat<typeof action>;
  readonly enums: Flat<typeof enums>;
  readonly dashboard: Flat<typeof dashboard>;
  readonly today: Flat<(typeof today)['es']>;
  readonly roadmap: Flat<(typeof roadmap)['es']>;
  readonly cert: Flat<(typeof cert)['es']>;
  readonly log: Flat<(typeof log)['es']>;
  readonly practice: Flat<(typeof practice)['es']>;
  readonly resources: Flat<(typeof resources)['es']>;
  readonly budget: Flat<(typeof budget)['es']>;
  readonly review: Flat<(typeof review)['es']>;
  readonly checklist: Flat<(typeof checklist)['es']>;
  readonly notes: Flat<(typeof notes)['es']>;
  readonly reminders: Flat<(typeof reminders)['es']>;
  readonly exporter: Flat<(typeof exporter)['es']>;
  readonly settings: Flat<(typeof settings)['es']>;
}

/**
 * Claves válidas del diccionario. Las claves ya llevan su namespace delante
 * (`dashboard.title`, `nav.inicio`), así que el tipo es la unión de todas.
 */
export type TKey = {
  [NS in keyof Dict]: keyof Dict[NS] & string;
}[keyof Dict];

export type NamespaceOf<K extends string> = K extends `${infer NS}.${string}` ? NS : never;
