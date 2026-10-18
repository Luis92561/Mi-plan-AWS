import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHead,
  Chip,
  EmptyState,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { newId, nowIso, saveSettings } from '@/data/store';
import type { AppState, ExportProfile } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import {
  PROFILE_FLAGS,
  messageOf,
  profileComparer,
  type ProfileDraft,
} from '../helpers';
import { ProfileForm } from './ProfileForm';
import { StatusLine } from './StatusLine';

type FormMode = 'idle' | 'new' | 'edit';

/**
 * CRUD de perfiles de exportación sobre `exportProfiles` (§7.12) y elección del
 * perfil predeterminado en `settings.defaultExportProfileId`. Los cambios se
 * reflejan al instante por la consulta reactiva de Dexie.
 */
export function ProfilesSection({ state }: { state: AppState }) {
  const { t, f } = useT();
  const { notify } = useToast();
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState<FormMode>('idle');
  const [editing, setEditing] = useState<ExportProfile | null>(null);
  const [deleting, setDeleting] = useState<ExportProfile | null>(null);
  const [busy, setBusy] = useState(false);

  const profiles = useMemo(
    () => [...state.exportProfiles].sort(profileComparer),
    [state.exportProfiles],
  );
  const defaultId = state.settings.defaultExportProfileId;

  const report = (text: string, tone: 'ok' | 'err') => {
    setStatus(text);
    notify(text, tone);
  };

  const closeForm = () => {
    setMode('idle');
    setEditing(null);
  };

  const persist = async (draft: ProfileDraft) => {
    setBusy(true);
    try {
      const row: ExportProfile = editing
        ? { ...editing, ...draft }
        : { id: newId('perfil'), createdAt: nowIso(), ...draft };
      await getDb().exportProfiles.put(row);
      report(t('exporter.profiles.saved', { name: row.name }), 'ok');
      closeForm();
    } catch (cause) {
      report(t('exporter.profiles.error', { message: messageOf(cause) }), 'err');
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (profile: ExportProfile) => {
    setBusy(true);
    try {
      await saveSettings({ ...state.settings, defaultExportProfileId: profile.id });
      report(t('exporter.profiles.defaultSet', { name: profile.name }), 'ok');
    } catch (cause) {
      report(t('exporter.profiles.error', { message: messageOf(cause) }), 'err');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (profile: ExportProfile) => {
    setBusy(true);
    try {
      await getDb().exportProfiles.delete(profile.id);
      if (defaultId === profile.id) {
        await saveSettings({ ...state.settings, defaultExportProfileId: null });
      }
      report(t('exporter.profiles.deleted', { name: profile.name }), 'ok');
      setDeleting(null);
    } catch (cause) {
      report(t('exporter.profiles.error', { message: messageOf(cause) }), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Card>
        <CardHead>
          <span className="label-mono">{t('exporter.profiles.list')}</span>
          <Button
            size="sm"
            variant="primary"
            glyph
            disabled={mode === 'new'}
            onClick={() => {
              setEditing(null);
              setMode('new');
            }}
          >
            {t('exporter.profiles.new')}
          </Button>
        </CardHead>
        <CardBody className="flex flex-col gap-2">
          {profiles.length === 0 ? (
            <EmptyState
              title={t('exporter.profiles.empty')}
              action={
                <Button
                  variant="primary"
                  glyph
                  onClick={() => {
                    setEditing(null);
                    setMode('new');
                  }}
                >
                  {t('exporter.profiles.new')}
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {profiles.map((profile) => {
                const isDefault = profile.id === defaultId;
                return (
                  <li
                    key={profile.id}
                    className="flex flex-col gap-2 rounded-card border border-line bg-panel-2 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-ui font-medium text-text">
                          <span className="break-words">{profile.name}</span>
                          {isDefault ? <Badge tone="accent">{t('exporter.profiles.default')}</Badge> : null}
                        </p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Chip title={t('exporter.profiles.folder')}>
                            {profile.folder.trim().length > 0
                              ? profile.folder
                              : t('exporter.profiles.folderRoot')}
                          </Chip>
                          {PROFILE_FLAGS.filter((flag) => profile[flag.key]).map((flag) => (
                            <Chip key={flag.key}>{t(flag.labelKey)}</Chip>
                          ))}
                        </p>
                        <p className="tnum mt-1.5 text-meta text-muted">
                          {t('exporter.profiles.created', { date: f.date(profile.createdAt) })}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isDefault ? null : (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void makeDefault(profile)}
                          >
                            {t('exporter.profiles.use')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t('exporter.profiles.edit', { name: profile.name })}
                          onClick={() => {
                            setEditing(profile);
                            setMode('edit');
                          }}
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          aria-label={t('exporter.profiles.delete', { name: profile.name })}
                          onClick={() => setDeleting(profile)}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <StatusLine text={status} />
        </CardBody>
      </Card>

      {mode === 'idle' ? null : (
        <Card>
          <CardHead>
            <h3 className="text-h3 font-bold">
              {mode === 'edit' ? t('exporter.profiles.formEdit') : t('exporter.profiles.formNew')}
            </h3>
            <span className="text-meta text-muted">{t('exporter.profiles.formHint')}</span>
          </CardHead>
          <CardBody>
            <ProfileForm
              key={editing?.id ?? 'nuevo'}
              initial={mode === 'edit' ? editing : null}
              saving={busy}
              onSave={(draft) => void persist(draft)}
              onCancel={closeForm}
            />
          </CardBody>
        </Card>
      )}

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t('exporter.profiles.deleteTitle')}
        description={
          deleting ? t('exporter.profiles.deleteBody', { name: deleting.name }) : undefined
        }
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (deleting) void remove(deleting);
              }}
            >
              {t('exporter.profiles.deleteConfirm')}
            </Button>
          </>
        }
      >
        {deleting ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip>
              {deleting.folder.trim().length > 0
                ? deleting.folder
                : t('exporter.profiles.folderRoot')}
            </Chip>
            <span className="tnum text-meta text-muted">
              {t('exporter.profiles.created', { date: f.date(deleting.createdAt) })}
            </span>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
