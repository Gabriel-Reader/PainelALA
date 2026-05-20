import { useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AppConfig } from './useWingConfig';
import { getWeekNumber, getMonthKey } from '../utils/date';
import { format } from 'date-fns';

/** Retorna a chave da semana no formato "W{year}-{weekNum}" (igual ao App.tsx) */
function buildWeekKey(date: Date): string {
  const weekNum = getWeekNumber(date);
  return `W${date.getFullYear()}-${weekNum}`;
}

/**
 * Hook que gerencia o snapshot semanal automático.
 * Toda quinta-feira, salva um snapshot da semana anterior no Firestore.
 */
export function useSnapshot(
  config: AppConfig,
  today: Date,
  isDev: boolean,
  isGabriel: boolean,
) {
  const lastSnapshotWeek = useRef<number>(-1);
  const lastDailySnapshot = useRef<string>('');

  const takeWeeklySnapshot = useCallback(async () => {
    const weekNum = getWeekNumber(today);
    const weekKey = buildWeekKey(today);
    const monthKey = getMonthKey(today);

    if (lastSnapshotWeek.current === weekNum) return;

    try {
      const snapshotRef = doc(db, 'history', weekKey);
      const existing = await getDoc(snapshotRef);

      if (existing.exists()) {
        lastSnapshotWeek.current = weekNum;
        return;
      }

      const weekData: Record<string, unknown> = {
        type: 'weekly',
        weekKey,
        monthKey,
        weekNumber: weekNum,
        year: today.getFullYear(),
        createdAt: serverTimestamp(),
        config: {
          cleaningResponsible: config.cleaningResponsible,
          maintenanceResponsible: config.maintenanceResponsible,
          fridgeCleaningResponsible: config.fridgeCleaningResponsible,
          buyingProductsResponsible: config.buyingProductsResponsible,
          cleaningDay: config.cleaningDay,
          maintenanceDay: config.maintenanceDay,
          fridgeCleaningDay: config.fridgeCleaningDay,
          buyingProductsDay: config.buyingProductsDay,
          schedule: config.schedule,
          weeklyRotationOffset: config.weeklyRotationOffset,
          monthlyRotationOffset: config.monthlyRotationOffset,
          absentRooms: config.absentRooms,
          coletivoWeekends: config.coletivoWeekends,
        },
      };

      await setDoc(snapshotRef, weekData);
      lastSnapshotWeek.current = weekNum;
      console.log(`[Snapshot] Backup semanal (escalas) realizado: ${weekKey}`);
    } catch (err) {
      console.error('[Snapshot] Erro no backup semanal:', err);
    }
  }, [today, config]);

  const takeDailyProductsSnapshot = useCallback(async () => {
    const dayStr = format(today, 'yyyy-MM-dd');
    if (lastDailySnapshot.current === dayStr) return;

    try {
      const docId = `products-${dayStr}`;
      const snapshotRef = doc(db, 'history', docId);
      const existing = await getDoc(snapshotRef);

      if (existing.exists()) {
        lastDailySnapshot.current = dayStr;
        return;
      }

      await setDoc(snapshotRef, {
        type: 'products_daily',
        date: dayStr,
        monthKey: getMonthKey(today),
        products: config.products || [],
        fundBalance: config.fundBalance || 0,
        createdAt: serverTimestamp()
      });
      
      lastDailySnapshot.current = dayStr;
      console.log(`[Snapshot] Backup diário (produtos/caixinha) realizado: ${dayStr}`);
    } catch (err) {
      console.error('[Snapshot] Erro no backup diário de produtos:', err);
    }
  }, [today, config.products, config.fundBalance]);

  useEffect(() => {
    if (isDev || !isGabriel) return;

    // 1. Backup SEMANAL das escalas (apenas às quintas-feiras, como antes)
    if (today.getDay() === 4) {
      takeWeeklySnapshot();
    }

    // 2. Backup DIÁRIO apenas de produtos e caixinha (24h)
    takeDailyProductsSnapshot();

  }, [today, isDev, isGabriel, takeWeeklySnapshot, takeDailyProductsSnapshot]);

  return { takeSnapshot: takeWeeklySnapshot };
}
