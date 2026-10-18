import type { Certification, Domain, Flashcard } from '@/data/types';
import { dueCards } from '@/domain/sm2';

/** Filtro del mazo: certificación y, dentro de ella, dominio (§7.7). */
export interface DeckFilter {
  certId: string | null;
  domainId: string | null;
}

export const ALL_DECKS: DeckFilter = { certId: null, domainId: null };

export function isFiltering(filter: DeckFilter): boolean {
  return filter.certId !== null || filter.domainId !== null;
}

/** Tarjetas que pasan el filtro, sin ordenar (el orden lo decide cada vista). */
export function cardsFor(cards: Flashcard[], filter: DeckFilter): Flashcard[] {
  return cards.filter(
    (card) =>
      (filter.certId === null || card.certId === filter.certId) &&
      (filter.domainId === null || card.domainId === filter.domainId),
  );
}

/** Cola "hoy": vencidas (`dueDate <= today`) del mazo filtrado. */
export function dueQueue(cards: Flashcard[], filter: DeckFilter, today: string): Flashcard[] {
  return dueCards(cardsFor(cards, filter), today);
}

/** Mazo completo filtrado, de la más vencida a la más lejana. */
export function deckQueue(cards: Flashcard[], filter: DeckFilter): Flashcard[] {
  return [...cardsFor(cards, filter)].sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    return a.front.localeCompare(b.front);
  });
}

/** Certificaciones que tienen al menos una tarjeta (opciones del filtro). */
export function certificationsWithCards(
  certifications: Certification[],
  cards: Flashcard[],
): Certification[] {
  const withCards = new Set(cards.map((card) => card.certId));
  return certifications
    .filter((cert) => withCards.has(cert.id))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Dominios ("mazos") que tienen tarjetas. El dominio solo es comparable dentro
 * de una certificación: con `certId === null` no hay mazos que ofrecer.
 */
export function domainsWithCards(
  certifications: Certification[],
  cards: Flashcard[],
  certId: string | null,
): Domain[] {
  if (certId === null) return [];
  const domains = certifications.find((cert) => cert.id === certId)?.domains ?? [];
  const used = new Set(
    cards.filter((card) => card.certId === certId && card.domainId !== null).map((card) => card.domainId),
  );
  return domains.filter((domain) => used.has(domain.id));
}

/** Fecha de la próxima tarjeta del mazo (`null` si no hay tarjetas). */
export function nextDue(cards: Flashcard[]): string | null {
  const dates = cards.map((card) => card.dueDate).sort();
  return dates[0] ?? null;
}
