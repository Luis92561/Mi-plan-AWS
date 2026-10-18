import { useMemo } from 'react';
import { highlightParts } from '../model';

/** Resalta los términos de la búsqueda dentro de un texto de la lista (§7.11). */
export function HighlightText({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => highlightParts(text, terms), [text, terms]);
  if (parts.length === 1 && !parts[0]?.hit) return <>{text}</>;
  return (
    <>
      {parts.map((part, index) =>
        part.hit ? (
          <mark key={index} className="rounded-[2px] bg-accent/25 px-0.5 text-text">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
