import { useState } from 'react';
import type { Certification, Priority, Topic } from '@/data/types';
import { Button, Card, CardBody, CardHead, Chip, EmptyState, Field, Input, Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId } from '@/data/store';
import { useT } from '@/lib/i18n/useT';

export interface TopicsTabProps {
  cert: Certification;
  topics: Topic[];
}

const PRIORITIES: Priority[] = [1, 2, 3];

/** Pestaña Temas (§7.3): unidades de estudio de la certificación con su agenda propia. */
export function TopicsTab({ cert, topics }: TopicsTabProps) {
  const { t, f } = useT();
  const { notify } = useToast();
  const [title, setTitle] = useState('');
  const [domainId, setDomainId] = useState('');
  const [priority, setPriority] = useState<Priority>(2);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = title.trim();
    if (!clean) {
      setError(t('cert.topics.titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const createdAt = new Date().toISOString();
      const topic: Topic = {
        id: newId('topic'),
        certId: cert.id,
        domainId: domainId === '' ? null : domainId,
        title: clean,
        descriptionMd: '',
        status: 'pendiente',
        priority,
        sourceResourceId: null,
        confidence: null,
        ease: 2.5,
        intervalDays: 1,
        nextReviewAt: null,
        lastStudiedAt: null,
        reviewCount: 0,
        createdAt,
        updatedAt: createdAt,
      };
      await getDb().topics.put(topic);
      setTitle('');
      notify(t('cert.topics.created'), 'ok');
    } catch (cause) {
      setError(t('cert.topics.error', { message: (cause as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...topics].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('cert.topics.createTitle')}
          </h2>
          <span className="hidden text-meta text-muted sm:inline">{t('cert.topics.hint')}</span>
        </CardHead>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label={t('cert.topics.titleLabel')}
              htmlFor="topic-title"
              error={error ?? undefined}
              className="sm:col-span-2"
            >
              <Input
                id="topic-title"
                value={title}
                placeholder={t('cert.topics.titlePlaceholder')}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label={t('cert.topics.domain')} htmlFor="topic-domain">
              <Select id="topic-domain" value={domainId} onChange={(event) => setDomainId(event.target.value)}>
                <option value="">{t('cert.summary.none')}</option>
                {cert.domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('cert.topics.priority')} htmlFor="topic-priority">
              <div className="flex items-end gap-2">
                <Select
                  id="topic-priority"
                  value={String(priority)}
                  onChange={(event) => setPriority(Number(event.target.value) as Priority)}
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {t(`enum.priority.${value}`)}
                    </option>
                  ))}
                </Select>
                <Button variant="primary" glyph onClick={() => void submit()} disabled={busy} className="shrink-0">
                  {t('cert.topics.create')}
                </Button>
              </div>
            </Field>
          </div>
        </CardBody>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState title={t('cert.topics.empty')} />
      ) : (
        <ul className="flex flex-col">
          {sorted.map((topic) => {
            const domain = topic.domainId ? cert.domains.find((item) => item.id === topic.domainId) : undefined;
            return (
              <li
                key={topic.id}
                className="flex flex-col gap-1 border-b border-line py-2.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-ui text-text">{topic.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-muted">
                    <Chip>{t(`enum.topic.${topic.status}`)}</Chip>
                    <span>
                      {t('cert.topics.priority')}:{' '}
                      <span className="text-text">{t(`enum.priority.${topic.priority}`)}</span>
                    </span>
                    <span>
                      {t('cert.topics.next')}:{' '}
                      <span className="tnum text-text">
                        {topic.nextReviewAt ? f.date(topic.nextReviewAt) : t('cert.topics.noNext')}
                      </span>
                    </span>
                    {domain ? <span>{domain.name}</span> : null}
                  </p>
                </div>
                {topic.confidence !== null ? (
                  <span className="shrink-0 text-meta text-muted">
                    {t('common.confidence')}: <span className="tnum text-text">{topic.confidence}</span>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
