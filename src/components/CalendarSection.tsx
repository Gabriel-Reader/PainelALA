import React, { useState, Fragment } from 'react';
import { CalendarDays, Trash2, History } from 'lucide-react';
import { AppConfig } from '../hooks/useWingConfig';
import { HistoryModal } from './HistoryModal';
import { useLang } from '../LanguageContext';

type CalendarMode = 'cleaning' | 'maintenance' | 'fridge' | 'products' | 'coletivo';

interface DayTask {
  id: string;
  type: CalendarMode | string;
  shortType: string;
  color: string;
  room: string;
  isManual: boolean;
}

interface CalendarSectionProps {
  config: AppConfig;
  isRep: boolean;
  isDev: boolean;
  viewDate: Date;
  today: Date;
  currentMonth: string;
  daysInMonth: number;
  firstDay: number;
  calendarMode: CalendarMode;
  setCalendarMode: (mode: CalendarMode) => void;
  getFinalDaysAndTasks: (year: number, month: number, dayNum: number) => { dayTasks: DayTask[]; assignedRoom?: string };
  handleDayClick: (day: number) => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleClearMonth: () => void;
}

const COLOR_MAP: Record<string, string> = {
  sky: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};



export function CalendarSection({
  isRep, isDev, viewDate, today, currentMonth,
  daysInMonth, firstDay, calendarMode, setCalendarMode,
  getFinalDaysAndTasks, handleDayClick,
  handlePrevMonth, handleNextMonth, handleClearMonth,
}: CalendarSectionProps) {
  const { t, lang } = useLang();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;

  const MODE_BUTTONS: { key: CalendarMode; label: string; active: string }[] = [
    { key: 'cleaning',    label: t.calendarModes.cleaning,      active: 'bg-sky-600/80' },
    { key: 'maintenance', label: t.calendarModes.maintenance,   active: 'bg-amber-600/80' },
    { key: 'fridge',      label: t.calendarModes.fridge,        active: 'bg-teal-600/80' },
    { key: 'products',    label: t.calendarModes.products,      active: 'bg-pink-600/80' },
    { key: 'coletivo',    label: t.calendarModes.coletivo,      active: 'bg-purple-600/80' },
  ];

  const isCurrentMonthView = viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();

  return (
    <div className="lg:col-span-9 bg-neutral-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-700 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-neutral-800/80 px-3 sm:px-5 py-3 sm:py-4 border-b border-neutral-700 flex flex-col gap-2">
        {/* Row 1: title + month nav */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 shrink-0">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-400" />
            <h2 className="text-sm sm:text-lg font-semibold text-neutral-200 uppercase tracking-wider">{lang === 'en' ? 'Month Schedule' : 'Escala do Mês'}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handlePrevMonth} className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">{'<'}</button>
            <span className="text-xs sm:text-sm font-medium text-neutral-400 capitalize whitespace-nowrap text-center flex items-center gap-1">
              {currentMonth}
              {isCurrentMonthView && <span className="text-sky-400 font-bold text-[10px] uppercase bg-sky-900/30 px-1.5 py-0.5 rounded">{lang === 'en' ? 'Current' : 'Atual'}</span>}
            </span>
            <button onClick={handleNextMonth} className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">{'>'}</button>
          </div>
        </div>
        {/* Row 2: mode buttons (scrollable) */}
        {isRep && (
          <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center bg-neutral-900/50 rounded-lg p-1 border border-neutral-700 gap-0.5 w-max">
              {MODE_BUTTONS.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setCalendarMode(btn.key)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                    calendarMode === btn.key ? `${btn.active} text-white shadow-sm` : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="p-2 sm:p-5 bg-neutral-900/50 flex-1 relative overflow-hidden text-neutral-200 min-h-[300px] sm:min-h-[500px]">
        <div className="p-2 sm:p-4 bg-neutral-950/50 rounded-xl shadow-inner border border-neutral-800 h-full flex flex-col">
          <div className="grid grid-cols-7 gap-px bg-neutral-800 rounded overflow-hidden flex-1 border border-neutral-800">
            {/* Headers */}
            {t.weekDays.map(day => (
              <div key={day} className="bg-neutral-900 text-center py-1.5 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-500 border-b border-neutral-800 uppercase tracking-widest">
                {day}
              </div>
            ))}

            {/* Cells */}
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNumber = i - firstDay + 1;
              const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;

              if (!isCurrentMonth) {
                return <div key={`empty-${i}`} className="bg-neutral-900/80 p-1 sm:p-2 min-h-[3.25rem] sm:min-h-[5.5rem] opacity-50" />;
              }

              const { dayTasks } = getFinalDaysAndTasks(viewDate.getFullYear(), viewDate.getMonth(), dayNumber);
              const isMockToday = dayNumber === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();

              return (
                <div
                  key={`day-${dayNumber}`}
                  onClick={() => handleDayClick(dayNumber)}
                  className={`bg-neutral-900/60 p-1 sm:p-2 min-h-[3.25rem] sm:min-h-[5.5rem] relative transition-colors ${
                    isMockToday ? 'border-2 border-emerald-500/50 z-10' : 'border-t border-l border-neutral-800'
                  } cursor-pointer hover:bg-neutral-800 group`}
                >
                  <span className={`flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] sm:text-sm font-medium transition-colors ${
                    isMockToday ? 'bg-emerald-500 text-neutral-950 font-bold' : dayTasks.length > 0 ? 'text-neutral-300' : 'text-neutral-600 group-hover:text-neutral-400'
                  }`}>
                    {dayNumber}
                  </span>

                  <div className="flex flex-col gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 items-center justify-start min-h-[calc(100%-1.2rem)] w-full overflow-hidden">
                    {dayTasks.map(task => (
                      <Fragment key={task.id}>
                        {/* Desktop badge */}
                        <div className={`hidden sm:flex items-center justify-between ${COLOR_MAP[task.color]} font-bold text-[10px] w-full py-0.5 px-1 rounded shadow-sm border truncate ${task.isManual ? 'border-dashed border-white/40 ring-1 ring-white/10' : ''}`} title={task.isManual ? `${task.type} (data personalizada)` : task.type}>
                          <span className="truncate mr-1">{task.shortType || task.type}</span>
                          <span className="opacity-80 shrink-0 text-[10px]">{task.room === 'Coletivo' ? 'Col' : `Q${task.room}`}</span>
                        </div>
                        {/* Mobile badge */}
                        <div className={`sm:hidden flex items-center justify-center ${COLOR_MAP[task.color]} px-0.5 py-0.5 rounded text-[8.5px] font-bold w-full border truncate leading-none ${task.isManual ? 'border-dashed border-white/40' : ''}`} title={task.isManual ? `${task.type} (data personalizada) - Quarto ${task.room}` : `${task.type} - Quarto ${task.room}`}>
                          <span className="truncate">{(task.shortType || task.type).substring(0, 4)}</span>
                          <span className="opacity-70 ml-0.5 shrink-0">{task.room === 'Coletivo' ? 'C' : task.room}</span>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-neutral-700/50 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded border border-current" />
              {t.automatic || 'Automático'}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded border border-dashed border-white/50" />
              {t.customDate || 'Data personalizada'}
            </span>
          </div>

          {isRep && (
            <div className="flex justify-center mt-3 shrink-0 gap-3">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="px-3 py-1.5 rounded-md text-xs font-bold bg-neutral-700 hover:bg-sky-900/50 text-sky-400 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <History className="w-3.5 h-3.5" />
                {t.history}
              </button>
              <button
                onClick={handleClearMonth}
                className="px-3 py-1.5 rounded-md text-xs font-bold bg-neutral-700 hover:bg-red-900/50 text-red-400 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t.clearMonth}
              </button>
            </div>
          )}
        </div>
      </div>

      {isHistoryOpen && <HistoryModal onClose={() => setIsHistoryOpen(false)} today={today} isDev={isDev} />}
    </div>
  );
}
