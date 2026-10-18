import { Skeleton } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';

/** Esqueleto mientras `ready === false` (§7.1, §9.5). */
export function DashboardSkeleton() {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
