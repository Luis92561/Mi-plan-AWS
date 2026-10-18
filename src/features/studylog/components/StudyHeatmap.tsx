import { useMemo } from 'react';
import type { StudySession } from '@/data/types';
import { heatmap, type HeatmapCell } from '@/domain/stats';
import { weekdayOf } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/cn';

/** Intensidad del acento por nivel (el color sale siempre de los tokens). */
const LEVEL_OPACITY: Record<HeatmapCell['level'], number> = { 0: 1, 1: 0.28, 2: 0.5, 3: 0.74, 4: 1 };

const LEVELS: HeatmapCell['level'][] = [0, 1, 2, 3, 4];

export interface StudyHeatmapProps {
  sessions: StudySession[];
  today: string;
  days?: number;
  className?: string;
}

/**
 * Heatmap tipo GitHub (§7.4, M4): últimos 120 días en columnas de 7 días.
 * Sin dependencias externas y reutilizable desde cualquier feature.
 */
export function StudyHeatmap({ sessions, today, days = 120, className }: StudyHeatmapProps) {
  const { t, f } = useT();
  const cells = useMemo(() => heatmap(sessions, today, days), [sessions, today, days]);
  const activeDays = cells.filter((cell) => cell.minutes > 0).length;
  const totalMinutes = cells.reduce((sum, cell) => sum + cell.minutes, 0);
  const offset = cells.length > 0 ? weekdayOf(cells[0].date) : 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="label-mono">{t('log.heatmap.title')}</span>
        <span className="text-meta text-muted">
          {activeDays === 0
            ? t('log.heatmap.none')
            : t('log.heatmap.summary', { minutes: f.hours(totalMinutes), days: activeDays })}
        </span>
      </div>

      <div
        role="group"
        aria-label={t('log.heatmap.label', { days })}
        className="max-w-full overflow-x-auto pb-1"
      >
        <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
          {Array.from({ length: offset }, (_, index) => (
            <span
              key={`pad-${index}`}
              aria-hidden="true"
              className="h-[10px] w-[10px] rounded-[2px] md:h-3 md:w-3"
            />
          ))}
          {cells.map((cell) => {
            const label = t('log.heatmap.cell', { date: cell.date, minutes: cell.minutes });
            return (
              <span
                key={cell.date}
                role={cell.level === 0 ? undefined : 'img'}
                aria-hidden={cell.level === 0 ? true : undefined}
                aria-label={cell.level === 0 ? undefined : label}
                title={label}
                className={cn(
                  'h-[10px] w-[10px] rounded-[2px] border md:h-3 md:w-3',
                  cell.level === 0 ? 'border-line bg-panel-2' : 'border-transparent bg-accent',
                )}
                style={{ opacity: LEVEL_OPACITY[cell.level] }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-meta text-muted">
        <span>{t('log.heatmap.less')}</span>
        {LEVELS.map((level) => (
          <span
            key={level}
            aria-hidden="true"
            className={cn(
              'h-[10px] w-[10px] rounded-[2px] border md:h-3 md:w-3',
              level === 0 ? 'border-line bg-panel-2' : 'border-transparent bg-accent',
            )}
            style={{ opacity: LEVEL_OPACITY[level] }}
          />
        ))}
        <span>{t('log.heatmap.more')}</span>
      </div>
    </div>
  );
}
