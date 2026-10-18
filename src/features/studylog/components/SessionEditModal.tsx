import { useState } from 'react';
import { getDb } from '@/data/db';
import { useAppState } from '@/data/store';
import type { Confidence, StudySession, StudyType } from '@/data/types';
import { Button, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/useT';
import { isValidDateString } from '@/lib/dates';
import { cn } from '@/lib/cn';
import type { TKey } from '@/lib/i18n/shape';

const TYPES: StudyType[] = ['lectura', 'video', 'lab', 'practica', 'repaso', 'proyecto'];
const CONFIDENCES: Confidence[] = [1, 2, 3, 4, 5];

export interface SessionEditModalProps {
  session: StudySession;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edición de una sesión de la bitácora (§7.4).
 * Escribe directo en Dexie (`studySessions.put`) y avisa con toast.
 */
export function SessionEditModal({ session, onOpenChange }: SessionEditModalProps) {
  const { t, f } = useT();
  const { notify } = useToast();
  const { state } = useAppState();

  const [date, setDate] = useState(session.date);
  const [certId, setCertId] = useState(session.certId);
  const [domainId, setDomainId] = useState<string | null>(session.domainId);
  const [minutes, setMinutes] = useState(String(session.minutes));
  const [type, setType] = useState<StudyType>(session.type);
  const [confidence, setConfidence] = useState<Confidence>(session.confidence);
  const [notes, setNotes] = useState(session.notes);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cert = state.certifications.find((item) => item.id === certId);
  const parsedMinutes = Number(minutes);

  const submit = async () => {
    if (!isValidDateString(date)) {
      setError(t('common.invalidDate'));
      return;
    }
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 1440) {
      setError(t('log.edit.minutesError'));
      return;
    }
    if (certId === '') {
      setError(t('common.requiredField'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated: StudySession = {
        ...session,
        date,
        certId,
        domainId,
        minutes: Math.round(parsedMinutes),
        type,
        confidence,
        notes: notes.trim(),
      };
      await getDb().studySessions.put(updated);
      notify(t('log.edit.done', { date: f.date(date) }), 'ok');
      onOpenChange(false);
    } catch (cause) {
      const message = (cause as Error).message;
      setError(t('log.edit.error', { message }));
      notify(t('log.edit.error', { message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={t('log.edit.title')}
      description={t('log.edit.help')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" glyph onClick={submit} disabled={busy}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('common.date')} htmlFor="sl-date">
            <Input
              id="sl-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label={t('common.minutes')} htmlFor="sl-minutes">
            <Input
              id="sl-minutes"
              type="number"
              min={1}
              max={1440}
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('common.certification')} htmlFor="sl-cert">
            <Select
              id="sl-cert"
              value={certId}
              onChange={(event) => {
                setCertId(event.target.value);
                setDomainId(null);
              }}
            >
              {state.certifications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.type')} htmlFor="sl-type">
            <Select
              id="sl-type"
              value={type}
              onChange={(event) => setType(event.target.value as StudyType)}
            >
              {TYPES.map((item) => (
                <option key={item} value={item}>
                  {t(`enum.study.${item}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t('common.domain')} htmlFor="sl-domain" hint={t('common.optional')}>
          <Select
            id="sl-domain"
            value={domainId ?? ''}
            onChange={(event) => setDomainId(event.target.value || null)}
          >
            <option value="">—</option>
            {(cert?.domains ?? []).map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </Select>
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
                  'tnum h-11 min-w-11 flex-1 rounded-input border text-ui transition-colors duration-hover',
                  confidence === value
                    ? 'border-accent text-accent'
                    : 'border-line text-muted hover:text-text',
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <Field label={t('common.notes')} htmlFor="sl-notes" hint={t('common.optional')}>
          <Textarea
            id="sl-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-meta text-err">
            <span aria-hidden="true">▲ </span>
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
