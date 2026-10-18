import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ botones */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink border border-transparent hover:brightness-95 active:brightness-90 font-medium',
  secondary: 'bg-panel-2 text-text border border-control hover:bg-hover active:bg-active',
  ghost: 'bg-transparent text-text border border-transparent hover:bg-hover active:bg-active',
  danger: 'bg-transparent text-err border border-transparent hover:bg-hover active:bg-active',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-ui gap-1.5',
  md: 'h-10 px-3.5 text-ui gap-2',
  lg: 'h-12 px-5 text-body gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Glifo decorativo terminal `❯` antes del texto. */
  glyph?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', glyph = false, type = 'button', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-input whitespace-nowrap',
        'transition-[background-color,filter,border-color] duration-hover disabled:pointer-events-none disabled:opacity-45',
        'min-h-[32px]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {glyph ? (
        <span aria-hidden="true" className="opacity-80">
          ❯
        </span>
      ) : null}
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ tarjetas */
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div className={cn('rounded-card border border-line bg-panel', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHead({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-line px-4 py-3', className)}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-4 py-3.5', className)}>{children}</div>;
}

/* ------------------------------------------------------------------- inputs */
export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="label-mono">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <span className="text-meta text-muted">{hint}</span>
      ) : null}
      {error ? (
        <span role="alert" className="text-meta text-err">
          ▲ {error}
        </span>
      ) : null}
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-input border border-control bg-panel-2 px-2.5 py-1.5 text-ui text-text outline-none transition-colors duration-hover placeholder:text-muted focus-visible:border-accent disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(INPUT_CLASS, 'h-9 min-h-[36px]', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...props },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(INPUT_CLASS, 'resize-y leading-relaxed', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, { className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(INPUT_CLASS, 'h-9 min-h-[36px] pr-7', className)} {...props}>
        {children}
      </select>
    );
  },
);

/* --------------------------------------------------------------- etiquetas */
export function Chip({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span className={cn('chip-mono', className)} title={title}>
      {children}
    </span>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'err' | 'accent';
  className?: string;
}) {
  const tones = {
    neutral: 'border-line text-muted',
    ok: 'border-ok/40 text-ok',
    warn: 'border-warn/40 text-warn',
    err: 'border-err/40 text-err',
    accent: 'border-accent/50 text-accent',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-chip border px-2 py-0.5 text-label uppercase tracking-label',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- estructura */
export function SectionHead({
  no,
  title,
  action,
  hint,
  className,
}: {
  no?: string;
  title: string;
  action?: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex flex-wrap items-baseline justify-between gap-2', className)}>
      <h2 className="flex items-baseline gap-2 text-h3 font-bold">
        {no ? (
          <span aria-hidden="true" className="section-no">
            § {no}
          </span>
        ) : null}
        <span className="flex items-baseline gap-1.5">
          <span aria-hidden="true" className="text-accent">
            ❯
          </span>
          {title}
        </span>
      </h2>
      {hint ? <span className="text-meta text-muted">{hint}</span> : null}
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-card border border-dashed border-line bg-panel/60 px-5 py-8 text-center', className)}>
      <p className="text-body text-text">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-prose text-ui text-muted">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('shimmer rounded-input', className)} />;
}

export function Progress({
  value,
  max = 1,
  label,
  className,
  tone = 'accent',
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  tone?: 'accent' | 'ok' | 'warn' | 'err';
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const tones = { accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', err: 'bg-err' } as const;
  return (
    <div
      className={cn('h-1 w-full overflow-hidden rounded-chip bg-line', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-label={label}
    >
      <div className={cn('h-full transition-[width] duration-hover', tones[tone])} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

/** Glifos de estado, SIEMPRE acompañados de texto (§9.6). */
export type GlyphState = 'aprobado' | 'enCurso' | 'pendiente' | 'alerta' | 'hecho' | 'bloqueado';

export const GLYPHS: Record<GlyphState, string> = {
  aprobado: '●',
  enCurso: '◐',
  pendiente: '○',
  alerta: '▲',
  hecho: '✓',
  bloqueado: '›',
};

export function StatusGlyph({
  state,
  label,
  className,
}: {
  state: GlyphState;
  label: string;
  className?: string;
}) {
  const tones: Record<GlyphState, string> = {
    aprobado: 'text-ok',
    enCurso: 'text-accent',
    pendiente: 'text-muted',
    alerta: 'text-warn',
    hecho: 'text-ok',
    bloqueado: 'text-muted',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-meta', className)}>
      <span aria-hidden="true" className={cn('text-body leading-none', tones[state])}>
        {GLYPHS[state]}
      </span>
      <span className="text-muted">{label}</span>
    </span>
  );
}

/** Regla decorativa de terminal (§9.6), solo desktop. */
export function DottedRule({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('rule-dotted hidden select-none text-line-strong md:block', className)}>
      {'─'.repeat(200)}
    </span>
  );
}

/** Numeral de sección a la izquierda (§9.4). */
export function SectionNumber({ n }: { n: string }) {
  return (
    <span aria-hidden="true" className="section-no hidden md:inline">
      § {n}
    </span>
  );
}
