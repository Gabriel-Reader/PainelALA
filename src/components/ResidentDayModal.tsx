import React from 'react';
import { X } from 'lucide-react';
import { useLang } from '../LanguageContext';

interface DayTask {
  id: string;
  type: string;
  color: string;
  room: string;
}

interface ResidentDayModalProps {
  dayNumber: number;
  dayTasks: DayTask[];
  onClose: () => void;
}

const COLOR_MAP: Record<string, string> = {
  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  pink: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

export function ResidentDayModal({ dayNumber, dayTasks, onClose }: ResidentDayModalProps) {
  const { t, lang } = useLang();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-neutral-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold tracking-tight text-white">{lang === 'en' ? `Day ${dayNumber}` : `Dia ${dayNumber}`}</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {dayTasks.map(task => (
            <div
              key={task.id}
              className={`${COLOR_MAP[task.color] ?? ''} font-bold py-3 px-4 rounded-lg shadow-sm text-center uppercase tracking-wider text-sm flex justify-between items-center border`}
            >
              <span>{task.type}</span>
              <span className="opacity-80 leading-none bg-black/20 p-1.5 rounded">
                {task.room === 'Coletivo' ? t.coletivo : (lang === 'en' ? `R${task.room}` : `Q${task.room}`)}
              </span>
            </div>
          ))}
          {dayTasks.length === 0 && (
            <p className="text-neutral-500 text-center py-4 italic">
              {t.noTasksForDay}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
