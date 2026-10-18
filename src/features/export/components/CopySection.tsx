import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, Field, Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import type { AppState } from '@/data/types';
import { renderCertNote, renderRouteNote } from '@/domain/obsidian';
import { renderWeeklySummary } from '@/domain/markdown';
import { copyText } from '@/lib/clipboard';
import { useT } from '@/lib/i18n/useT';
import { copyableCerts, messageOf } from '../helpers';
import { StatusLine } from './StatusLine';

type CopyAction = 'obsidian' | 'route' | 'week';

function ActionBox({
  title,
  hint,
  label,
  busy,
  disabled,
  onRun,
}: {
  title: string;
  hint: string;
  label: string;
  busy: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-card border border-line bg-panel-2 px-3 py-3">
      <p className="text-ui font-medium text-text">{title}</p>
      <p className="text-meta leading-snug text-muted">{hint}</p>
      <Button
        variant="secondary"
        className="mt-auto min-h-[44px] self-start sm:min-h-[36px]"
        disabled={disabled || busy}
        aria-busy={busy}
        onClick={onRun}
      >
        {label}
      </Button>
    </div>
  );
}

/**
 * «Copiar para Obsidian», «Copiar ruta» y «Copiar resumen semanal» (§7.12).
 * Todo pasa por `copyText` (con fallback) y se confirma con un toast que incluye
 * el número de caracteres copiados.
 */
export function CopySection({ state }: { state: AppState }) {
  const { t, locale } = useT();
  const { notify } = useToast();
  const [status, setStatus] = useState('');
  const [certId, setCertId] = useState('');
  const [busy, setBusy] = useState<CopyAction | null>(null);

  const options = useMemo(() => copyableCerts(state), [state]);
  const selectedId = options.some((cert) => cert.id === certId)
    ? certId
    : (options.find((cert) => cert.id === state.settings.activeCertId)?.id ?? options[0]?.id ?? '');

  const run = async (action: CopyAction) => {
    setBusy(action);
    setStatus('');
    try {
      const now = new Date();
      let text = '';
      if (action === 'obsidian') {
        if (selectedId.length === 0) return;
        text = renderCertNote(state, selectedId, locale, now);
      } else if (action === 'route') {
        text = renderRouteNote(state, locale, now);
      } else {
        text = renderWeeklySummary(state, locale, now);
      }
      const ok = await copyText(text);
      const message = ok ? t('common.copied', { n: text.length }) : t('common.copyFailed');
      setStatus(message);
      notify(message, ok ? 'ok' : 'err');
    } catch (cause) {
      const message = t('common.genericError', { message: messageOf(cause) });
      setStatus(message);
      notify(message, 'err');
    } finally {
      setBusy(null);
    }
  };

  const empty = options.length === 0;

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        {empty ? (
          <p role="alert" className="text-ui text-warn">
            <span aria-hidden="true" className="mr-1">
              ▲
            </span>
            {t('exporter.copy.noCerts')}
          </p>
        ) : (
          <Field label={t('exporter.copy.cert')} htmlFor="exporter-copy-cert" hint={t('exporter.copy.certHint')}>
            <Select
              id="exporter-copy-cert"
              value={selectedId}
              onChange={(event) => setCertId(event.target.value)}
            >
              {options.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.code} · {cert.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {state.planItems.length === 0 && !empty ? (
          <p className="text-meta text-muted">{t('exporter.copy.noPlan')}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ActionBox
            title={t('action.copyForObsidian')}
            hint={t('exporter.copy.obsidianHint')}
            label={t('exporter.copy.obsidian')}
            busy={busy === 'obsidian'}
            disabled={empty}
            onRun={() => void run('obsidian')}
          />
          <ActionBox
            title={t('action.copyRoute')}
            hint={t('exporter.copy.routeHint')}
            label={t('exporter.copy.route')}
            busy={busy === 'route'}
            disabled={false}
            onRun={() => void run('route')}
          />
          <ActionBox
            title={t('action.copyWeek')}
            hint={t('exporter.copy.weekHint')}
            label={t('exporter.copy.week')}
            busy={busy === 'week'}
            disabled={false}
            onRun={() => void run('week')}
          />
          <div className="flex min-w-0 flex-col gap-1.5 rounded-card border border-dashed border-line px-3 py-3">
            <p className="text-meta leading-snug text-muted">{t('exporter.copy.noteHint')}</p>
            <Link
              to="/notas"
              className="mt-auto inline-flex min-h-[44px] items-center self-start text-meta text-accent sm:min-h-[36px]"
            >
              {t('exporter.copy.noteLink')} <span aria-hidden="true" className="ml-1">→</span>
            </Link>
          </div>
        </div>

        <StatusLine text={status} />
        <p className="text-meta text-muted">{t('exporter.vault.private')}</p>
      </CardBody>
    </Card>
  );
}
