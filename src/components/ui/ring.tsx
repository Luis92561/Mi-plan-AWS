import { cn } from '@/lib/cn';

export interface ReadinessRingProps {
  /** 0..100 */
  value: number;
  label?: string;
  caption?: string;
  size?: number;
  className?: string;
  /** Sin evidencia de simulacros: se muestra atenuado y marcado como estimación. */
  preliminary?: boolean;
  tone?: 'accent' | 'ok' | 'warn';
}

/** Anillo de readiness: 8 px de trazo, sin degradados (§9.5). */
export function ReadinessRing({
  value,
  label,
  caption,
  size = 96,
  className,
  preliminary = false,
  tone = 'accent',
}: ReadinessRingProps) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;
  const tones = { accent: 'text-accent', ok: 'text-ok', warn: 'text-warn' } as const;

  return (
    <figure className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`${label ?? 'Readiness'}: ${clamped}%`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--line)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className={cn(tones[tone], preliminary && 'opacity-60')}
            stroke="currentColor"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className={cn('tnum text-h2 font-bold', preliminary ? 'text-muted' : 'text-text')}>{clamped}</span>
          <span aria-hidden="true" className="text-label text-muted">
            %
          </span>
        </div>
      </div>
      {caption ? (
        <figcaption className="text-center text-meta text-muted">
          {caption}
          {preliminary ? <span className="ml-1 text-warn">▲</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
