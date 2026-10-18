import { useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@/components/ui/primitives';
import { Switch } from '@/components/ui/toggle';
import type { ExportProfile } from '@/data/types';
import { useT } from '@/lib/i18n/useT';
import { PROFILE_FLAGS, blankDraft, type ProfileDraft, type ProfileFlagKey } from '../helpers';

type Flags = Record<ProfileFlagKey, boolean>;

function initialFlags(profile: ExportProfile | null): Flags {
  const base = profile ?? blankDraft;
  const flags = {} as Flags;
  for (const flag of PROFILE_FLAGS) flags[flag.key] = base[flag.key];
  return flags;
}

export interface ProfileFormProps {
  /** Perfil que se edita; `null` para crear uno nuevo. */
  initial: ExportProfile | null;
  saving: boolean;
  onSave: (draft: ProfileDraft) => void;
  onCancel: () => void;
}

/**
 * Formulario de perfil de exportación (§7.12): nombre, carpeta y qué incluir.
 * El componente se monta con una `key` distinta por perfil, así que el estado
 * local nunca queda desincronizado. No usa `fetch` ni sale del dispositivo.
 */
export function ProfileForm({ initial, saving, onSave, onCancel }: ProfileFormProps) {
  const { t } = useT();
  const [name, setName] = useState(initial?.name ?? '');
  const [folder, setFolder] = useState(initial?.folder ?? blankDraft.folder);
  const [flags, setFlags] = useState<Flags>(() => initialFlags(initial));
  const [error, setError] = useState('');

  const toggle = (key: ProfileFlagKey, value: boolean) => {
    setFlags((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setError(t('exporter.profiles.nameRequired'));
      return;
    }
    setError('');
    onSave({ name: name.trim(), folder: folder.trim(), ...flags });
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('exporter.profiles.name')} htmlFor="exporter-profile-name">
          <Input
            id="exporter-profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('exporter.profiles.namePlaceholder')}
            maxLength={60}
            autoComplete="off"
          />
        </Field>
        <Field
          label={t('exporter.profiles.folder')}
          htmlFor="exporter-profile-folder"
          hint={t('exporter.profiles.folderHint')}
        >
          <Input
            id="exporter-profile-folder"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            placeholder={t('exporter.profiles.folderPlaceholder')}
            maxLength={80}
            autoComplete="off"
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="label-mono mb-1.5">{t('exporter.profiles.fields')}</legend>
        <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {PROFILE_FLAGS.map((flag) => (
            <div key={flag.key} className="flex min-h-[44px] items-center justify-between gap-2">
              <span className="text-ui text-text">{t(flag.labelKey)}</span>
              <Switch
                checked={flags[flag.key]}
                onCheckedChange={(value) => toggle(flag.key, value)}
                label={t(flag.labelKey)}
              />
            </div>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-meta text-err">
          <span aria-hidden="true" className="mr-1">
            ▲
          </span>
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={saving} aria-busy={saving}>
          {t('exporter.profiles.save')}
        </Button>
      </div>
    </form>
  );
}
