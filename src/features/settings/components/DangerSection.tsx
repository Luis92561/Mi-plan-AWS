import { useState } from 'react';
import { Button, Card, CardBody, Field, Input } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { clearAllData } from '@/data/store';
import { useT } from '@/lib/i18n/useT';
import { messageOf } from '../helpers';
import { StatusLine } from './StatusLine';

/**
 * Zona peligrosa (§7.8): «Borrar todo» con **doble confirmación**. El primer paso
 * explica el alcance; el segundo exige escribir la palabra exacta y solo entonces
 * llama a `clearAllData()`. Nunca borra sin las dos confirmaciones.
 */
export function DangerSection() {
  const { t } = useT();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [word, setWord] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmWord = t('settings.danger.word');
  const matches = word.trim() === confirmWord;

  const openModal = () => {
    setStep(1);
    setWord('');
    setOpen(true);
  };

  const confirm = async () => {
    if (!matches) return;
    setBusy(true);
    try {
      await clearAllData();
      const message = t('settings.danger.done');
      setStatus(message);
      notify(message, 'ok');
      setOpen(false);
    } catch (cause) {
      const message = t('settings.danger.error', { message: messageOf(cause) });
      setStatus(message);
      notify(message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <p className="text-meta text-muted">{t('settings.danger.hint')}</p>
        <div>
          <Button variant="danger" className="min-h-[44px]" onClick={openModal}>
            {t('settings.danger.deleteAll')}
          </Button>
        </div>
        <StatusLine text={status} />
      </CardBody>

      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
        title={step === 1 ? t('settings.danger.step1Title') : t('settings.danger.step2Title')}
        description={step === 1 ? t('settings.danger.step1Body') : undefined}
        closeLabel={t('common.close')}
        footer={
          step === 1 ? (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={() => setStep(2)}>
                {t('settings.danger.step1Confirm')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} disabled={busy}>
                {t('settings.danger.back')}
              </Button>
              <Button variant="danger" onClick={() => void confirm()} disabled={busy || !matches}>
                {t('settings.danger.confirm')}
              </Button>
            </>
          )
        }
      >
        {step === 1 ? (
          <p className="text-ui text-warn">
            <span aria-hidden="true" className="mr-1">
              ▲
            </span>
            {t('settings.danger.step1List')}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-ui text-text">{t('settings.danger.step2Body', { word: confirmWord })}</p>
            <Field
              label={t('settings.danger.input', { word: confirmWord })}
              htmlFor="settings-danger-word"
            >
              <Input
                id="settings-danger-word"
                value={word}
                onChange={(event) => setWord(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={confirmWord}
              />
            </Field>
          </div>
        )}
      </Modal>
    </Card>
  );
}
