import { useMemo } from 'react';
import { AppConfig } from './useWingConfig';
import { ROOMS } from '../constants';
import { getWeekNumber } from '../utils/date';

/**
 * Resultado de uma rotação calculada.
 */
export interface RotationResult {
  room: string;
  index: number;
  isManual: boolean;
  manualDate?: string;
}

/**
 * Hook que calcula as rotações semanal e mensal de quartos.
 *
 * - Semanal: limpeza (sex-seg) e manutenção (qua-qui)
 * - Mensal: geladeira (qui 15-21) e compras (dia 1)
 */
export function useRotation(config: AppConfig, today: Date) {
  const weekNumber = getWeekNumber(today);
  const year = today.getFullYear();
  const month = today.getMonth();

  const weeklyOffset = config.weeklyRotationOffset ?? 0;
  const monthlyOffset = config.monthlyRotationOffset ?? 0;
  const absentRooms = config.absentRooms ?? [];
  const coletivoWeekends = config.coletivoWeekends ?? [];

  /**
   * Calcula o índice efetivo no array ROOMS, pulando quartos ausentes.
   * Retorna o quarto e o índice real.
   */
  const getEffectiveRoom = (rawIndex: number): { room: string; effectiveIndex: number } => {
    let count = 0;
    let idx = ((rawIndex % ROOMS.length) + ROOMS.length) % ROOMS.length;
    const visited = new Set<number>();

    while (visited.size < ROOMS.length) {
      if (!absentRooms.includes(ROOMS[idx])) {
        if (count === 0) {
          return { room: ROOMS[idx], effectiveIndex: idx };
        }
        count--;
      }
      visited.add(idx);
      idx = (idx + 1) % ROOMS.length;
    }

    // Fallback: todos ausentes
    return { room: ROOMS[0], effectiveIndex: 0 };
  };

  /**
   * Calcula a rotação semanal (limpeza e manutenção).
   * Desconta semanas de coletivo do ciclo.
   */
  const weeklyRotation = useMemo(() => {
    const coletivoCount = coletivoWeekends.length;
    const effectiveWeek = weekNumber - coletivoCount;
    const rawIndex = ((effectiveWeek + 3 + weeklyOffset) % ROOMS.length + ROOMS.length) % ROOMS.length;
    return getEffectiveRoom(rawIndex);
  }, [weekNumber, weeklyOffset, absentRooms, coletivoWeekends.length]);

  /**
   * Calcula a rotação mensal (geladeira e compras).
   */
  const monthlyRotation = useMemo(() => {
    const rawIndex = ((year - 2024) * 12 + month + 2 + monthlyOffset) % ROOMS.length;
    const normalized = ((rawIndex % ROOMS.length) + ROOMS.length) % ROOMS.length;
    return getEffectiveRoom(normalized);
  }, [year, month, monthlyOffset, absentRooms]);

  /**
   * Retorna o quarto responsável por limpeza na semana atual.
   */
  const cleaningRoom = weeklyRotation.room;

  /**
   * Retorna o quarto responsável por manutenção na semana atual.
   */
  const maintenanceRoom = weeklyRotation.room;

  /**
   * Retorna o quarto responsável por limpeza da geladeira no mês atual.
   */
  const fridgeRoom = monthlyRotation.room;

  /**
   * Retorna o quarto responsável por compras no mês atual.
   */
  const productsRoom = monthlyRotation.room;

  /**
   * Verifica se uma data específica é um fim de semana coletivo.
   */
  const isColetivoWeek = (date: Date): boolean => {
    const weekNum = getWeekNumber(date);
    return coletivoWeekends.some((cw) => {
      const cwDate = new Date(cw);
      return getWeekNumber(cwDate) === weekNum;
    });
  };

  /**
   * Calcula o quarto para um dia específico, considerando escala manual.
   */
  const getRoomForDay = (
    dayNum: number,
    manualDay: string | number | undefined,
    autoRoom: string,
    _taskType: string
  ): RotationResult => {
    const dayStr = String(dayNum);

    // Escala manual tem prioridade
    if (manualDay !== undefined && manualDay !== null && String(manualDay) === dayStr) {
      return { room: config.schedule?.[dayStr] ?? autoRoom, index: -1, isManual: true, manualDate: dayStr };
    }

    return { room: autoRoom, index: weeklyRotation.effectiveIndex, isManual: false };
  };

  return {
    cleaningRoom,
    maintenanceRoom,
    fridgeRoom,
    productsRoom,
    weeklyRotation,
    monthlyRotation,
    isColetivoWeek,
    getRoomForDay,
    weekNumber,
  };
}
