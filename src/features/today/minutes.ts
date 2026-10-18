import type { AppState, Settings, Topic } from '@/data/types';

/**
 * §7.9 — minutos estimados de un tema, en este orden:
 *  1. `settings.defaultSessionMinutes` (ajuste opcional; si no existe, se ignora),
 *  2. los minutos estimados del recurso que originó el tema (`resource.estimatedMin`),
 *  3. 30 por defecto.
 * Función pura: no toca Dexie ni el reloj.
 */
export const DEFAULT_TOPIC_MINUTES = 30;

/**
 * `Settings` (propiedad de `@/data/types`, que no puedo editar) todavía no declara
 * los minutos por defecto de una sesión; se leen de forma opcional para no
 * inventar un campo obligatorio ni romper el modelo.
 */
type SettingsWithMinutes = Settings & { defaultSessionMinutes?: number };

function positiveOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

export function topicMinutes(topic: Topic, state: AppState): number {
  const configured = positiveOrNull((state.settings as SettingsWithMinutes).defaultSessionMinutes);
  if (configured !== null) return configured;

  if (topic.sourceResourceId !== null) {
    const resource = state.resources.find((item) => item.id === topic.sourceResourceId);
    const estimated = positiveOrNull(resource?.estimatedMin);
    if (estimated !== null) return estimated;
  }

  return DEFAULT_TOPIC_MINUTES;
}
