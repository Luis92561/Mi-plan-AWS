import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/cn';
import type { RoadmapView } from '../helpers';

/** Conmutador vista compacta / detallada (§7.2). La preferencia se recuerda en localStorage. */
export function ViewToggle({ view, onChange }: { view: RoadmapView; onChange: (view: RoadmapView) => void }) {
  const { t } = useT();
  const options: { value: RoadmapView; label: string }[] = [
    { value: 'compacta', label: t('roadmap.view.compact') },
    { value: 'detallada', label: t('roadmap.view.detailed') },
  ];

  return (
    <div
      role="group"
      aria-label={t('roadmap.view.label')}
      className="flex items-center rounded-input border border-control p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={view === option.value}
          className={cn(
            'min-h-[44px] rounded-[4px] px-2.5 text-label uppercase tracking-label transition-colors duration-hover sm:min-h-8',
            view === option.value ? 'bg-accent font-bold text-accent-ink' : 'text-muted hover:text-text',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
