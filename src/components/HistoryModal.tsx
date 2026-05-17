import React, { useState, useEffect } from 'react';
import { X, History, ChevronLeft, ChevronRight, CalendarCheck, Snowflake, ShoppingCart, Sparkles, Wrench, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface HistoryRecord {
  weekKey: string;
  monthKey: string;
  year: number;
  weekNumber: number;
  cleaningRoom: string;
  maintenanceRoom: string;
  fridgeRoom: string;
  productsRoom: string;
  cleaningExactDate: string;
  maintenanceExactDate: string;
  fridgeExactDate: string;
  productsExactDate: string;
  savedAt: any;
}

interface HistoryModalProps {
  onClose: () => void;
  today: Date;
  isDev: boolean;
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function HistoryModal({ onClose, today, isDev }: HistoryModalProps) {
  const [currentDate, setCurrentDate] = useState(today);
  const [logs, setLogs] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const monthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
  const monthName = `${MONTH_NAMES[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'history'), where('monthKey', '==', monthKey));
        const querySnapshot = await getDocs(q);
        const data: HistoryRecord[] = [];
        querySnapshot.forEach((doc) => {
          data.push(doc.data() as HistoryRecord);
        });
        // Sort descending by weekNumber
        data.sort((a, b) => b.weekNumber - a.weekNumber);
        setLogs(data);
      } catch (e) {
        console.error('Error fetching history:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [monthKey]);

  const handleDeleteMonth = async () => {
    if (!window.confirm(`Tem certeza que deseja apagar todo o histórico de ${monthName}? Esta ação não pode ser desfeita.`)) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'history'), where('monthKey', '==', monthKey));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(document => deleteDoc(doc(db, 'history', document.id)));
      await Promise.all(deletePromises);
      setLogs([]);
    } catch (e) {
      console.error('Erro ao deletar histórico:', e);
      alert('Erro ao apagar histórico. Verifique se você tem permissão.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y.substring(2)}`;
  };

  const getWeekDateRange = (weekNumber: number) => {
    const base = new Date(2024, 0, 4, 12, 0, 0, 0);
    const startThu = new Date(base.getTime() + weekNumber * 7 * 86400000);
    const startFri = new Date(startThu.getTime() + 1 * 86400000);
    const endWed = new Date(startThu.getTime() + 6 * 86400000);
    const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${fmt(startFri)} a ${fmt(endWed)}`;
  };

  // We extract the monthly tasks from any of the weeks in this month (they are the same for the month)
  const firstLog = logs.length > 0 ? logs[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-2 text-neutral-200">
            <History className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-lg">Histórico de Atividades</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 bg-neutral-950/50 border-b border-neutral-800">
          <button onClick={handlePrevMonth} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-neutral-400" />
            <span className="font-bold text-neutral-200 uppercase tracking-wider">{monthName}</span>
            {isDev && logs.length > 0 && (
              <button 
                onClick={handleDeleteMonth}
                title={`Apagar histórico de ${monthName}`}
                className="ml-1 p-1 rounded bg-red-950/40 text-red-500 hover:bg-red-900/60 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button onClick={handleNextMonth} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin' }}>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-500 border-r-2 border-r-transparent"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500">Nenhum histórico registrado em {monthName}.</p>
              <p className="text-xs text-neutral-600 mt-2">O sistema salva automaticamente toda quinta-feira.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* ATIVIDADES MENSAIS */}
              {firstLog && (
                <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-neutral-400 mb-3 uppercase tracking-widest text-center">Atividades Mensais</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Compras */}
                    <div className="bg-pink-950/20 border border-pink-900/30 rounded-lg p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-1.5 opacity-10">
                        <ShoppingCart className="w-10 h-10 text-pink-400" />
                      </div>
                      <p className="text-[10px] text-pink-400/80 font-bold uppercase tracking-wider mb-0.5">Comprar Produtos</p>
                      <p className="font-black text-pink-100 text-lg mb-1">{firstLog.productsRoom === 'Coletivo' ? 'Coletivo' : `Quarto ${firstLog.productsRoom}`}</p>
                      <div className="bg-neutral-900/50 px-2 py-0.5 rounded text-[10px] text-neutral-400 flex items-center gap-1 font-medium">
                        Data: {formatDate(firstLog.productsExactDate)}
                      </div>
                    </div>
                    {/* Geladeira */}
                    <div className="bg-teal-950/20 border border-teal-900/30 rounded-lg p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-1.5 opacity-10">
                        <Snowflake className="w-10 h-10 text-teal-400" />
                      </div>
                      <p className="text-[10px] text-teal-400/80 font-bold uppercase tracking-wider mb-0.5">Limp. Geladeira</p>
                      <p className="font-black text-teal-100 text-lg mb-1">{firstLog.fridgeRoom === 'Coletivo' ? 'Coletivo' : `Quarto ${firstLog.fridgeRoom}`}</p>
                      <div className="bg-neutral-900/50 px-2 py-0.5 rounded text-[10px] text-neutral-400 flex items-center gap-1 font-medium">
                        {new Date(firstLog.fridgeExactDate + "T12:00:00Z") > today ? 'Vai ser realizada até: ' : 'Data: '}
                        {formatDate(firstLog.fridgeExactDate)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ATIVIDADES SEMANAIS */}
              <div>
                <h3 className="text-xs font-bold text-neutral-400 mb-3 uppercase tracking-widest text-center">Atividades Semanais</h3>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.weekKey} className="bg-neutral-800/40 rounded-xl p-4 border border-neutral-700/50 flex flex-col">
                      <div className="mb-3 border-b border-neutral-700/50 pb-2">
                        <span className="bg-neutral-700/80 px-2.5 py-1 rounded-md text-xs font-bold text-neutral-200">
                          Semana: {getWeekDateRange(log.weekNumber)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-sky-950/10 border border-sky-900/20 rounded-lg p-2.5 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-sky-500/70" />
                            <div>
                              <p className="text-[9px] text-sky-400/70 font-bold uppercase tracking-wider leading-none">Limpeza</p>
                              <p className="font-bold text-sky-100 text-sm mt-0.5">{log.cleaningRoom === 'Coletivo' ? 'Coletivo' : `Quarto ${log.cleaningRoom}`}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-medium bg-neutral-900/50 px-1.5 py-0.5 rounded">
                            {formatDate(log.cleaningExactDate)}
                          </span>
                        </div>
                        
                        <div className="bg-amber-950/10 border border-amber-900/20 rounded-lg p-2.5 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-amber-500/70" />
                            <div>
                              <p className="text-[9px] text-amber-400/70 font-bold uppercase tracking-wider leading-none">Manutenção</p>
                              <p className="font-bold text-amber-100 text-sm mt-0.5">{log.maintenanceRoom === 'Coletivo' ? 'Coletivo' : `Quarto ${log.maintenanceRoom}`}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-medium bg-neutral-900/50 px-1.5 py-0.5 rounded">
                            {formatDate(log.maintenanceExactDate)}
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
    </div>
  );
}
