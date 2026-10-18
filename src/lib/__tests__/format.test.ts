import { describe, expect, it } from 'vitest';
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
} from '../format';
import { addDaysToDate, dateTimeInTz, daysBetween, localDate, localTime, startOfWeekMonday, weekdayOf } from '../dates';

describe('formatDate (§9.12)', () => {
  it('es-CO: 18 oct 2026', () => {
    expect(formatDate('2026-10-18', 'es')).toBe('18 oct 2026');
  });

  it('en-US: Oct 18, 2026', () => {
    expect(formatDate('2026-10-18', 'en')).toBe('Oct 18, 2026');
  });

  it('formatDateShort', () => {
    expect(formatDateShort('2026-10-18', 'es')).toBe('18 oct');
    expect(formatDateShort('2026-10-18', 'en')).toBe('Oct 18');
  });

  it('formatDateTime incluye la hora', () => {
    const value = formatDateTime('2026-10-18T23:30:00.000Z', 'en');
    expect(value).toContain('2026');
    expect(value).toMatch(/\d{2}:\d{2}/);
  });

  it('valores vacíos o inválidos devuelven un guion', () => {
    expect(formatDate('', 'es')).toBe('—');
    expect(formatDate('no-es-fecha', 'es')).toBe('—');
  });
});

describe('formatNumber', () => {
  it('miles con separador regional', () => {
    expect(formatNumber(1250, 'es')).toBe('1.250');
    expect(formatNumber(1250, 'en')).toBe('1,250');
  });
});

describe('formatCurrency (siempre USD)', () => {
  it('es: "150 US$" · en: "$150"', () => {
    expect(formatCurrency(150, 'es')).toBe('150 US$');
    expect(formatCurrency(150, 'en')).toBe('$150');
  });

  it('con decimales cuando hacen falta', () => {
    expect(formatCurrency(75.5, 'es')).toBe('75,5 US$');
    expect(formatCurrency(75.5, 'en')).toBe('$75.50');
  });

  it('null devuelve guion', () => {
    expect(formatCurrency(null, 'es')).toBe('—');
  });
});

describe('formatHours / formatMinutes / formatPercent / formatScore', () => {
  it('horas', () => {
    expect(formatHours(480, 'es')).toBe('8 h');
    expect(formatHours(480, 'en')).toBe('8h');
    expect(formatHours(90, 'es')).toBe('1,5 h');
    expect(formatHours(90, 'en')).toBe('1.5h');
  });

  it('minutos', () => {
    expect(formatMinutes(45, 'es')).toBe('45 min');
  });

  it('porcentaje con espacio en español', () => {
    expect(formatPercent(0.62, 'es')).toBe('62 %');
    expect(formatPercent(0.62, 'en')).toBe('62%');
  });

  it('puntaje en formato terminal', () => {
    expect(formatScore(737, 720)).toBe('737/720');
    expect(formatScore(null)).toBe('—');
    expect(formatScore(800)).toBe('800');
  });
});

describe('dates (zona America/Bogota)', () => {
  it('localDate respeta UTC-5', () => {
    // 2026-10-19T02:00Z = 2026-10-18 21:00 en Bogotá
    expect(localDate(new Date('2026-10-19T02:00:00.000Z'))).toBe('2026-10-18');
    expect(localTime(new Date('2026-10-19T02:00:00.000Z'))).toBe('21:00');
  });

  it('addDaysToDate cruza meses y años', () => {
    expect(addDaysToDate('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDate('2026-10-18', -30)).toBe('2026-09-18');
  });

  it('daysBetween cuenta días de calendario', () => {
    expect(daysBetween('2026-10-18', '2026-12-31')).toBe(74);
    expect(daysBetween('2026-10-18', '2026-10-18')).toBe(0);
    expect(daysBetween('2026-10-18', '2026-10-01')).toBe(-17);
  });

  it('startOfWeekMonday devuelve el lunes', () => {
    expect(startOfWeekMonday('2026-10-18')).toBe('2026-10-12'); // domingo → lunes anterior
    expect(startOfWeekMonday('2026-10-12')).toBe('2026-10-12');
    expect(startOfWeekMonday('2026-10-14')).toBe('2026-10-12');
  });

  it('weekdayOf: 0 domingo … 6 sábado', () => {
    expect(weekdayOf('2026-10-18')).toBe(0);
    expect(weekdayOf('2026-10-19')).toBe(1);
  });

  it('dateTimeInTz construye el instante UTC correcto (19:00 Bogotá = 00:00Z del día siguiente)', () => {
    expect(dateTimeInTz('2026-10-18', '19:00')).toBe('2026-10-19T00:00:00.000Z');
    expect(dateTimeInTz('2026-10-18', '08:30')).toBe('2026-10-18T13:30:00.000Z');
  });
});
