import { Link } from 'react-router-dom';
import { useT } from '@/lib/i18n/useT';
import { Button } from '@/components/ui/primitives';

export function NotFoundPage() {
  const { t } = useT();
  return (
    <section className="mx-auto max-w-shell px-1 py-16 text-center">
      <p aria-hidden="true" className="text-display text-line-strong">
        404
      </p>
      <h1 className="mt-2 text-h2">{t('common.notFoundTitle')}</h1>
      <p className="mx-auto mt-2 max-w-prose text-ui text-muted">
        {t('common.notFoundBody', { path: window.location.hash.replace('#', '') || '/' })}
      </p>
      <div className="mt-6 flex justify-center">
        <Link to="/">
          <Button variant="primary" glyph>
            {t('common.notFoundCta')}
          </Button>
        </Link>
      </div>
    </section>
  );
}
