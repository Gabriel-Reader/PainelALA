import { getISOWeek, addDays, startOfWeek, endOfWeek, format } from 'date-fns';

/**
 * Data de referência para cálculo de semanas ISO.
 * Quinta-feira, 4 de janeiro de 2024 — semana 1 do ciclo.
 */
export const EPOCH_REFERENCE_DATE = new Date(2024, 0, 4, 12, 0, 0, 0);

/**
 * Retorna o número da semana ISO relativo à época de referência.
 * Cada semana vai de quinta a quarta.
 */
export function getWeekNumber(date: Date): number {
  const targetThursday = startOfWeek(date, { weekStartsOn: 4 });
  // Normalizar ambas para meio-dia UTC para evitar problemas de horário/UTC
  const targetNoon = Date.UTC(targetThursday.getFullYear(), targetThursday.getMonth(), targetThursday.getDate(), 12);
  const epochNoon = Date.UTC(EPOCH_REFERENCE_DATE.getFullYear(), EPOCH_REFERENCE_DATE.getMonth(), EPOCH_REFERENCE_DATE.getDate(), 12);
  return Math.round((targetNoon - epochNoon) / (7 * 86400000));
}

/**
 * Retorna o intervalo de datas (sexta a quarta) de uma semana ISO.
 */
export function getWeekDateRange(weekNumber: number): { start: Date; end: Date } {
  const startThu = addDays(EPOCH_REFERENCE_DATE, weekNumber * 7);
  const startFri = addDays(startThu, 1);
  const endWed = addDays(startThu, 6);
  return { start: startFri, end: endWed };
}

/**
 * Formata uma data como "dd/mm/yy".
 */
export function formatShortDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString().substring(2);
  return `${d}/${m}/${y}`;
}

/**
 * Formata uma data ISO "YYYY-MM-DD" como "dd/mm/yy".
 */
export function formatISODateShort(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y.substring(2)}`;
}

/**
 * Retorna a chave da semana no formato "YYYY-WW".
 */
export function getWeekKey(date: Date): string {
  const weekNum = getWeekNumber(date);
  const year = date.getFullYear();
  return `${year}-${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Retorna a chave do mês no formato "YYYY-MM".
 */
export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

/**
 * Verifica se uma data (dia do mês) cai em um determinado dia da semana.
 * dayOfWeek: 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sáb
 */
export function isDayOfWeek(year: number, month: number, day: number, dayOfWeek: number): boolean {
  const date = new Date(year, month, day);
  return date.getDay() === dayOfWeek;
}

/**
 * Retorna o dia da semana de uma data.
 * 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sáb
 */
export function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month, day).getDay();
}
