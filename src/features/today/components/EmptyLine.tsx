/**
 * Línea de bloque vacío: más discreta que `EmptyState` para no competir con el
 * estado vacío de la página. El glifo `○` es decorativo (`aria-hidden`).
 */
export function EmptyLine({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-card border border-dashed border-line px-3 py-3.5 text-ui text-muted">
      <span aria-hidden="true" className="text-line-strong">
        ○
      </span>
      {text}
    </p>
  );
}
