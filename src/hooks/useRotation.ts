import { useMemo } from 'react';
import { AppConfig } from './useWingConfig';
import { ROOMS } from '../constants';
import { getWeekNumber, getEffectiveOffset, getMonthKey, getWeekKey } from '../utils/date';

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

  const dy = today.getDate();

  const weekKey = getWeekKey(today);
  const monthKey = getMonthKey(today);
  
  const pivotMo = dy >= 20 ? month + 1 : month;
  const pivotYr = pivotMo > 11 ? year + 1 : year;
  const normalizedMo = pivotMo % 12;
  const pivotMonthKey = `${pivotYr}-${String(normalizedMo + 1).padStart(2, '0')}`;
  
  const weeklyOffset = getEffectiveOffset(config.weeklyOffsets, weekKey, config.weeklyRotationOffset ?? 0);
  const fridgeOffset = getEffectiveOffset(config.fridgeOffsets, monthKey, config.monthlyRotationOffset ?? 0);
  const productsOffset = getEffectiveOffset(config.productsOffsets, pivotMonthKey, config.monthlyRotationOffset ?? 0);
  const absentRooms = config.absentRooms ?? [];
  const coletivoWeekends = config.coletivoWeekends ?? [];

  /**
   * Calcula o índice efetivo no array de quartos disponíveis, pulando quartos ausentes
   * sem duplicar o primeiro da fila, ajustando o tamanho do ciclo perfeitamente.
   */
  const getEffectiveRoom = (rawIndex: number): { room: string; effectiveIndex: number } => {
    const availableRooms = ROOMS.filter(r => !absentRooms.includes(r));
    if (availableRooms.length === 0) return { room: ROOMS[0], effectiveIndex: 0 };
    
    // rawIndex é o número total de períodos transcorridos + deslocamento (offset)
    const trueIndex = ((rawIndex % availableRooms.length) + availableRooms.length) % availableRooms.length;
    const selectedRoom = availableRooms[trueIndex];
    return { room: selectedRoom, effectiveIndex: ROOMS.indexOf(selectedRoom) };
  };

  /**
   * Calcula a rotação semanal (limpeza e manutenção).
   * Desconta semanas de coletivo do ciclo.
   */
  const weeklyRotation = useMemo(() => {
    const coletivoCount = coletivoWeekends.length;
    const effectiveWeek = weekNumber - coletivoCount;
    const rawIndex = effectiveWeek + 3 + weeklyOffset;
    return getEffectiveRoom(rawIndex);
  }, [weekNumber, weeklyOffset, absentRooms, coletivoWeekends.length]);

  /**
   * Calcula a rotação da limpeza da geladeira.
   */
  const fridgeRotation = useMemo(() => {
    const rawIndex = (year - 2024) * 12 + month + 2 + fridgeOffset;
    return getEffectiveRoom(rawIndex);
  }, [year, month, fridgeOffset, absentRooms]);

  /**
   * Calcula a rotação das compras de produtos.
   */
  const productsRotation = useMemo(() => {
    const rawIndex = (pivotYr - 2024) * 12 + normalizedMo + 2 + productsOffset;
    return getEffectiveRoom(rawIndex);
  }, [pivotYr, normalizedMo, productsOffset, absentRooms]);

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
  const fridgeRoom = fridgeRotation.room;

  /**
   * Retorna o quarto responsável por compras no mês atual.
   */
  const productsRoom = productsRotation.room;

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
    fridgeRotation,
    productsRotation,
    isColetivoWeek,
    getRoomForDay,
    weekNumber,
  };
}
