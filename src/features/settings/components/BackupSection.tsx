import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHead, Chip, Field, Input } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/toggle';
import { useToast } from '@/components/ui/toast';
import {
  backupFilename,
  buildBackupText,
  downloadText,
  importBackup,
  parseBackupFile,
  type ImportMode,
} from '@/data/backup';
import { getDb } from '@/data/db';
import { MAX_BACKUP_BYTES, type ParseResult } from '@/data/schemas';
import { loadDemoData } from '@/data/seed';
import { saveSettings } from '@/data/store';
import type { AppState } from '@/data/types';
import { renderFullReport } from '@/domain/markdown';
import { useT } from '@/lib/i18n/useT';
import {
  MIN_PHRASE_LENGTH,
  PBKDF2_ITERATIONS,
  decryptBackup,
  encryptBackup,
  type CryptoFailure,
} from '../backupCrypto';
import { COUNT_LABELS, markdownFilename, messageOf, readLastBackup, writeLastBackup } from '../helpers';
import { StatusLine } from './StatusLine';

interface PendingImport {
  name: string;
  result: ParseResult;
}

interface EncryptedInput {
  name: string;
  text: string;
}

/**
 * El `input` real queda `sr-only` (el texto del selector nativo no se puede
 * traducir); el foco se dibuja en la etiqueta con `focus-within`, así que sigue
 * siendo visible al navegar con teclado (§9.8).
 */
const FILE_PICKER = [
  'inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-input border border-control',
  'px-3.5 text-ui text-text transition-colors duration-hover hover:bg-hover sm:min-h-[36px]',
  'focus-within:border-accent focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
].join(' ');

function ActionBox({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-card border border-line bg-panel-2 px-3 py-3">
      <p className="text-ui font-medium text-text">{title}</p>
      <p className="text-meta leading-snug text-muted">{hint}</p>
      <div className="mt-auto pt-1">{children}</div>
    </div>
  );
}

/**
 * Respaldo (§7.8, §10): exportar JSON, importar con validación y modo
 * reemplazar/fusionar, exportar Markdown, cargar demo y —si se activa— exportar
 * y descifrar un respaldo con frase de paso. Nada sale del dispositivo.
 */
