import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHead, Field, Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import type { AppState, ExportProfile } from '@/data/types';
import { buildVault, type VaultFile } from '@/domain/obsidian';
import { useT } from '@/lib/i18n/useT';
import { FALLBACK_PROFILE, messageOf, profileComparer } from '../helpers';
import { sizeParts, vaultOverview, type VaultFileInfo } from '../vaultTree';
import { downloadVaultZip, vaultFilename } from '../vaultZip';
import { StatusLine } from './StatusLine';

function FileList({
  files,
  sizeOf,
}: {
  files: VaultFileInfo[];
  sizeOf: (bytes: number) => string;
}) {
  return (
    <ul className="flex flex-col">
      {files.map((file) => (
        <li
          key={file.path}
          className="flex items-baseline justify-between gap-2 border-b border-line/60 py-1 last:border-b-0"
        >
          <span className="min-w-0 break-words text-meta text-text">{file.name}</span>
          <span className="tnum shrink-0 text-meta text-muted">{sizeOf(file.bytes)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Flujo de exportación del vault (§7.12): elegir perfil → vista previa del árbol
 * con conteo y tamaño aproximado → descargar `miplan-aws-vault-YYYY-MM-DD.zip`.
 * El `.zip` se arma con `jszip` a partir de `buildVault`, en memoria.
 */
export function VaultSection({ state }: { state: AppState }) {
  const { t, f, locale } = useT();
  const { notify } = useToast();
  const [profileId, setProfileId] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const profiles = useMemo(
    () => [...state.exportProfiles].sort(profileComparer),
    [state.exportProfiles],
  );

  const profile: ExportProfile = useMemo(() => {
    const selected = profiles.find((item) => item.id === profileId);
    if (selected) return selected;
    const byDefault = profiles.find((item) => item.id === state.settings.defaultExportProfileId);
    return byDefault ?? profiles[0] ?? FALLBACK_PROFILE;
  }, [profiles, profileId, state.settings.defaultExportProfileId]);

  const preview = useMemo(() => {
    try {
      const files = buildVault({ state, profile, locale, now: new Date() });
      return { files, error: '' };
    } catch (cause) {
      return { files: [] as VaultFile[], error: messageOf(cause) };
    }
  }, [state, profile, locale]);

  const overview = useMemo(
    () => vaultOverview(preview.files, profile.folder),
    [preview.files, profile.folder],
  );

  const sizeOf = (bytes: number): string => {
    const parts = sizeParts(bytes);
    return t(`exporter.size.${parts.unit}`, { value: f.number(parts.value) });
  };

  const download = async () => {
    setBusy(true);
    setStatus('');
    try {
      const filename = vaultFilename();
      await downloadVaultZip(preview.files, filename);
      const folder = profile.folder.trim();
      const message =
        folder.length > 0
          ? t('exporter.vault.doneWithFolder', {
              n: preview.files.length,
              count: preview.files.length,
              folder,
            })
          : t('exporter.vault.doneRoot', { n: preview.files.length, count: preview.files.length });
      setStatus(message);
      notify(message, 'ok');
    } catch (cause) {
      const message = t('exporter.vault.error', { message: messageOf(cause) });
      setStatus(message);
      notify(message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const folderLabel = profile.folder.trim();

  return (
    <div className="flex flex-col gap-2">
      <Card>
        <CardHead>
          <span className="label-mono truncate">{profile.name}</span>
          <span className="tnum text-meta text-muted">{vaultFilename()}</span>
        </CardHead>
        <CardBody className="flex flex-col gap-3">
          <Field label={t('exporter.vault.profile')} htmlFor="exporter-vault-profile">
            <Select
              id="exporter-vault-profile"
              value={profile.id}
              onChange={(event) => setProfileId(event.target.value)}
            >
              {profiles.length === 0 ? (
                <option value={profile.id}>{profile.name}</option>
              ) : (
                profiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))
              )}
            </Select>
          </Field>
          {profiles.length === 0 ? (
            <p className="text-meta text-muted">{t('exporter.vault.noProfiles')}</p>
          ) : null}

          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-ui text-text">
            <span className="tnum font-medium">
              {t('exporter.vault.files', { count: overview.count, n: overview.count })}
            </span>
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span className="tnum text-muted">{sizeOf(overview.bytes)}</span>
          </p>

          {preview.error.length > 0 ? (
            <p role="alert" className="text-meta text-err">
              <span aria-hidden="true" className="mr-1">
                ▲
              </span>
              {t('exporter.vault.error', { message: preview.error })}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <h3 className="label-mono">{t('exporter.vault.tree')}</h3>
            <p className="text-meta text-muted">{t('exporter.vault.treeHint')}</p>
            {overview.count === 0 ? (
              <p className="text-ui text-muted">{t('exporter.vault.empty')}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {overview.root && overview.root.files.length > 0 ? (
                  <div className="flex flex-col gap-1 rounded-card border border-line bg-panel-2 px-3 py-2">
                    <p className="label-mono">
                      {t('exporter.vault.rootFiles')}
                      {folderLabel.length > 0 ? ` · ${folderLabel}/` : ''}
                    </p>
                    <FileList files={overview.root.files} sizeOf={sizeOf} />
                  </div>
                ) : null}

                {overview.folders.map((folder) => (
                  <details key={folder.key} className="rounded-card border border-line bg-panel-2">
                    <summary className="cursor-pointer px-3 py-2 marker:text-accent">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="min-w-0 break-words text-ui font-medium text-text">
                          {folder.name}
                        </span>
                        <span className="tnum shrink-0 text-meta text-muted">
                          {t('exporter.vault.folderCount', {
                            count: folder.count,
                            n: folder.count,
                            size: sizeOf(folder.bytes),
                          })}
                        </span>
                      </span>
                    </summary>
                    <div className="flex flex-col gap-2 border-t border-line px-3 py-2">
                      {folder.files.length > 0 ? (
                        <FileList files={folder.files} sizeOf={sizeOf} />
                      ) : null}
                      {folder.subfolders.map((sub) => (
                        <div key={sub.name} className="flex flex-col gap-1">
                          <p className="label-mono">{sub.name}</p>
                          <FileList files={sub.files} sizeOf={sizeOf} />
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>

          <div>
            <Button
              variant="primary"
              glyph
              className="min-h-[44px]"
              disabled={busy || overview.count === 0}
              aria-busy={busy}
              onClick={() => void download()}
            >
              {busy ? t('exporter.vault.downloading') : t('exporter.vault.download')}
            </Button>
          </div>

          <StatusLine text={status} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5 text-meta text-muted">
            <li>
              <span aria-hidden="true" className="mr-1 text-warn">
                ▲
              </span>
              {t('exporter.vault.mergeWarning')}
            </li>
            <li>
              {t('exporter.vault.icsNote')}{' '}
              <Link to="/recordatorios" className="text-accent">
                {t('exporter.vault.icsLink')}
              </Link>
            </li>
            <li>{t('exporter.vault.rules')}</li>
            <li>{t('exporter.vault.private')}</li>
          </ul>

          <div className="flex flex-col gap-1 border-t border-line pt-2.5">
            <h3 className="text-ui font-medium text-text">{t('exporter.vault.steps')}</h3>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-meta text-muted">
              <li>{t('exporter.vault.step1')}</li>
              <li>
                {t('exporter.vault.step2', {
                  folder: folderLabel.length > 0 ? `\`${folderLabel}/\`` : t('exporter.vault.root'),
                })}
              </li>
              <li>{t('exporter.vault.step3')}</li>
              <li>{t('exporter.vault.step4')}</li>
            </ol>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
