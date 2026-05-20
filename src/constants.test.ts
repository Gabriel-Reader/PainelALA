import { describe, it, expect } from 'vitest';
import { ROOMS, ALL_ROOMS, ALLOWED_DAYS } from './constants';

describe('ROOMS', () => {
  it('deve conter 5 quartos', () => {
    expect(ROOMS).toHaveLength(5);
  });

  it('deve conter os quartos 101 a 105', () => {
    expect(ROOMS).toEqual(['101', '102', '103', '104', '105']);
  });

  it('não deve conter Coletivo', () => {
    expect(ROOMS).not.toContain('Coletivo');
  });
});

describe('ALL_ROOMS', () => {
  it('deve conter 6 entradas (5 quartos + Coletivo)', () => {
    expect(ALL_ROOMS).toHaveLength(6);
  });

  it('deve incluir Coletivo', () => {
    expect(ALL_ROOMS).toContain('Coletivo');
  });
});

describe('ALLOWED_DAYS', () => {
  it('limpeza deve permitir sex, sáb, dom, seg', () => {
    expect(ALLOWED_DAYS.cleaning).toEqual([5, 6, 0, 1]);
  });

  it('manutenção deve permitir qua, qui', () => {
    expect(ALLOWED_DAYS.maintenance).toEqual([3, 4]);
  });

  it('geladeira deve permitir apenas quinta', () => {
    expect(ALLOWED_DAYS.fridge).toEqual([4]);
  });

  it('coletivo deve permitir sex, sáb, dom, seg', () => {
    expect(ALLOWED_DAYS.coletivo).toEqual([5, 6, 0, 1]);
  });
});
