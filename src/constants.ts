/**
 * Lista de quartos da ala (excluindo Coletivo que é tratado separadamente).
 */
export const ROOMS = ['101', '102', '103', '104', '105'] as const;

export type Room = (typeof ROOMS)[number];

/**
 * Lista completa incluindo Coletivo.
 */
export const ALL_ROOMS = [...ROOMS, 'Coletivo'] as const;

/**
 * Dias da semana para validação de escalas.
 * Cada atividade tem dias permitidos:
 * - Limpeza: sexta a segunda (5, 6, 0, 1)
 * - Manutenção: quarta a quinta (3, 4)
 * - Limpeza Geladeira: quinta entre dias 15-21 (4, dia 15-21)
 * - Compras: dia 1 do mês
 */
export const ALLOWED_DAYS: Record<string, number[]> = {
  cleaning: [5, 6, 0, 1],       // sex, sáb, dom, seg
  maintenance: [3, 4],           // qua, qui
  fridge: [4],                   // qui
  products: [],                  // qualquer dia (dia 1 do mês)
  coletivo: [5, 6, 0, 1],       // sex, sáb, dom, seg
};

/**
 * Mapeamento de tipo de atividade para cor.
 */
export const ACTIVITY_COLORS: Record<string, string> = {
  cleaning: 'sky',
  maintenance: 'amber',
  fridge: 'teal',
  products: 'pink',
  coletivo: 'emerald',
};
