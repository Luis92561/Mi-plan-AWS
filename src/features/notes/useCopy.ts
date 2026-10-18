import { useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { copyText } from '@/lib/clipboard';
import { useT } from '@/lib/i18n/useT';

/**
 * Copiar al portapapeles con el toast compartido: «Copiado · N caracteres»
 * (§7.11/§7.12). El conteo es del texto exacto que se copió.
 */
export function useCopy(): (text: string) => Promise<boolean> {
  const { t } = useT();
  const { notify } = useToast();
  return useCallback(
    async (text: string) => {
      const ok = await copyText(text);
      notify(ok ? t('common.copied', { n: text.length }) : t('common.copyFailed'), ok ? 'ok' : 'err');
      return ok;
    },
    [notify, t],
  );
}
