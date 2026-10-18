import { useState } from 'react';
import type { Certification, ChecklistItem, Recurrence } from '@/data/types';
import {
  Button,
  Card,
  CardBody,
  CardHead,
  Chip,
  EmptyState,
  Field,
  Input,
  Progress,
  Select,
} from '@/components/ui/primitives';
import { Checkbox } from '@/components/ui/toggle';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId } from '@/data/store';
import { CHECKLIST_TEMPLATES } from '@/data/seed';
import { checklistProgress, completeItem, groupChecklist } from '@/domain/checklist';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/cn';
import { nextOrder } from '../helpers';

export interface ChecklistTabProps {
  cert: Certification;
  items: ChecklistItem[];
}

const RECURRENCES: Recurrence[] = ['ninguna', 'diaria', 'semanal', 'mensual'];

/** Pestaña Checklist (§7.3, §7.10): grupos fijos, progreso, ítem propio y restaurar plantilla. */
export function ChecklistTab({ cert, items }: ChecklistTabProps) {
  const { t, f } = useT();
  const { notify } = useToast();
  const progress = checklistProgress(items);
  const groups = groupChecklist(items);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('ninguna');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async (item: ChecklistItem) => {
    try {
      const result = completeItem(item, items, new Date());
      const db = getDb();
      await db.checklistItems.put(result.updated);
      if (result.spawned) await db.checklistItems.put(result.spawned);
    } catch (cause) {
      notify(t('cert.checklist.error', { message: (cause as Error).message }), 'err');
    }
  };

  const addOwn = async () => {
    const clean = title.trim();
    if (!clean) {
      setError(t('cert.checklist.titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const item: ChecklistItem = {
        id: newId('chk'),
        certId: cert.id,
        topicId: null,
        groupId: 'personal',
        title: clean,
        done: false,
        doneAt: null,
        dueDate: dueDate === '' ? null : dueDate,
        order: nextOrder(items),
        recurrence,
        templateKey: null,
        createdAt: new Date().toISOString(),
      };
      await getDb().checklistItems.put(item);
      setTitle('');
      setDueDate('');
      setRecurrence('ninguna');
      notify(t('cert.checklist.created'), 'ok');
    } catch (cause) {
      setError(t('cert.checklist.error', { message: (cause as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  /** Restaurar plantilla: añade los ítems que falten, sin duplicar por `templateKey`. */
  const restore = async () => {
    setBusy(true);
    try {
      const templates = CHECKLIST_TEMPLATES[cert.level];
      const present = new Set(
        items.map((item) => item.templateKey).filter((key): key is string => typeof key === 'string'),
      );
      const missing = templates.filter((template) => !present.has(template.templateKey));
      if (missing.length === 0) {
        notify(t('cert.checklist.restoredNone'), 'neutral');
        return;
      }
      const base = nextOrder(items) - 1;
      const createdAt = new Date().toISOString();
      const created: ChecklistItem[] = missing.map((template, index) => ({
        id: newId('chk'),
        certId: cert.id,
        topicId: null,
        groupId: template.groupId,
        title: template.title,
        done: false,
        doneAt: null,
        dueDate: null,
        order: base + index + 1,
        recurrence: template.recurrence ?? 'ninguna',
        templateKey: template.templateKey,
        createdAt,
      }));
      await getDb().checklistItems.bulkPut(created);
      notify(
        t('cert.checklist.restored', { n: created.length, count: created.length }),
        'ok',
      );
    } catch (cause) {
      notify(t('cert.checklist.restoreError', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardBody className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="label-mono">{t('common.progress')}</span>
            <span className="tnum text-ui text-text">
              {t('cert.checklist.progress', { done: progress.done, total: progress.total })}
            </span>
          </div>
          <Progress
            value={progress.done}
            max={Math.max(1, progress.total)}
            label={t('cert.checklist.progress', { done: progress.done, total: progress.total })}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void restore()}>
              {t('cert.checklist.restore')}
            </Button>
          </div>
        </CardBody>
      </Card>

      {groups.length === 0 ? <EmptyState title={t('cert.checklist.empty')} /> : null}

      {groups.map((group) => (
        <Card key={group.groupId}>
          <CardHead>
            <h2 className="text-h3 font-bold">{t(`enum.group.${group.groupId}`)}</h2>
            <span className="tnum text-meta text-muted">
              {group.items.filter((item) => item.done).length}/{group.items.length}
            </span>
          </CardHead>
          <ul className="flex flex-col px-4 py-1.5">
            {group.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5 border-b border-line py-2 last:border-b-0">
                <Checkbox
                  checked={item.done}
                  onCheckedChange={() => void toggle(item)}
                  label={item.title}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-ui text-text', item.done && 'text-muted line-through')}>{item.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-muted">
                    {item.dueDate ? <span className="tnum">{f.date(item.dueDate)}</span> : null}
                    {item.recurrence !== 'ninguna' ? <Chip>{t(`enum.recurrence.${item.recurrence}`)}</Chip> : null}
                    {item.done && item.doneAt ? (
                      <span>{t('cert.checklist.doneAt', { date: f.date(item.doneAt) })}</span>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('cert.checklist.createTitle')}
          </h2>
          <Chip>{t('enum.group.personal')}</Chip>
        </CardHead>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label={t('common.title')}
              htmlFor="checklist-title"
              error={error ?? undefined}
              className="sm:col-span-2"
            >
              <Input
                id="checklist-title"
                value={title}
                placeholder={t('cert.checklist.titlePlaceholder')}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label={t('cert.checklist.due')} htmlFor="checklist-due" hint={t('common.optional')}>
              <Input
                id="checklist-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
            <Field label={t('cert.checklist.recurrence')} htmlFor="checklist-recurrence">
              <div className="flex items-end gap-2">
                <Select
                  id="checklist-recurrence"
                  value={recurrence}
                  onChange={(event) => setRecurrence(event.target.value as Recurrence)}
                >
                  {RECURRENCES.map((value) => (
                    <option key={value} value={value}>
                      {t(`enum.recurrence.${value}`)}
                    </option>
                  ))}
                </Select>
                <Button variant="primary" glyph disabled={busy} onClick={() => void addOwn()} className="shrink-0">
                  {t('cert.checklist.add')}
                </Button>
              </div>
            </Field>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
