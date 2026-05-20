import { describe, it, expect } from 'vitest';

// Replicamos a lógica de getEffectiveRoom para testar isoladamente
const ROOMS = ['101', '102', '103', '104', '105'] as const;

function getEffectiveRoom(rawIndex: number, absentRooms: string[]): string {
  let count = 0;
  let idx = ((rawIndex % ROOMS.length) + ROOMS.length) % ROOMS.length;
  const visited = new Set<number>();

  while (visited.size < ROOMS.length) {
    if (!absentRooms.includes(ROOMS[idx])) {
      if (count === 0) return ROOMS[idx];
      count--;
    }
    visited.add(idx);
    idx = (idx + 1) % ROOMS.length;
  }
  return ROOMS[0]; // fallback
}

// Simula a rotação semanal
function getWeeklyRoom(weekNumber: number, offset: number, absentRooms: string[]): string {
  const rawIndex = ((weekNumber + 3 + offset) % ROOMS.length + ROOMS.length) % ROOMS.length;
  return getEffectiveRoom(rawIndex, absentRooms);
}

// Simula a rotação mensal
function getMonthlyRoom(year: number, month: number, offset: number, absentRooms: string[]): string {
  const rawIndex = ((year - 2024) * 12 + month + 2 + offset) % ROOMS.length;
  const normalized = ((rawIndex % ROOMS.length) + ROOMS.length) % ROOMS.length;
  return getEffectiveRoom(normalized, absentRooms);
}

describe('getEffectiveRoom', () => {
  it('deve retornar o quarto correto sem ausências', () => {
    expect(getEffectiveRoom(0, [])).toBe('101');
    expect(getEffectiveRoom(1, [])).toBe('102');
    expect(getEffectiveRoom(4, [])).toBe('105');
  });

  it('deve pular quarto ausente e usar o próximo', () => {
    expect(getEffectiveRoom(0, ['101'])).toBe('102');
    expect(getEffectiveRoom(0, ['101', '102'])).toBe('103');
  });

  it('deve fazer wrap-around', () => {
    expect(getEffectiveRoom(5, [])).toBe('101');
    expect(getEffectiveRoom(6, [])).toBe('102');
  });

  it('deve lidar com índice negativo', () => {
    expect(getEffectiveRoom(-1, [])).toBe('105');
    expect(getEffectiveRoom(-5, [])).toBe('101');
  });

  it('deve pular múltiplos ausentes consecutivos', () => {
    expect(getEffectiveRoom(0, ['101', '102', '103'])).toBe('104');
  });

  it('deve retornar o único quarto disponível', () => {
    expect(getEffectiveRoom(0, ['101', '102', '103', '104'])).toBe('105');
  });

  it('deve retornar fallback quando todos ausentes', () => {
    expect(getEffectiveRoom(0, ['101', '102', '103', '104', '105'])).toBe('101');
  });
});

describe('getWeeklyRoom', () => {
  it('deve retornar quartos em rotação sequencial', () => {
    const absent: string[] = [];
    const room0 = getWeeklyRoom(0, 0, absent);
    const room1 = getWeeklyRoom(1, 0, absent);
    const room2 = getWeeklyRoom(2, 0, absent);

    // Devem ser quartos diferentes (com offset +3)
    expect(room0).not.toBe(room1);
    expect(room1).not.toBe(room2);
  });

  it('deve respeitar o offset', () => {
    const absent: string[] = [];
    const roomNoOffset = getWeeklyRoom(5, 0, absent);
    const roomWithOffset = getWeeklyRoom(5, 1, absent);

    // Com offset diferente, o quarto deve ser diferente
    expect(roomNoOffset).not.toBe(roomWithOffset);
  });

  it('deve pular ausentes na rotação semanal', () => {
    const absent = ['104'];
    // Sem offset, semana 0: rawIndex = (0+3+0)%5 = 3 → quarto[3] = 104 (ausente) → deve pular para 105
    expect(getWeeklyRoom(0, 0, absent)).toBe('105');
  });

  it('deve ciclar corretamente após 5 semanas', () => {
    const absent: string[] = [];
    // Com offset 0, a cada 5 semanas o ciclo deve se repetir
    const roomWeek0 = getWeeklyRoom(0, 0, absent);
    const roomWeek5 = getWeeklyRoom(5, 0, absent);
    expect(roomWeek0).toBe(roomWeek5);
  });
});

describe('getMonthlyRoom', () => {
  it('deve retornar quartos diferentes para meses consecutivos', () => {
    const absent: string[] = [];
    const jan = getMonthlyRoom(2024, 0, 0, absent); // janeiro
    const fev = getMonthlyRoom(2024, 1, 0, absent); // fevereiro
    expect(jan).not.toBe(fev);
  });

  it('deve ciclar após vários meses', () => {
    const absent: string[] = [];
    const jan2024 = getMonthlyRoom(2024, 0, 0, absent);
    // 5 meses depois deve voltar ao mesmo quarto (5 quartos no ciclo)
    const jun2024 = getMonthlyRoom(2024, 5, 0, absent);
    expect(jan2024).toBe(jun2024);
  });

  it('deve pausar ausentes na rotação mensal', () => {
    const absent = ['103'];
    // rawIndex para jan/2024 com offset 0: (0*12 + 0 + 2 + 0) % 5 = 2 → quarto[2] = 103 (ausente) → pula para 104
    expect(getMonthlyRoom(2024, 0, 0, absent)).toBe('104');
  });
});
