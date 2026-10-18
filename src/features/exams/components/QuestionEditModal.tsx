import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId } from '@/data/store';
import type { Certification, Question } from '@/data/types';
import { useT } from '@/lib/i18n/useT';

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

/** Zona táctil mínima de 44 px en móvil y compacta en escritorio (§9.8). */
const TAP = 'min-h-[44px] sm:min-h-[32px]';

function parseTags(raw: string): string[] {
  return raw
    .split(';')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export interface QuestionEditModalProps {
  /** `null` = pregunta nueva. */
  question: Question | null;
  certifications: Certification[];
  defaultCertId: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Alta y edición de una pregunta del banco propio (F3.2).
 * Valida 2–6 opciones con una sola correcta y nunca toca el dominio ni otros módulos.
 */
export function QuestionEditModal({
  question,
  certifications,
  defaultCertId,
  onOpenChange,
}: QuestionEditModalProps) {
  const { t } = useT();
  const { notify } = useToast();

  const initialCertId = question?.certId ?? defaultCertId ?? certifications[0]?.id ?? '';
  const [certId, setCertId] = useState(initialCertId);
  const [domainId, setDomainId] = useState(question?.domainId ?? '');
  const [prompt, setPrompt] = useState(question?.prompt ?? '');
  const [options, setOptions] = useState<string[]>(() =>
    question ? [...question.options] : ['', '', '', ''],
  );
  const [correctIndex, setCorrectIndex] = useState(question ? question.correctIndex : 0);
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [source, setSource] = useState(question?.source ?? '');
  const [tags, setTags] = useState(question ? question.tags.join('; ') : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cert = certifications.find((item) => item.id === certId);

  const changeCert = (nextCertId: string) => {
    setCertId(nextCertId);
    setDomainId('');
  };

  const changeOption = (index: number, value: string) => {
    setOptions((current) => current.map((option, position) => (position === index ? value : option)));
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    const next = options.filter((_, position) => position !== index);
    const nextCorrect =
      correctIndex > index ? correctIndex - 1 : correctIndex === index ? Math.max(0, index - 1) : correctIndex;
    setOptions(next);
    setCorrectIndex(Math.min(nextCorrect, next.length - 1));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((current) => [...current, '']);
  };

  const save = async () => {
    const cleanPrompt = prompt.trim();
    const cleanOptions = options.map((option) => option.trim());
    if (!cert) {
      setError(t('practice.bank.form.errCert'));
      return;
    }
    if (cleanPrompt.length === 0) {
      setError(t('practice.bank.form.errPrompt'));
      return;
    }
    if (cleanOptions.length < MIN_OPTIONS || cleanOptions.some((option) => option.length === 0)) {
      setError(t('practice.bank.form.errOptions'));
      return;
    }
    if (correctIndex < 0 || correctIndex >= cleanOptions.length) {
      setError(t('practice.bank.form.errCorrect'));
      return;
    }

    const base = {
      certId: cert.id,
      domainId: domainId === '' ? null : domainId,
      prompt: cleanPrompt,
      options: cleanOptions,
      correctIndex,
      explanation: explanation.trim(),
      source: source.trim() === '' ? t('practice.bank.form.sourceDefault') : source.trim(),
      tags: parseTags(tags),
    };

    setBusy(true);
    setError(null);
    try {
      if (question) {
        await getDb().questions.put({ ...question, ...base });
        notify(t('practice.bank.form.saved'), 'ok');
      } else {
        await getDb().questions.put({
          ...base,
          id: newId('q'),
          createdAt: new Date().toISOString(),
        });
        notify(t('practice.bank.form.created'), 'ok');
      }
      onOpenChange(false);
    } catch (cause) {
      const message = (cause as Error).message;
      setError(t('practice.bank.form.error', { message }));
      notify(t('practice.bank.form.error', { message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={question ? t('practice.bank.form.editTitle') : t('practice.bank.form.newTitle')}
      description={t('practice.bank.form.help')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {t('practice.bank.form.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('practice.bank.form.cert')} htmlFor="bank-form-cert">
            <Select id="bank-form-cert" value={certId} onChange={(event) => changeCert(event.target.value)}>
              {certifications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('practice.bank.form.domain')} htmlFor="bank-form-domain">
            <Select id="bank-form-domain" value={domainId} onChange={(event) => setDomainId(event.target.value)}>
              <option value="">{t('practice.bank.list.domainNone')}</option>
              {(cert?.domains ?? []).map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t('practice.bank.form.prompt')} htmlFor="bank-form-prompt">
          <Textarea
            id="bank-form-prompt"
            rows={3}
            value={prompt}
            placeholder={t('practice.bank.form.promptPlaceholder')}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="label-mono">{t('practice.bank.form.options')}</legend>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="bank-form-correct"
                className="h-4 w-4 shrink-0 accent-accent"
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                aria-label={t('practice.bank.form.markCorrect', { n: index + 1 })}
              />
              <Input
                aria-label={t('practice.bank.form.optionN', { n: index + 1 })}
                value={option}
                onChange={(event) => changeOption(index, event.target.value)}
              />
              <button
                type="button"
                aria-label={t('practice.bank.form.removeOption', { n: index + 1 })}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input text-muted transition-colors duration-hover hover:bg-hover hover:text-text disabled:pointer-events-none disabled:opacity-45"
                disabled={options.length <= MIN_OPTIONS}
                onClick={() => removeOption(index)}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className={TAP} onClick={addOption} disabled={options.length >= MAX_OPTIONS}>
              <Plus size={14} aria-hidden="true" />
              {t('practice.bank.form.addOption')}
            </Button>
            <span className="text-meta text-muted">{t('practice.bank.form.optionsHint')}</span>
          </div>
        </fieldset>

        <Field label={t('practice.bank.form.explanation')} htmlFor="bank-form-explanation" hint={t('common.optional')}>
          <Textarea
            id="bank-form-explanation"
            rows={3}
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('practice.bank.form.source')} htmlFor="bank-form-source" hint={t('common.optional')}>
            <Input
              id="bank-form-source"
              value={source}
              placeholder={t('practice.bank.form.sourceDefault')}
              onChange={(event) => setSource(event.target.value)}
            />
          </Field>
          <Field label={t('practice.bank.form.tags')} htmlFor="bank-form-tags" hint={t('practice.bank.form.tagsHint')}>
            <Input
              id="bank-form-tags"
              value={tags}
              placeholder={t('practice.bank.form.tagsHint')}
              onChange={(event) => setTags(event.target.value)}
            />
          </Field>
        </div>

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
