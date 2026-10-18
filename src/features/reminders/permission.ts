/* =============================================================================
   Permiso de notificaciones y contador de SEQUENCE del .ics (§7.13, §8.8).
   Nada de red: las notificaciones son locales y el calendario se genera en
   memoria. Si el navegador no puede avisar, la UI lo dice y ofrece el .ics.
   ========================================================================== */

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/** `true` si el navegador expone la Notification API. */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.Notification === 'function';
}

/** Estado actual del permiso, sin pedirlo (leer nunca abre el diálogo). */
export function readPermission(): PermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  const permission = window.Notification.permission;
  if (permission === 'granted' || permission === 'denied') return permission;
  return 'default';
}

/**
 * Pide permiso. Solo se llama desde un clic: pedirlo al cargar la página es
 * ruido y los navegadores lo bloquean.
 */
export async function requestPermission(): Promise<PermissionState> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const result = await window.Notification.requestPermission();
    if (result === 'granted' || result === 'denied') return result;
    return 'default';
  } catch {
    // Un navegador con la API a medias no debe romper la pantalla.
    return readPermission();
  }
}

/**
 * Muestra una notificación local. Devuelve `false` si el permiso no está
 * concedido o si el constructor falla (Safari antiguo, permisos revocados).
 */
export function showLocalNotification(title: string, body: string): boolean {
  if (!isNotificationSupported() || window.Notification.permission !== 'granted') return false;
  try {
    new window.Notification(title, { body, tag: 'miplan-aws-prueba' });
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------- .ics --- */

/** Preferencia de UI (no dato de negocio): cuántas veces se reexportó el .ics. */
const ICS_SEQUENCE_KEY = 'miplan-aws.ics-sequence';

export function readIcsSequence(): number {
  try {
    const raw = window.localStorage.getItem(ICS_SEQUENCE_KEY);
    if (raw === null) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    // Modo privado o almacenamiento bloqueado: se empieza de cero.
    return 0;
  }
}

export function writeIcsSequence(value: number): void {
  try {
    window.localStorage.setItem(ICS_SEQUENCE_KEY, String(Math.max(0, Math.trunc(value))));
  } catch {
    // Si no se puede persistir, el SEQUENCE vuelve a 1 en la próxima sesión.
  }
}
