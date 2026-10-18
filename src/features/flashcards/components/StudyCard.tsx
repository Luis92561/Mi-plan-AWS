import { Button, Card, CardBody, Chip, Progress } from '@/components/ui/primitives';
import type { Flashcard } from '@/data/types';
import type { Grade } from '@/domain/sm2';
import { useT } from '@/lib/i18n/useT';

export interface StudyCardProps {
  card: Flashcard;
  certCode: string;
  domainName: string | null;
  /** Tarjetas ya calificadas en esta sesión. */
  done: number;
  /** Tamaño de la cola con la que arrancó la sesión. */
  total: number;
  revealed: boolean;
  busy: boolean;
  onFlip: () => void;
  onGrade: (grade: Grade) => void;
}

/** Botones de calificación (§7.7): Otra vez / Bien / Fácil. */
const GRADES: { grade: Grade; labelKey: 'review.grade.again' | 'review.grade.good' | 'review.grade.easy'; variant: 'secondary' | 'primary' }[] = [
  { grade: 'again', labelKey: 'review.grade.again', variant: 'secondary' },
  { grade: 'good', labelKey: 'review.grade.good', variant: 'primary' },
  { grade: 'easy', labelKey: 'review.grade.easy', variant: 'secondary' },
];

/**
 * §7.7 — tarjeta con volteo y progreso de sesión. La cara visible es el frente;
 * al voltear se muestra el reverso y se habilitan las tres calificaciones, que
 * aplican `sm2()` (la escritura la hace la página vía `useReviewActions`).
 */
export function StudyCard({
  card,
  certCode,
  domainName,
  done,
  total,
  revealed,
  busy,
  onFlip,
  onGrade,
}: StudyCardProps) {
  const { t } = useT();

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip className="text-accent">{certCode}</Chip>
            {domainName ? <Chip>{domainName}</Chip> : <Chip>{t('review.card.noDomain')}</Chip>}
          </div>
          <span className="tnum text-meta text-muted">
            {t('review.session.progress', { done, total })}
          </span>
        </div>

        <Progress
          value={done}
          max={Math.max(1, total)}
          label={t('review.session.progressAria', { done, total })}
        />

        <button
          type="button"
          onClick={onFlip}
          aria-label={revealed ? t('review.card.flipHide') : t('review.card.flipShow')}
          className="min-h-[168px] w-full rounded-input border border-line bg-panel-2 p-4 text-left transition-colors duration-hover hover:bg-hover"
        >
          <span className="label-mono block">{t('review.card.frontLabel')}</span>
          <span className="mt-1.5 block whitespace-pre-wrap break-words text-read text-text">
            {card.front}
          </span>
          {revealed ? (
            <span className="mt-3 block border-t border-line pt-3">
              <span className="label-mono block">{t('review.card.backLabel')}</span>
              <span className="mt-1.5 block whitespace-pre-wrap break-words text-read text-text">
                {card.back}
              </span>
            </span>
          ) : (
            <span className="mt-3 block text-meta text-muted">{t('review.card.flipHint')}</span>
          )}
        </button>

        <div className="grid gap-2 sm:grid-cols-3">
          {GRADES.map(({ grade, labelKey, variant }) => (
            <Button
              key={grade}
              variant={variant}
              className="min-h-[44px]"
              disabled={!revealed || busy}
              aria-label={t('review.grade.aria', { grade: t(labelKey) })}
              onClick={() => onGrade(grade)}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>

        <p className="text-meta text-muted">{t('review.grade.hint')}</p>

        {/* Qué cara está visible: cambio de estado anunciado (§9.8). */}
        <span role="status" aria-live="polite" className="sr-only">
          {revealed ? t('review.card.flipShown') : t('review.card.flipHidden')}
        </span>
      </CardBody>
    </Card>
  );
}
