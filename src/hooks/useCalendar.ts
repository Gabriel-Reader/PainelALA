import { useMemo, useCallback } from 'react';
import { AppConfig } from './useWingConfig';
import { getWeekNumber } from '../utils/date';

/**
 * Representação de um dia no calendário com suas tarefas.
 */
export interface CalendarDay {
  day: number;
  tasks: DayTask[];
  isToday: boolean;
  isCurrentMonth: boolean;
  isManual: boolean;
}

/**
 * Tarefa atribuída a um dia.
 */
export interface DayTask {
  type: 'cleaning' | 'maintenance' | 'fridge' | 'products' | 'coletivo';
  room: string;
  label: string;
  color: string;
  isManual: boolean;
}

/**
 * Hook que gerencia a lógica do calendário mensal.
 */
export function useCalendar(
  config: AppConfig,
  viewDate: Date,
  today: Date,
  setViewDate: (d: Date) => void,
  onDayClick?: (day: number, taskType: string) => void,
) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [year, month]
  );

  const firstDay = useMemo(
    () => new Date(year, month, 1).getDay(),
    [year, month]
  );

  /**
   * Calcula as tarefas para cada dia do mês.
   */
  const getFinalDaysAndTasks = useCallback((): CalendarDay[] => {
    const result: CalendarDay[] = [];
    const coletivoWeekends = config.coletivoWeekends ?? [];
    const schedule = config.schedule ?? {};
    const cleaningDay = config.cleaningDay;
    const maintenanceDay = config.maintenanceDay;
    const fridgeCleaningDay = config.fridgeCleaningDay;
    const buyingProductsDay = config.buyingProductsDay;
    const weeklyOffset = config.weeklyRotationOffset ?? 0;
    const monthlyOffset = config.monthlyRotationOffset ?? 0;
    const absentRooms = config.absentRooms ?? [];
    const ROOMS = ['101', '102', '103', '104', '105'];

    const getEffectiveRoom = (rawIndex: number): string => {
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
      return ROOMS[0];
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dayOfWeek = currentDate.getDay();
      const weekNum = getWeekNumber(currentDate);
      const dayStr = String(day);
      const tasks: DayTask[] = [];
      let isManual = false;

      // Verifica se é coletivo nesta semana
      const isColetivo = coletivoWeekends.some((cw) => {
        const cwDate = new Date(cw);
        return getWeekNumber(cwDate) === weekNum;
      });

      // --- Limpeza (sex, sáb, dom, seg) ---
      if ([5, 6, 0, 1].includes(dayOfWeek)) {
        const coletivoCount = coletivoWeekends.length;
        const effectiveWeek = weekNum - coletivoCount;
        const rawIndex = ((effectiveWeek + 3 + weeklyOffset) % ROOMS.length + ROOMS.length) % ROOMS.length;
        const room = getEffectiveRoom(rawIndex);

        if (isColetivo) {
          tasks.push({ type: 'coletivo', room: 'Coletivo', label: 'Coletivo', color: 'emerald', isManual: false });
        } else {
          const hasManual = cleaningDay !== undefined && cleaningDay !== null && String(cleaningDay) === dayStr;
          if (hasManual) {
            isManual = true;
            const manualRoom = schedule[dayStr] ?? room;
            tasks.push({ type: 'cleaning', room: manualRoom, label: `Limpeza (${manualRoom})`, color: 'sky', isManual: true });
          } else {
            tasks.push({ type: 'cleaning', room, label: `Limpeza (${room})`, color: 'sky', isManual: false });
          }
        }
      }

      // --- Manutenção (qua, qui) ---
      if ([3, 4].includes(dayOfWeek) && !isColetivo) {
        const coletivoCount = coletivoWeekends.length;
        const effectiveWeek = weekNum - coletivoCount;
        const rawIndex = ((effectiveWeek + 3 + weeklyOffset) % ROOMS.length + ROOMS.length) % ROOMS.length;
        const room = getEffectiveRoom(rawIndex);

        const hasManual = maintenanceDay !== undefined && maintenanceDay !== null && String(maintenanceDay) === dayStr;
        if (hasManual) {
          isManual = true;
          const manualRoom = schedule[dayStr] ?? room;
          tasks.push({ type: 'maintenance', room: manualRoom, label: `Manutenção (${manualRoom})`, color: 'amber', isManual: true });
        } else {
          tasks.push({ type: 'maintenance', room, label: `Manutenção (${room})`, color: 'amber', isManual: false });
        }
      }

      // --- Limpeza Geladeira (qui entre 15-21) ---
      if (dayOfWeek === 4 && day >= 15 && day <= 21) {
        const rawIndex = ((year - 2024) * 12 + month + 2 + monthlyOffset) % ROOMS.length;
        const normalized = ((rawIndex % ROOMS.length) + ROOMS.length) % ROOMS.length;
        const room = getEffectiveRoom(normalized);

        const hasManual = fridgeCleaningDay !== undefined && fridgeCleaningDay !== null && String(fridgeCleaningDay) === dayStr;
        if (hasManual) {
          isManual = true;
          const manualRoom = schedule[dayStr] ?? room;
          tasks.push({ type: 'fridge', room: manualRoom, label: `Geladeira (${manualRoom})`, color: 'teal', isManual: true });
        } else {
          tasks.push({ type: 'fridge', room, label: `Geladeira (${room})`, color: 'teal', isManual: false });
        }
      }

      // --- Compras (dia 1) ---
      if (day === 1) {
        const rawIndex = ((year - 2024) * 12 + month + 2 + monthlyOffset) % ROOMS.length;
        const normalized = ((rawIndex % ROOMS.length) + ROOMS.length) % ROOMS.length;
        const room = getEffectiveRoom(normalized);

        const hasManual = buyingProductsDay !== undefined && buyingProductsDay !== null && String(buyingProductsDay) === dayStr;
        if (hasManual) {
          isManual = true;
          const manualRoom = schedule[dayStr] ?? room;
          tasks.push({ type: 'products', room: manualRoom, label: `Compras (${manualRoom})`, color: 'pink', isManual: true });
        } else {
          tasks.push({ type: 'products', room, label: `Compras (${room})`, color: 'pink', isManual: false });
        }
      }

      result.push({
        day,
        tasks,
        isToday: day === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
        isCurrentMonth: true,
        isManual,
      });
    }

    return result;
  }, [year, month, daysInMonth, today, config]);

  const handlePrevMonth = useCallback(() => {
    setViewDate(new Date(year, month - 1, 1));
  }, [year, month, setViewDate]);

  const handleNextMonth = useCallback(() => {
    setViewDate(new Date(year, month + 1, 1));
  }, [year, month, setViewDate]);

  const handleClearMonth = useCallback(() => {
    // Limpa apenas escalas manuais do mês atual
    const newSchedule = { ...(config.schedule ?? {}) };
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    Object.keys(newSchedule).forEach((key) => {
      // Remove chaves que são números (dias do mês) — formato legado
      if (/^\d{1,2}$/.test(key)) {
        delete newSchedule[key];
      }
    });
    return newSchedule;
  }, [year, month, config.schedule]);

  return {
    daysInMonth,
    firstDay,
    getFinalDaysAndTasks,
    handlePrevMonth,
    handleNextMonth,
    handleClearMonth,
  };
}
