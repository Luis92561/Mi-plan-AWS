import { useEffect, useState } from 'react';
import { getDb } from '@/data/db';
import { defaultSettings, ensureCatalog, DEFAULT_EXPORT_PROFILES } from '@/data/seed';
import { localDate } from '@/lib/dates';

/**
 * Arranque: siembra el catálogo de 13 certificaciones la primera vez.
 * Nunca crea la ruta del usuario: eso es una acción explícita ("Cargar ruta recomendada").
 */
export function useBoot(): { booted: boolean; error: string | null } {
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = getDb();
        await ensureCatalog(db);
        const settings = await db.settings.get('app');
        if (!settings) {
          await db.settings.put({ ...defaultSettings(new Date()), id: 'app' });
        }
        const profiles = await db.exportProfiles.count();
        if (profiles === 0) {
          await db.exportProfiles.bulkPut(DEFAULT_EXPORT_PROFILES);
        }
        if (!cancelled) setBooted(true);
      } catch (cause) {
        if (!cancelled) {
          setError((cause as Error).message);
          setBooted(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { booted, error };
}

/** Fecha de hoy en la zona del producto, reutilizable por las pantallas. */
export function useToday(): string {
  return localDate(new Date());
}
