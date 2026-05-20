import { describe, it, expect } from 'vitest';
import { getWeekNumber, EPOCH_REFERENCE_DATE, getWeekDateRange, formatISODateShort, getWeekKey, getMonthKey } from './date';

describe('getWeekNumber', () => {
  it('deve retornar 0 para a semana de referência (04/01/2024)', () => {
    // 04/01/2024 é quinta-feira, início da semana 0
    expect(getWeekNumber(new Date(2024, 0, 4))).toBe(0);
  });

  it('deve retornar 0 para sexta-feira da semana de referência', () => {
    expect(getWeekNumber(new Date(2024, 0, 5))).toBe(0);
  });

  it('deve retornar 0 para quarta-feira da semana de referência', () => {
    expect(getWeekNumber(new Date(2024, 0, 10))).toBe(0);
  });

  it('deve retornar 1 para a semana seguinte', () => {
    expect(getWeekNumber(new Date(2024, 0, 11))).toBe(1);
  });

  it('deve retornar números negativos para datas antes da referência', () => {
    expect(getWeekNumber(new Date(2023, 11, 28))).toBe(-1);
  });

  it('deve retornar 52 para um ano depois', () => {
    // ~52 semanas em um ano
    const weekNum = getWeekNumber(new Date(2025, 0, 1));
    expect(weekNum).toBeGreaterThanOrEqual(50);
    expect(weekNum).toBeLessThanOrEqual(54);
  });

  it('deve ser consistente ao longo de uma semana', () => {
    // Todos os dias da mesma semana devem retornar o mesmo número
    const week4 = getWeekNumber(new Date(2024, 0, 25)); // quinta
    expect(getWeekNumber(new Date(2024, 0, 26))).toBe(week4); // sex
    expect(getWeekNumber(new Date(2024, 0, 27))).toBe(week4); // sáb
    expect(getWeekNumber(new Date(2024, 0, 28))).toBe(week4); // dom
    expect(getWeekNumber(new Date(2024, 0, 29))).toBe(week4); // seg
    expect(getWeekNumber(new Date(2024, 0, 30))).toBe(week4); // ter
    expect(getWeekNumber(new Date(2024, 0, 31))).toBe(week4); // qua
  });
});

describe('getWeekDateRange', () => {
  it('deve retornar sexta a quarta para semana 0', () => {
    const { start, end } = getWeekDateRange(0);
    expect(start.getDate()).toBe(5); // sexta
    expect(start.getMonth()).toBe(0);
    expect(end.getDate()).toBe(10); // quarta
    expect(end.getMonth()).toBe(0);
  });

  it('deve retornar datas com 5 dias de diferença (sexta a quarta)', () => {
    const { start, end } = getWeekDateRange(3);
    const diffDays = (end.getTime() - start.getTime()) / 86400000;
    expect(diffDays).toBe(5);
  });
});

describe('formatISODateShort', () => {
  it('deve formatar data ISO corretamente', () => {
    expect(formatISODateShort('2024-03-15')).toBe('15/03/24');
  });

  it('deve retornar string vazia para entrada vazia', () => {
    expect(formatISODateShort('')).toBe('');
  });

  it('deve formatar datas com mês de 2 dígitos', () => {
    expect(formatISODateShort('2024-12-01')).toBe('01/12/24');
  });
});

describe('getWeekKey', () => {
  it('deve retornar formato YYYY-WW', () => {
    const key = getWeekKey(new Date(2024, 0, 4));
    expect(key).toMatch(/^2024-\d{2}$/);
  });
});

describe('getMonthKey', () => {
  it('deve retornar formato YYYY-MM', () => {
    expect(getMonthKey(new Date(2024, 0, 1))).toBe('2024-01');
    expect(getMonthKey(new Date(2024, 11, 1))).toBe('2024-12');
  });
});
