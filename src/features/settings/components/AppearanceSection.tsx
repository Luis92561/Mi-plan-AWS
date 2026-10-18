import { Card, CardBody, Field } from '@/components/ui/primitives';
import { usePrefs } from '@/app/prefs';
import type { Locale, Theme } from '@/data/types';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/useT';

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-[44px] rounded-input border px-3 text-ui transition-colors duration-hover sm:min-h-[36px]',
              active
                ? 'border-accent bg-accent font-medium text-accent-ink'
                : 'border-control text-muted hover:bg-hover hover:text-text',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Etiqueta + control + ayuda, sin `<label>` huérfano (el control es un grupo de botones). */
function Group({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      {children}
      <span className="text-meta text-muted">{hint}</span>
    </div>
  );
}

const MIN_SCALE = 90;
const MAX_SCALE = 130;
const SCALE_STEP = 5;

/**
 * Idioma, tema y tipografía (§7.14). Los mismos controles de la cabecera: usan
 * `usePrefs()`, así que se aplican al instante y sin recargar.
 */
export function AppearanceSection() {
  const { t } = useT();
  const { prefs, setLocale, setTheme, setFontMode, setFontScale } = usePrefs();
  const scale = Math.round(prefs.fontScale * 100);

  const themes: { value: Theme; label: string }[] = [
    { value: 'dark', label: t('common.theme.dark') },
    { value: 'light', label: t('common.theme.light') },
    { value: 'system', label: t('common.theme.system') },
  ];

  const locales: { value: Locale; label: string }[] = [
    { value: 'es', label: 'es' },
    { value: 'en', label: 'en' },
  ];

  const fonts: { value: 'terminal' | 'lectura'; label: string }[] = [
    { value: 'terminal', label: t('settings.appearance.fontTerminal') },
    { value: 'lectura', label: t('settings.appearance.fontLectura') },
  ];

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <p className="text-meta text-muted">{t('settings.appearance.hint')}</p>

        <Group label={t('settings.appearance.language')} hint={t('settings.appearance.languageHint')}>
          <Segmented
            label={t('settings.appearance.language')}
            value={prefs.locale}
            options={locales}
            onChange={setLocale}
          />
        </Group>

        <Group label={t('settings.appearance.theme')} hint={t('settings.appearance.themeHint')}>
          <Segmented
            label={t('settings.appearance.theme')}
            value={prefs.theme}
            options={themes}
            onChange={setTheme}
          />
        </Group>

        <Group label={t('settings.appearance.fontMode')} hint={t('settings.appearance.fontHint')}>
          <Segmented
            label={t('settings.appearance.fontMode')}
            value={prefs.fontMode}
            options={fonts}
            onChange={setFontMode}
          />
        </Group>

        <Field
          label={t('settings.appearance.scale')}
          htmlFor="settings-scale"
          hint={t('settings.appearance.scaleHint')}
        >
          <div className="flex items-center gap-3">
            <input
              id="settings-scale"
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={SCALE_STEP}
              value={scale}
              onChange={(event) => setFontScale(Number(event.target.value) / 100)}
              className="h-9 w-full max-w-xs accent-accent"
            />
            <output htmlFor="settings-scale" className="tnum shrink-0 text-ui text-text">
              {t('settings.appearance.scaleValue', { n: scale })}
            </output>
          </div>
        </Field>
      </CardBody>
    </Card>
  );
}
