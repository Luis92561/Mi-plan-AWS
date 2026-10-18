import { Pencil, Trash2 } from 'lucide-react';
import { Chip } from '@/components/ui/primitives';
import type { Certification, Flashcard } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/cn';

export interface CardTableProps {
  cards: Flashcard[];
  certifications: Certification[];
  today: string;
  busyId: string | null;
  onEdit: (card: Flashcard) => void;
  onDelete: (card: Flashcard) => void;
}

/**
 * §7.7 — vista "todas las tarjetas": `dueDate`, `ease`, `reps` y `lapses` en
 * cifras tabulares, con editar y eliminar por fila. En móvil la tabla se
 * desplaza dentro de su propio contenedor (la página nunca desborda).
 */
export function CardTable({
  cards,
  certifications,
  today,
  busyId,
  onEdit,
  onDelete,
}: CardTableProps) {
  const { t, f } = useT();

  return (
    <div className="overflow-x-auto">
      <table className="ledger w-full min-w-[640px]">
        <caption className="sr-only">{t('review.all.label')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('review.table.front')}</th>
            <th scope="col">{t('review.table.cert')}</th>
            <th scope="col" className="num">
              {t('review.table.due')}
            </th>
            <th scope="col" className="num">
              {t('review.table.ease')}
            </th>
            <th scope="col" className="num">
              {t('review.table.reps')}
            </th>
            <th scope="col" className="num">
              {t('review.table.lapses')}
            </th>
            <th scope="col" className="num">
              <span className="sr-only">{t('review.table.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const cert = certifications.find((candidate) => candidate.id === card.certId);
            const overdue = card.dueDate < today;
            const busy = busyId === card.id;
            return (
              <tr key={card.id}>
                <td>
                  <span className="block max-w-[260px] truncate text-ui text-text">{card.front}</span>
                  <span className="block max-w-[260px] truncate text-meta text-muted">{card.back}</span>
                </td>
                <td>
                  <Chip className="text-accent">{cert?.code ?? card.certId}</Chip>
                </td>
                <td className={cn('num tnum whitespace-nowrap', overdue && 'text-warn')}>
                  {overdue ? (
                    <span aria-hidden="true" className="mr-1">
                      ▲
                    </span>
                  ) : null}
                  {f.date(card.dueDate)}
                  {overdue ? ` · ${t('review.table.overdue')}` : null}
                </td>
                <td className="num tnum">{f.number(card.ease)}</td>
                <td className="num tnum">{f.number(card.reps)}</td>
                <td className="num tnum">{f.number(card.lapses)}</td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text"
                      aria-label={t('review.editAria', { front: card.front })}
                      title={t('common.edit')}
                      disabled={busy}
                      onClick={() => onEdit(card)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-err"
                      aria-label={t('review.deleteAria', { front: card.front })}
                      title={t('common.delete')}
                      disabled={busy}
                      onClick={() => onDelete(card)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
