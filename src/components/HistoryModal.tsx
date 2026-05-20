import React, { useState, useEffect, useRef } from 'react';
import { X, History, ChevronLeft, ChevronRight, CalendarCheck, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ConfirmModal } from './ConfirmModal';
import { EPOCH_REFERENCE_DATE, formatISODateShort } from '../utils/date';
import { showToast } from './Toast';

interface HistoryRecord {
  weekKey: string;
  dayKey?: string;
  monthKey: string;
  year: number;
  weekNumber: number;
  config?: {
    cleaningResponsible?: string;
    maintenanceResponsible?: string;
    fridgeCleaningResponsible?: string;
    buyingProductsResponsible?: string;
    cleaningDay?: string;
    maintenanceDay?: string;
    fridgeCleaningDay?: string;
    buyingProductsDay?: string;
  };
  cleaningRoom?: string;
  maintenanceRoom?: string;
  fridgeRoom?: string;
  productsRoom?: string;
  cleaningExactDate?: string;
  maintenanceExactDate?: string;
  fridgeExactDate?: string;
  productsExactDate?: string;
  savedAt: any;
  createdAt: any;
}

interface HistoryModalProps {
  onClose: () => void;
  today: Date;
  isDev: boolean;
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Cache simples em memória para evitar re-fetches desnecessários
const historyCache = new Map<string, HistoryRecord[]>();

export function HistoryModal({ onClose, today, isDev }: HistoryModalProps) {
  const [currentDate, setCurrentDate] = useState(today);
  const [logs, setLogs] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const monthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
  const monthName = `${MONTH_NAMES[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;

  useEffect(() => {
    // 1. Se já está no cache em memória JS (mudou rápido de mês), lê dele imediatamente
    if (historyCache.has(monthKey)) {
      setLogs(historyCache.get(monthKey)!);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2. Query otimizada: usa índice composto (monthKey + weekNumber DESC)
    const q = query(
      collection(db, 'history'),
      where('monthKey', '==', monthKey),
      orderBy('weekNumber', 'desc')
    );

    // 3. onSnapshot lê dados locais (IndexedDB) instantaneamente (tempo <10ms)
    // e atualiza em tempo real se novos dados chegarem do servidor Firestore.
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data: HistoryRecord[] = [];
        querySnapshot.forEach((docSnap) => {
          const docData = docSnap.data() as HistoryRecord;
          // Exibe apenas registros semanais (ignora backups diários de produtos)
          if (docData.type === 'weekly' || !(docData as any).type) {
            data.push(docData);
          }
        });

        // Atualiza os caches e estado
        historyCache.set(monthKey, data);
        setLogs(data);
        setLoading(false);
      },
      (e) => {
        console.error('Error fetching history:', e);
        showToast('Erro ao carregar histórico. Tente novamente.', 'error');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [monthKey]);

  const confirmDeleteMonth = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'history'), where('monthKey', '==', monthKey));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(document => deleteDoc(doc(db, 'history', document.id)));
      await Promise.all(deletePromises);
      // Limpa o cache do mês deletado
      historyCache.delete(monthKey);
      setLogs([]);
      localStorage.removeItem('saved_snapshot_week');
    } catch (e) {
      console.error('Erro ao deletar histórico:', e);
      showToast('Erro ao apagar histórico. Verifique se você tem permissão.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const formatDate = (dateStr: string | undefined) => dateStr ? formatISODateShort(dateStr) : '---';

  const getWeekDateRange = (weekNumber: number) => {
    const startThu = new Date(EPOCH_REFERENCE_DATE.getTime() + weekNumber * 7 * 86400000);
    const startFri = new Date(startThu.getTime() + 1 * 86400000);
    const endWed = new Date(startThu.getTime() + 6 * 86400000);
    const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${fmt(startFri)} a ${fmt(endWed)}`;
  };

