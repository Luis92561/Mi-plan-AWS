/**
 * Línea de resultado de una sección: `aria-live="polite"` para que el lector de
 * pantalla anuncie el resultado de copiar o descargar (§9.8).
 */
export function StatusLine({ text }: { text: string }) {
  return (
    <p role="status" aria-live="polite" className="min-h-[20px] text-meta text-muted">
      {text}
    </p>
  );
}
