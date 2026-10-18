import { useMemo, isValidElement, type ReactNode } from 'react';
import { Copy } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/useT';
import { useCopy } from '../useCopy';

/** Texto plano de un árbol React (para copiar un bloque de código exacto). */
function textOf(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(children)) return textOf(children.props.children);
  return '';
}

/** Bloque de código con su propio botón de copiar (§7.11). */
function CodeBlock({ children }: { children?: ReactNode }) {
  const { t } = useT();
  const copy = useCopy();
  const text = useMemo(() => textOf(children).replace(/\n$/, ''), [children]);

  return (
    <div className="relative my-2 overflow-hidden rounded-card border border-line bg-panel-2">
      <div className="absolute right-1 top-1 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void copy(text)}
          aria-label={t('notes.copy.code')}
          title={t('notes.copy.code')}
          className="min-h-11 min-w-11 bg-panel-2/90 md:min-h-8 md:min-w-0"
        >
          <Copy size={14} aria-hidden="true" />
        </Button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 pr-16 text-meta leading-relaxed">{children}</pre>
    </div>
  );
}

/**
 * Vista previa del Markdown de una nota (§7.11).
 *
 * Reglas duras:
 *  - `react-markdown` + `remark-gfm`, sin `rehype-raw`: el HTML crudo nunca se
 *    renderiza (§8.9, §10).
 *  - Los enlaces salen con `target="_blank"` y `rel="noopener noreferrer"`.
 *  - Los encabezados bajan un nivel para no competir con el `h1` de la página.
 */
export function MarkdownPreview({ markdown, emptyLabel }: { markdown: string; emptyLabel: string }) {
  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => <h2 className="mt-4 text-h3 font-bold">{children}</h2>,
      h2: ({ children }) => <h3 className="mt-4 text-h3 font-bold">{children}</h3>,
      h3: ({ children }) => <h4 className="mt-3 text-body font-bold">{children}</h4>,
      h4: ({ children }) => <h5 className="mt-3 text-body font-bold">{children}</h5>,
      h5: ({ children }) => <h6 className="mt-3 text-ui font-bold">{children}</h6>,
      h6: ({ children }) => <h6 className="mt-3 text-ui font-bold">{children}</h6>,
      p: ({ children }) => <p className="my-1.5 text-body leading-relaxed">{children}</p>,
      a: ({ children, href }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
          {children}
        </a>
      ),
      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
      blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-accent/50 pl-3 text-muted">{children}</blockquote>
      ),
      ul: ({ children, className }) => (
        <ul
          className={cn(
            'my-1.5 space-y-1 pl-5',
            className?.includes('contains-task-list') ? 'list-none pl-1' : 'list-disc',
          )}
        >
          {children}
        </ul>
      ),
      ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>,
      li: ({ children, className }) => (
        <li className={cn('text-body leading-relaxed', className?.includes('task-list-item') && 'flex items-start gap-1.5')}>
          {children}
        </li>
      ),
      input: ({ checked }) => (
        <input
          type="checkbox"
          checked={checked === true}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="mt-1 h-3.5 w-3.5 shrink-0"
        />
      ),
      hr: () => <hr className="my-4 border-line" />,
      table: ({ children }) => (
        <div className="my-2 overflow-x-auto">
          <table className="ledger w-full text-ui">{children}</table>
        </div>
      ),
      th: ({ children }) => <th scope="col">{children}</th>,
      td: ({ children }) => <td>{children}</td>,
      code: ({ children, className }) => {
        const isFenced = typeof className === 'string' && className.includes('language-');
        if (isFenced) return <code className={cn('font-mono', className)}>{children}</code>;
        return (
          <code className="rounded-[3px] border border-line bg-panel-2 px-1 py-0.5 text-meta">{children}</code>
        );
      },
      pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
    }),
    [],
  );

  if (markdown.trim().length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line px-3 py-6 text-center text-ui text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="prose-read">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
