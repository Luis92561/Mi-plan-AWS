import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Card, CardBody, CardHead, Chip } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { Checkbox } from '@/components/ui/toggle';
import { downloadText } from '@/data/backup';
import type { AppState } from '@/data/types';
import { buildIcs, icsFilename } from '@/domain/ics';
import { useT } from '@/lib/i18n/useT';
import { ICS_HORIZON_DAYS } from '../model';
import { readIcsSequence, writeIcsSequence } from '../permission';

const VEVENT = /BEGIN:VEVENT/g;

/**
 * Exportar `.ics` (§7.13).
 *
 * - Aviso explícito antes de exportar: el archivo contiene títulos de temas
 *   (información personal) y es una **foto** del plan (§10).
 * - `SEQUENCE` sube en cada reexportación: el contador vive en `localStorage`
 *   (es preferencia de UI, no un dato de negocio).
 * - Todo se genera en memoria y se descarga con un `Blob`: cero red.
 */
export function IcsExportCard({ state }: { state: AppState }) {
  const { t, f } = useT();
  const { notify } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [sequence, setSequence] = useState(() => readIcsSequence());
  const [busy, setBusy] = useState(false);
  const nextSequence = sequence + 1;
  const now = new Date();
  const fileName = icsFilename(now);

  const exportIcs = () => {
    if (!confirmed) {
      notify(t('reminders.ics.confirmRequired'), 'err');
      return;
    }
    setBusy(true);
    try {
      const content = buildIcs({ state, now, horizonDays: ICS_HORIZON_DAYS, sequence: nextSequence });
      const events = (content.match(VEVENT) ?? []).length;
      downloadText(fileName, content, 'text/calendar');
      writeIcsSequence(nextSequence);
      setSequence(nextSequence);
      if (events === 0) {
        notify(t('reminders.ics.empty', { days: ICS_HORIZON_DAYS }), 'err');
      } else {
        notify(t('reminders.ics.done', { count: events }), 'ok');
      }
    } catch (cause) {
      notify(t('reminders.ics.error', { message: cause instanceof Error ? cause.message : String(cause) }), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="ics-export">
      <CardHead>
        <h2 className="text-h3 font-bold">{t('reminders.ics.title')}</h2>
        <Chip>{t('reminders.ics.horizon', { count: ICS_HORIZON_DAYS })}</Chip>
      </CardHead>
      <CardBody className="flex flex-col gap-3">
        <p className="rounded-input border border-warn/45 bg-panel-2 px-2.5 py-2 text-ui text-warn">
          <span aria-hidden="true">▲ </span>
          {t('reminders.ics.warning')}
        </p>
        <p className="text-meta text-muted">{t('reminders.ics.snapshot')}</p>
        <p className="text-meta text-muted">{t('reminders.ics.importable')}</p>

        <div className="flex min-h-11 items-start gap-2">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked)}
            label={t('reminders.ics.confirm')}
          />
          <span aria-hidden="true" className="text-ui text-muted">
            {t('reminders.ics.confirm')}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="tnum text-meta text-muted">
            {t('reminders.ics.sequence', { count: nextSequence })}
          </span>
          <Button
            variant="primary"
            onClick={exportIcs}
            disabled={busy || !confirmed}
            className="min-h-11 md:min-h-10"
          >
            <Download size={15} aria-hidden="true" />
            {t('reminders.ics.action')}
          </Button>
        </div>

        <p className="tnum text-meta text-muted">
          {fileName} · {f.date(now)}
        </p>
      </CardBody>
    </Card>
  );
}
