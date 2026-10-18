import { useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import type { Certification, PlanItem, PlanStatus } from '@/data/types';
import { Button } from '@/components/ui/primitives';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { useToast } from '@/components/ui/toast';
import { useAppState, nowIso } from '@/data/store';
import { getDb } from '@/data/db';
import { useT } from '@/lib/i18n/useT';
import { copyText } from '@/lib/clipboard';
import { renderCertNote, renderRouteNote } from '@/domain/obsidian';
import { PLAN_STATUSES } from '../helpers';

export interface CertMenuProps {
  cert: Certification;
  planItem: PlanItem | null;
}

/**
 * Menú `⋯` de la certificación (§7.12): copiar para Obsidian, copiar ruta,
 * cambiar estado del plan, marcar como saltada y quitar de mi plan.
 */
export function CertMenu({ cert, planItem }: CertMenuProps) {
  const { t, locale } = useT();
  const { state } = useAppState();
  const navigate = useNavigate();
  const { notify } = useToast();

  const copy = async (build: () => string) => {
    try {
      const text = build();
      const ok = await copyText(text);
      notify(ok ? t('common.copied', { n: text.length }) : t('cert.menu.copyError'), ok ? 'ok' : 'err');
    } catch (cause) {
      notify(t('common.genericError', { message: (cause as Error).message }), 'err');
    }
  };

  const setStatus = async (status: PlanStatus) => {
    if (!planItem) {
      notify(t('cert.menu.noPlan'), 'neutral');
      return;
    }
    try {
      await getDb().planItems.update(planItem.id, { status, updatedAt: nowIso() });
      notify(t('cert.menu.statusChanged', { code: cert.code, status: t(`enum.plan.${status}`) }), 'ok');
    } catch (cause) {
      notify(t('cert.menu.statusError', { message: (cause as Error).message }), 'err');
    }
  };

  const skip = async () => {
    if (!planItem) return;
    try {
      await getDb().planItems.update(planItem.id, { status: 'saltado', updatedAt: nowIso() });
      notify(t('cert.menu.skipped', { code: cert.code }), 'ok');
    } catch (cause) {
      notify(t('cert.menu.statusError', { message: (cause as Error).message }), 'err');
    }
  };

  const remove = async () => {
    if (!planItem) return;
    try {
      await getDb().planItems.delete(planItem.id);
      notify(t('cert.menu.removed', { code: cert.code }), 'ok');
      navigate('/ruta');
    } catch (cause) {
      notify(t('cert.menu.statusError', { message: (cause as Error).message }), 'err');
    }
  };

  return (
    <Menu>
      <MenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          aria-label={t('cert.menu.label')}
          title={t('cert.menu.label')}
          className="min-w-9 px-2"
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </Button>
      </MenuTrigger>
      <MenuContent ariaLabel={t('cert.menu.label')} className="max-h-[70dvh] overflow-y-auto">
        <MenuItem onSelect={() => void copy(() => renderCertNote(state, cert.id, locale, new Date()))}>
          {t('cert.menu.copyObsidian')}
        </MenuItem>
        <MenuItem onSelect={() => void copy(() => renderRouteNote(state, locale, new Date()))}>
          {t('cert.menu.copyRoute')}
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>{t('cert.menu.status')}</MenuLabel>
        {PLAN_STATUSES.map((status) => (
          <MenuItem
            key={status}
            disabled={!planItem || planItem.status === status}
            onSelect={() => void setStatus(status)}
          >
            <span className="flex items-center justify-between gap-3">
              <span>{t(`enum.plan.${status}`)}</span>
              <span aria-hidden="true" className={planItem?.status === status ? 'text-accent' : 'text-muted'}>
                {planItem?.status === status ? '●' : '○'}
              </span>
            </span>
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem disabled={!planItem} onSelect={() => void skip()}>
          {t('cert.menu.skip')}
        </MenuItem>
        <MenuItem danger disabled={!planItem} onSelect={() => void remove()}>
          {t('cert.menu.remove')}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
