import { createContext, useContext } from 'react';
import type { Locale } from '@/data/types';
import type { TKey } from './shape';
import { translate, type Vars } from './translate';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatHours,
  formatMinutes,
  formatNumber,
  formatPercent,
  formatScore,
  formatWeekday,
} from '../format';

export interface I18nApi {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  /** Traducción con plurales e interpolación. */
  t: (key: TKey | (string & {}), vars?: Vars) => string;
  /** Formatos regionales atados al idioma activo. */
  f: {
    date: (value: string | Date) => string;
    dateShort: (value: string | Date) => string;
    dateTime: (value: string | Date) => string;
    weekday: (value: string | Date) => string;
    number: (value: number) => string;
    currency: (value: number | null | undefined) => string;
    hours: (minutes: number) => string;
    minutes: (minutes: number) => string;
    percent: (ratio: number, digits?: number) => string;
    score: (value: number | null, minimum?: number | null) => string;
  };
}

const noop = () => undefined;

export const I18nContext = createContext<I18nApi>({
  locale: 'es',
  setLocale: noop,
  toggleLocale: noop,
  t: (key, vars) => translate('es', key, vars),
  f: {
    date: (v) => formatDate(v, 'es'),
    dateShort: (v) => formatDateShort(v, 'es'),
    dateTime: (v) => formatDateTime(v, 'es'),
    weekday: (v) => formatWeekday(v, 'es'),
    number: (v) => formatNumber(v, 'es'),
    currency: (v) => formatCurrency(v, 'es'),
    hours: (v) => formatHours(v, 'es'),
    minutes: (v) => formatMinutes(v, 'es'),
    percent: (v, d) => formatPercent(v, 'es', d),
    score: (v, m) => formatScore(v, m),
  },
});

/** Hook único de idioma: `t()` para texto, `f` para fechas/números/moneda. */
export function useT(): I18nApi {
  return useContext(I18nContext);
}
