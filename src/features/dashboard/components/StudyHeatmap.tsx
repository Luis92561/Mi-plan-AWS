import { Card, SectionHead } from '@/components/ui/primitives';
import type { HeatmapCell } from '@/domain/stats';
import { weekdayOf } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/useT';

/**
 * 5 niveles (§7.1): celdas de 10 px, del gris de línea al acento.
 * La opacidad va en clases, nunca en un color literal.
 */
const LEVEL_CLASS: Record<HeatmapCell['level'], string> = {
  0: 'bg-line',
  1: 'bg-accent opacity-25',
  2: 'bg-accent opacity-40',
  3: 'bg-accent opacity-60',
  4: 'bg-accent',
};

const CELL = 'h-2.5 w-2.5 rounded-sm';

/** Heatmap de los últimos 120 días, en columnas de semanas (lunes arriba). */
export function StudyHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const { t, f } = useT();
  // Padding inicial para que cada columna empiece en lunes.
  const leading = cells.length > 0 ? (weekdayOf(cells[0].date) + 6) % 7 : 0;

  return (
    <section>
      <SectionHead
        no="03"
        title={t('dashboard.section.heatmap')}
        action={
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="text-meta text-muted">{t('dashboard.heatmapLegendLess')}</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span key={level} className={cn(CELL, LEVEL_CLASS[level])} />
            ))}
            <span className="text-meta text-muted">{t('dashboard.heatmapLegendMore')}</span>
          </span>
        }
      />

      <Card className="p-3">
        <div
          role="img"
          aria-label={t('dashboard.heatmapLabel')}
          className="overflow-x-auto"
        >
          <div className="grid w-max grid-flow-col grid-rows-7 gap-[2px]">
            {Array.from({ length: leading }, (_, index) => (
              <span key={`pad-${index}`} aria-hidden="true" className={CELL} />
            ))}
            {cells.map((cell) => (
              <span
                key={cell.date}
                title={t('dashboard.heatmapCell', { date: f.date(cell.date), n: cell.minutes })}
                className={cn(CELL, LEVEL_CLASS[cell.level])}
              />
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
