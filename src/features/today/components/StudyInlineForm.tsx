import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Textarea } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/cn';
import type { Confidence } from '@/data/types';

const CONFIDENCES: Confidence[] = [1, 2, 3, 4, 5];

/** Confianza inicial: la misma que el registro rápido de la bitácora. */
const DEFAULT_CONFIDENCE: Confidence = 4;

const MAX_MINUTES = 1440;

export interface StudyFormValues {
  minutes: number;
  confidence: Confidence;
  note: string;
}

/**
 * §7.9 — mini-registro **en línea** de la acción *Estudiar*: minutos (30 por
 * defecto, editable), confianza 1–5 y nota rápida. No es un modal ni navega:
 * la vista de "Hoy" sigue detrás, con el resto de la bandeja visible.
 */
export function StudyInlineForm({
  id,
  title,
  defaultMinutes,
  busy,
  onCancel,
  onSave,
}: {
  id: string;
  title: string;
  defaultMinutes: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (values: StudyFormValues) => void;
}) {
  const { t } = useT();
  const [minutesText, setMinutesText] = useState(String(defaultMinutes));
  const [confidence, setConfidence] = useState<Confidence>(DEFAULT_CONFIDENCE);
  const [note, setNote] = useState('');

  const minutes = Number(minutesText);
  const validMinutes = Number.isFinite(minutes) && minutes > 0 && minutes <= MAX_MINUTES;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validMinutes || busy) return;
    onSave({ minutes: Math.round(minutes), confidence, note: note.trim() });
  };

  return (
    <form
      id={id}
      onSubmit={submit}
      aria-busy={busy}
      className="rounded-card border border-line bg-panel-2 p-3"
    >
      <p className="break-words text-ui font-bold">{t('today.study.title', { title })}</p>
      <p className="mt-1 text-meta text-muted">{t('today.study.help')}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label={t('today.study.minutes')} htmlFor={`${id}-minutes`}>
          <Input
            id={`${id}-minutes`}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_MINUTES}
            step={5}
            value={minutesText}
            onChange={(event) => setMinutesText(event.target.value)}
            // El formulario se revela en línea: el foco entra en el primer campo.
            autoFocus
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="label-mono">{t('common.confidence')}</span>
          <div role="group" aria-label={t('common.confidence')} className="flex gap-1.5">
            {CONFIDENCES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={confidence === value}
                onClick={() => setConfidence(value)}
                className={cn(
                  'tnum h-9 min-w-9 flex-1 rounded-input border text-ui transition-colors duration-hover',
                  confidence === value ? 'border-accent text-accent' : 'border-line text-muted hover:text-text',
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Field
        className="mt-3"
        label={t('today.study.note')}
        htmlFor={`${id}-note`}
        hint={t('today.study.noteHint')}
      >
        <Textarea
          id={`${id}-note`}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>

      {validMinutes ? null : (
        <p role="alert" className="mt-2 text-meta text-err">
          <span aria-hidden="true">▲ </span>
          {t('common.invalidNumber')}
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy} className="min-h-[44px]">
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary" glyph disabled={busy || !validMinutes} className="min-h-[44px]">
          {busy ? t('today.study.busy') : t('today.study.save')}
        </Button>
      </div>
    </form>
  );
}
