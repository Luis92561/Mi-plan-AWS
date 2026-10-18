import { SectionHead, Skeleton } from '@/components/ui/primitives';
import { useAppState } from '@/data/store';
import { useT } from '@/lib/i18n/useT';
import { CopySection } from './components/CopySection';
import { ProfilesSection } from './components/ProfilesSection';
import { VaultSection } from './components/VaultSection';

function ExportSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[180px] w-full" />
      <Skeleton className="h-[160px] w-full" />
      <Skeleton className="h-[260px] w-full" />
    </div>
  );
}

/**
 * Exportar (§7.12): copiar Markdown al portapapeles, gestionar perfiles de
 * exportación y descargar el vault completo en `.zip`. Todo se genera en memoria,
 * sin red y sin librerías nuevas (portapapeles, `jszip`).
 */
export function ExportPage() {
  const { t } = useT();
  const { state, ready } = useAppState();

  if (!ready) return <ExportSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold">
          <span aria-hidden="true" className="mr-1.5 text-accent">
            ❯
          </span>
          {t('exporter.title')}
        </h1>
        <p className="max-w-prose text-ui text-muted">{t('exporter.subtitle')}</p>
      </header>

      <section aria-label={t('exporter.section.copy')}>
        <SectionHead
          no="01"
          title={t('exporter.section.copy')}
          hint={t('exporter.section.copyHint')}
        />
        <CopySection state={state} />
      </section>

      <section aria-label={t('exporter.section.profiles')}>
        <SectionHead
          no="02"
          title={t('exporter.section.profiles')}
          hint={t('exporter.section.profilesHint')}
        />
        <ProfilesSection state={state} />
      </section>

      <section aria-label={t('exporter.section.vault')}>
        <SectionHead
          no="03"
          title={t('exporter.section.vault')}
          hint={t('exporter.section.vaultHint')}
        />
        <VaultSection state={state} />
      </section>
    </div>
  );
}
