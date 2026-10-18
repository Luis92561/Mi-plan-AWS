/**
 * Línea de resultado de una sección de Ajustes: `aria-live="polite"` para que el
 * lector de pantalla anuncie el resultado de guardar, importar o borrar (§9.8).
 */
export function StatusLine({ text }: { text: string }) {
  return (
    <p role="status" aria-live="polite" className="min-h-[20px] text-meta text-muted">
      {text}
    </p>
  );
}