export function BackupSection({ state }: { state: AppState }) {
  const { t, f, locale } = useT();
  const { notify } = useToast();
  const [status, setStatus] = useState('');
  const [phraseStatus, setPhraseStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [lastBackup, setLastBackup] = useState<string | null>(() => readLastBackup());
  const [phraseMode, setPhraseMode] = useState<'export' | 'import' | null>(null);
  const [phrase, setPhrase] = useState('');
  const [phraseError, setPhraseError] = useState('');
  const [encrypted, setEncrypted] = useState<EncryptedInput | null>(null);

  const report = (text: string, tone: 'ok' | 'err') => {
    setStatus(text);
    notify(text, tone);
  };

  const rememberBackup = (iso: string) => {
    writeLastBackup(iso);
    setLastBackup(iso);
  };

  const failureText = (reason: CryptoFailure): string => {
    if (reason === 'unsupported') return t('settings.passphrase.failUnsupported');
    if (reason === 'invalidFile') return t('settings.passphrase.failInvalid');
    return t('settings.passphrase.failWrong');
  };

  /* ---------------------------------------------------------------- exportar */

  const exportJson = () => {
    try {
      const now = new Date();
      const name = backupFilename(now);
      downloadText(name, buildBackupText(state, now), 'application/json');
      rememberBackup(now.toISOString());
      report(t('settings.backup.jsonDone', { name }), 'ok');
    } catch (cause) {
      report(t('settings.backup.error', { message: messageOf(cause) }), 'err');
    }
  };

  const exportMarkdown = () => {
    try {
      const now = new Date();
      const name = markdownFilename(now);
      downloadText(name, renderFullReport(state, locale, now), 'text/markdown');
      report(t('settings.backup.mdDone', { name }), 'ok');
    } catch (cause) {
      report(t('settings.backup.error', { message: messageOf(cause) }), 'err');
    }
  };

  const loadDemo = async () => {
    setBusy(true);
    setStatus('');
    try {
      await loadDemoData(getDb(), new Date());
      report(t('settings.backup.demoDone'), 'ok');
    } catch (cause) {
      report(t('settings.backup.error', { message: messageOf(cause) }), 'err');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------------- importar */

  const handleFile = async (event: ChangeEvent<HTMLInputElement>, isEncrypted: boolean) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setStatus('');
    if (file.size > MAX_BACKUP_BYTES) {
      report(t('settings.backup.fileTooBig'), 'err');
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      if (isEncrypted) {
        setEncrypted({ name: file.name, text });
        setPhrase('');
        setPhraseError('');
        setPhraseMode('import');
        return;
      }
      const result = parseBackupFile(text);
      if (!result.ok || !result.data) {
        report(t('settings.backup.parseError', { message: result.error ?? '' }), 'err');
        return;
      }
      setMode('merge');
      setPending({ name: file.name, result });
    } catch (cause) {
      report(t('settings.backup.readError', { message: messageOf(cause) }), 'err');
    } finally {
      setBusy(false);
    }
  };

  const applyImport = async () => {
    const data = pending?.result.data;
    if (!data) return;
    setBusy(true);
    try {
      const outcome = await importBackup(data, mode);
      report(t('settings.backup.imported', { count: outcome.imported ?? 0 }), 'ok');
      setPending(null);
    } catch (cause) {
      report(t('settings.backup.importError', { message: messageOf(cause) }), 'err');
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------------ frase de paso */

  const togglePassphrase = async (next: boolean) => {
    setPhraseStatus('');
    try {
      await saveSettings({ ...state.settings, passphraseEnabled: next });
      const message = t(next ? 'settings.passphrase.enabled' : 'settings.passphrase.disabled');
      setPhraseStatus(message);
      notify(message, 'ok');
    } catch (cause) {
      const message = t('settings.passphrase.stateError', { message: messageOf(cause) });
      setPhraseStatus(message);
      notify(message, 'err');
    }
  };

  const closePhrase = () => {
    setPhraseMode(null);
    setPhrase('');
    setPhraseError('');
    setEncrypted(null);
  };

  const runEncrypt = async () => {
    if (phrase.trim().length < MIN_PHRASE_LENGTH) {
      setPhraseError(t('settings.passphrase.tooShort'));
      return;
    }
    setBusy(true);
    setPhraseError('');
    try {
      const now = new Date();
      const result = await encryptBackup(buildBackupText(state, now), phrase, now);
      if (!result.ok) {
        setPhraseError(failureText(result.reason));
        return;
      }
      const name = `${backupFilename(now)}.enc`;
      downloadText(name, result.text, 'application/octet-stream');
      rememberBackup(now.toISOString());
      const message = t('settings.passphrase.done', { name });
      setPhraseStatus(message);
      notify(message, 'ok');
      closePhrase();
    } catch (cause) {
      const message = t('settings.passphrase.error', { message: messageOf(cause) });
      setPhraseStatus(message);
      notify(message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const runDecrypt = async () => {
    if (!encrypted) return;
    if (phrase.trim().length < MIN_PHRASE_LENGTH) {
      setPhraseError(t('settings.passphrase.tooShort'));
      return;
    }
    setBusy(true);
    setPhraseError('');
    try {
      const result = await decryptBackup(encrypted.text, phrase);
      if (!result.ok) {
        setPhraseError(failureText(result.reason));
        return;
      }
      const parsed = parseBackupFile(result.text);
      if (!parsed.ok || !parsed.data) {
        report(t('settings.backup.parseError', { message: parsed.error ?? '' }), 'err');
        closePhrase();
        return;
      }
      const name = encrypted.name.replace(/\.enc$/i, '');
      setMode('merge');
      setPending({ name, result: parsed });
      const message = t('settings.passphrase.decrypted');
      setPhraseStatus(message);
      notify(message, 'ok');
      closePhrase();
    } finally {
      setBusy(false);
    }
  };

  const submitPhrase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phraseMode === 'export') void runEncrypt();
    else void runDecrypt();
  };

  const modes: { value: ImportMode; label: string; hint: string }[] = [
    {
      value: 'merge',
      label: t('settings.backup.modeMerge'),
      hint: t('settings.backup.modeMergeHint'),
    },
    {
      value: 'replace',
      label: t('settings.backup.modeReplace'),
      hint: t('settings.backup.modeReplaceHint'),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <Card>
        <CardBody className="flex flex-col gap-3">
          <p className="text-meta text-muted">{t('settings.backup.hint')}</p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ActionBox title={t('action.exportJson')} hint={t('settings.backup.exportJsonHint')}>
              <Button className="min-h-[44px] sm:min-h-[36px]" onClick={exportJson} disabled={busy}>
                {t('action.exportJson')}
              </Button>
            </ActionBox>

            <ActionBox title={t('settings.backup.importJson')} hint={t('settings.backup.importHint')}>
              <label className={FILE_PICKER}>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  disabled={busy}
                  onChange={(event) => void handleFile(event, false)}
                />
                {t('settings.backup.importJson')}
              </label>
            </ActionBox>

            <ActionBox title={t('action.exportMarkdown')} hint={t('settings.backup.exportMdHint')}>
              <Button
                className="min-h-[44px] sm:min-h-[36px]"
                onClick={exportMarkdown}
                disabled={busy}
              >
                {t('action.exportMarkdown')}
              </Button>
            </ActionBox>

            <ActionBox title={t('settings.backup.demo')} hint={t('settings.backup.demoHint')}>
              <Button
                className="min-h-[44px] sm:min-h-[36px]"
                onClick={() => void loadDemo()}
                disabled={busy}
                aria-busy={busy}
              >
                {t('action.loadDemo')}
              </Button>
            </ActionBox>
          </div>

          <p className="tnum text-meta text-muted">
            {lastBackup
              ? t('settings.backup.last', { date: f.dateTime(lastBackup) })
              : t('settings.backup.never')}
          </p>
          <p className="text-meta text-muted">
            {t('settings.backup.profiles')}{' '}
            <Link to="/exportar" className="text-accent">
              {t('settings.backup.profilesLink')}
            </Link>
          </p>

          <StatusLine text={status} />
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h3 className="text-h3 font-bold">{t('settings.passphrase.label')}</h3>
        </CardHead>
        <CardBody className="flex flex-col gap-3">
          <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-input border border-line px-3 py-2">
            <p className="min-w-0 text-meta text-muted">{t('settings.passphrase.hint')}</p>
            <Switch
              checked={state.settings.passphraseEnabled}
              onCheckedChange={(next) => void togglePassphrase(next)}
              label={t('settings.passphrase.label')}
            />
          </div>

          <p className="text-meta text-warn">
            <span aria-hidden="true" className="mr-1">
              ▲
            </span>
            {t('settings.passphrase.warning')}
          </p>
          <p className="text-meta text-muted">
            {t('settings.passphrase.exportHint', { iterations: f.number(PBKDF2_ITERATIONS) })}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              className="min-h-[44px] sm:min-h-[36px]"
              disabled={!state.settings.passphraseEnabled || busy}
              onClick={() => {
                setPhrase('');
                setPhraseError('');
                setEncrypted(null);
                setPhraseMode('export');
              }}
            >
              {t('settings.passphrase.export')}
            </Button>

            <label className={FILE_PICKER}>
              <input
                type="file"
                accept=".enc,application/octet-stream"
                className="sr-only"
                disabled={busy}
                onChange={(event) => void handleFile(event, true)}
              />
              {t('settings.backup.importEnc')}
            </label>
          </div>
          <p className="text-meta text-muted">{t('settings.passphrase.importHint')}</p>

          <StatusLine text={phraseStatus} />
        </CardBody>
      </Card>

      <Modal
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={t('settings.backup.review')}
        description={t('settings.backup.reviewHint')}
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              {t('settings.backup.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void applyImport()} disabled={busy}>
              {t('settings.backup.confirm')}
            </Button>
          </>
        }
      >
        {pending ? (
          <div className="flex flex-col gap-3">
            <p className="flex flex-wrap items-baseline gap-2 text-ui text-text">
              <span className="label-mono">{t('settings.backup.file')}</span>
              <Chip className="max-w-full truncate">{pending.name}</Chip>
            </p>

            <div>
              <h4 className="label-mono mb-1.5">{t('settings.backup.counts')}</h4>
              <dl className="grid grid-cols-1 gap-x-3 gap-y-1 text-meta sm:grid-cols-2">
                {COUNT_LABELS.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-baseline justify-between gap-2 border-b border-line/60 py-0.5"
                  >
                    <dt className="min-w-0 truncate text-muted">{t(row.labelKey)}</dt>
                    <dd className="tnum text-text">
                      {f.number(pending.result.counts?.[row.key] ?? 0)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="label-mono mb-1">{t('settings.backup.mode')}</legend>
              {modes.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2 rounded-input border border-line px-2.5 py-2"
                >
                  <input
                    type="radio"
                    name="settings-import-mode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={() => setMode(option.value)}
                    className="mt-1 accent-accent"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-ui text-text">{option.label}</span>
                    <span className="text-meta text-muted">{option.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={phraseMode !== null}
        onOpenChange={(open) => {
          if (!open) closePhrase();
        }}
        title={
          phraseMode === 'export'
            ? t('settings.passphrase.exportTitle')
            : t('settings.passphrase.importTitle')
        }
        description={
          phraseMode === 'export'
            ? t('settings.passphrase.exportHint', { iterations: f.number(PBKDF2_ITERATIONS) })
            : t('settings.passphrase.importHint')
        }
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={closePhrase} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="settings-phrase-form" variant="primary" disabled={busy}>
              {phraseMode === 'export'
                ? t('settings.passphrase.submit')
                : t('settings.passphrase.decrypt')}
            </Button>
          </>
        }
      >
        <form id="settings-phrase-form" className="flex flex-col gap-3" onSubmit={submitPhrase}>
          {encrypted && phraseMode === 'import' ? (
            <p className="flex flex-wrap items-baseline gap-2 text-ui text-text">
              <span className="label-mono">{t('settings.passphrase.fileName')}</span>
              <Chip className="max-w-full truncate">{encrypted.name}</Chip>
            </p>
          ) : null}
          <Field
            label={t('settings.passphrase.phrase')}
            htmlFor="settings-phrase"
            hint={t('settings.passphrase.phraseHint')}
            error={phraseError.length > 0 ? phraseError : undefined}
          >
            <Input
              id="settings-phrase"
              type="password"
              value={phrase}
              onChange={(event) => {
                setPhrase(event.target.value);
                setPhraseError('');
              }}
              autoComplete="new-password"
              spellCheck={false}
            />
          </Field>
          <p className="text-meta text-warn">
            <span aria-hidden="true" className="mr-1">
              ▲
            </span>
            {t('settings.passphrase.warning')}
          </p>
        </form>
      </Modal>
    </div>
  );
}