  const firstLog = logs.length > 0 ? logs[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-2 text-neutral-200">
            <History className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-lg">Histórico de Atividades</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-neutral-950/50 border-b border-neutral-800">
          <button onClick={handlePrevMonth} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-neutral-400" />
            <span className="font-bold text-neutral-200 uppercase tracking-wider">{monthName}</span>
            {isDev && logs.length > 0 && (
              <button onClick={() => setIsDeleteModalOpen(true)} className="ml-1 p-1 rounded bg-red-950/40 text-red-500 hover:bg-red-900/60 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button onClick={handleNextMonth} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-12 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-500 border-r-2 border-r-transparent"></div>
              <p className="text-xs text-neutral-500">Carregando histórico...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500">Nenhum histórico registrado em {monthName}.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {firstLog && (
                <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-neutral-400 mb-3 uppercase tracking-widest text-center">Atividades Mensais</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-pink-950/20 border border-pink-900/30 rounded-lg p-3 flex flex-col items-center text-center">
                      <p className="text-[10px] text-pink-400/80 font-bold uppercase mb-0.5">Comprar Produtos</p>
                      <p className="font-black text-pink-100 text-lg">
                        {(firstLog.config?.buyingProductsResponsible || firstLog.productsRoom) === 'Coletivo' ? 'Coletivo' : `Quarto ${firstLog.config?.buyingProductsResponsible || firstLog.productsRoom || '?'}`}
                      </p>
                      <div className="text-[10px] text-neutral-400">Data: {formatDate(firstLog.config?.buyingProductsDay || firstLog.productsExactDate)}</div>
                    </div>
                    <div className="bg-teal-950/20 border border-teal-900/30 rounded-lg p-3 flex flex-col items-center text-center">
                      <p className="text-[10px] text-teal-400/80 font-bold uppercase mb-0.5">Limp. Geladeira</p>
                      <p className="font-black text-teal-100 text-lg">
                        {(firstLog.config?.fridgeCleaningResponsible || firstLog.fridgeRoom) === 'Coletivo' ? 'Coletivo' : `Quarto ${firstLog.config?.fridgeCleaningResponsible || firstLog.fridgeRoom || '?'}`}
                      </p>
                      <div className="text-[10px] text-neutral-400">Data: {formatDate(firstLog.config?.fridgeCleaningDay || firstLog.fridgeExactDate)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-neutral-400 mb-3 uppercase tracking-widest text-center">Atividades Semanais</h3>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.weekKey || log.dayKey} className="bg-neutral-800/40 rounded-xl p-4 border border-neutral-700/50">
                      <div className="mb-3 border-b border-neutral-700/50 pb-2">
                        <span className="bg-neutral-700/80 px-2.5 py-1 rounded-md text-xs font-bold text-neutral-200">
                          Semana: {getWeekDateRange(log.weekNumber)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex justify-between items-center bg-sky-950/10 border border-sky-900/20 p-2.5 rounded-lg">
                          <div>
                            <p className="text-[9px] text-sky-400/70 font-bold uppercase leading-none">Limpeza</p>
                            <p className="font-bold text-sky-100 text-sm mt-1">
                              {(log.config?.cleaningResponsible || log.cleaningRoom) === 'Coletivo' ? 'Coletivo' : `Quarto ${log.config?.cleaningResponsible || log.cleaningRoom || '?'}`}
                            </p>
                          </div>
                          <span className="text-[10px] text-neutral-500 bg-neutral-900/50 px-1.5 py-0.5 rounded">
                            {formatDate(log.config?.cleaningDay || log.cleaningExactDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-amber-950/10 border border-amber-900/20 p-2.5 rounded-lg">
                          <div>
                            <p className="text-[9px] text-amber-400/70 font-bold uppercase leading-none">Manutenção</p>
                            <p className="font-bold text-amber-100 text-sm mt-1">
                              {(log.config?.maintenanceResponsible || log.maintenanceRoom) === 'Coletivo' ? 'Coletivo' : `Quarto ${log.config?.maintenanceResponsible || log.maintenanceRoom || '?'}`}
                            </p>
                          </div>
                          <span className="text-[10px] text-neutral-500 bg-neutral-900/50 px-1.5 py-0.5 rounded">
                            {formatDate(log.config?.maintenanceDay || log.maintenanceExactDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={isDeleteModalOpen} title="Apagar Histórico" message={`Deseja apagar o histórico de ${monthName}?`} onConfirm={confirmDeleteMonth} onCancel={() => setIsDeleteModalOpen(false)} />
    </div>
  );
}
