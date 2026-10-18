import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getDb } from '@/data/db';
import { newId, useAppState } from '@/data/store';
import type { Confidence, StudySession, StudyType } from '@/data/types';
import { Field, Button, Input, Select, Textarea } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/useT';
import { localDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

export interface SessionDraft {
  certId: string;
  domainId: string | null;
  minutes: number;
  type: StudyType;
  confidence: Confidence;
  notes: string;
  date?: string;
  topicId?: string | null;
}

/** Guarda una sesión de estudio (fuente única para bitácora, "Hoy" y el mini-registro). */
export async function saveStudySession(draft: SessionDraft): Promise<StudySession> {
  const session: StudySession = {
    id: newId('ses'),
    date: draft.date ?? localDate(),
    certId: draft.certId,
    domainId: draft.domainId,
    minutes: draft.minutes,
    type: draft.type,
    confidence: draft.confidence,
    notes: draft.notes,
    createdAt: new Date().toISOString(),
  };
  await getDb().studySessions.put(session);
  return session;
}

interface QuickSessionApi {
  openQuickSession: (defaults?: { certId?: string; domainId?: string | null; topicId?: string }) => void;
}

const QuickSessionContext = createContext<QuickSessionApi>({ openQuickSession: () => undefined });

const TYPES: StudyType[] = ['lectura', 'video', 'lab', 'practica', 'repaso', 'proyecto'];
const PRESETS = [15, 30, 45, 60];
const CONFIDENCES: Confidence[] = [1, 2, 3, 4, 5];

export function QuickSessionProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<{ certId?: string; domainId?: string | null; topicId?: string }>({});

  const openQuickSession = useCallback((next?: { certId?: string; domainId?: string | null; topicId?: string }) => {
    setDefaults(next ?? {});
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openQuickSession }), [openQuickSession]);

  return (
    <QuickSessionContext.Provider value={value}>
      {children}
      {open ? <QuickSessionDialog open={open} onOpenChange={setOpen} defaults={defaults} /> : null}
    </QuickSessionContext.Provider>
  );
}

/** Host del diálogo: se monta una vez en el layout. */
export function QuickSessionHost() {
  return null;
}

export function useQuickSession(): QuickSessionApi {
  return useContext(QuickSessionContext);
}

function QuickSessionDialog({
  open,
  onOpenChange,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: { certId?: string; domainId?: string | null; topicId?: string };
}) {
  const { t } = useT();
  const { notify } = useToast();
  const { state } = useAppState();
  const activeCertId = defaults.certId ?? state.settings.activeCertId ?? state.certifications[0]?.id ?? '';
  const [certId, setCertId] = useState(activeCertId);
  const [minutes, setMinutes] = useState(45);
  const [type, setType] = useState<StudyType>('lab');
  const [confidence, setConfidence] = useState<Confidence>(4);
  const [domainId, setDomainId] = useState<string | null>(defaults.domainId ?? null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cert = state.certifications.find((c) => c.id === certId);

  const submit = async () => {
    if (!certId || minutes <= 0) return;
    setBusy(true);
    setError(null);
    try {
      await saveStudySession({
        certId,
        domainId,
        minutes: Math.round(minutes),
        type,
        confidence,
        notes,
        topicId: defaults.topicId ?? null,
      });
      notify(t('common.quickSession.saved', { minutes: Math.round(minutes), cert: certId }), 'ok');
      onOpenChange(false);
    } catch (cause) {
      const message = (cause as Error).message;
      setError(message);
      notify(t('common.quickSession.error', { message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('common.quickSession.title')}
      description={t('common.quickSession.help')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy || !certId} glyph>
            {t('common.saveAndClose')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label={t('common.certification')} htmlFor="qs-cert">
          <Select
            id="qs-cert"
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

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.minutes')} htmlFor="qs-minutes">
            <Input
              id="qs-minutes"
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              inputMode="numeric"
            />
          </Field>
          <Field label={t('common.type')} htmlFor="qs-type">
            <Select id="qs-type" value={type} onChange={(event) => setType(event.target.value as StudyType)}>
              {TYPES.map((item) => (
                <option key={item} value={item}>
                  {t(`enum.study.${item}` as 'enum.study.lab')}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('common.quickSession.presets')}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setMinutes(preset)}
              aria-pressed={minutes === preset}
              className={cn(
                'min-h-8 rounded-chip border px-2.5 text-meta transition-colors duration-hover',
                minutes === preset ? 'border-accent text-accent' : 'border-line text-muted hover:text-text',
              )}
            >
              {preset} min
            </button>
          ))}
        </div>

        <Field label={t('common.domain')} htmlFor="qs-domain" hint={t('common.optional')}>
          <Select
            id="qs-domain"
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

        <Field label={t('common.confidence')} htmlFor="qs-confidence">
          <div className="flex gap-1.5" id="qs-confidence" role="group" aria-label={t('common.confidence')}>
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
        </Field>

        <Field label={t('common.notes')} htmlFor="qs-notes" hint={t('common.optional')}>
          <Textarea id="qs-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>

        {error ? (
          <p role="alert" className="text-meta text-err">
            ▲ {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
