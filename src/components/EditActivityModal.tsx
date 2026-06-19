import React, { useState } from 'react';
import { X, Clock, FastForward } from 'lucide-react';
import { useLang } from '../LanguageContext';
import { ALL_ROOMS } from '../constants';

export interface EditActivityData {
  day: number;
  dKey: string;
  tasks: any[];
}

interface EditActivityModalProps {
  data: EditActivityData;
  onClose: () => void;
  onSaveOnlyThisDay: (taskId: string, newRoom: string) => void;
  onSaveFromHereOn: (taskId: string, newRoom: string) => void;
}

export function EditActivityModal({ data, onClose, onSaveOnlyThisDay, onSaveFromHereOn }: EditActivityModalProps) {
  const { lang } = useLang();
  
  // Se houver mais de uma tarefa, o usuário seleciona qual editar.
  // Filtramos 'coletivo' fora de onde as tarefas são enviadas.
  const [selectedTaskId, setSelectedTaskId] = useState<string>(data.tasks[0]?.id || '');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  
  const handleSaveThisDay = () => {
    if (!selectedRoom || !selectedTaskId) return;
    onSaveOnlyThisDay(selectedTaskId, selectedRoom);
    onClose();
  };

  const handleSaveFromHere = () => {
    if (!selectedRoom || !selectedTaskId) return;
    onSaveFromHereOn(selectedTaskId, selectedRoom);
    onClose();
  };

  const selectedTask = data.tasks.find(t => t.id === selectedTaskId) || data.tasks[0];

  if (!selectedTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            <span className="text-xl">✏️</span>
            {lang === 'en' ? 'Edit Activity' : 'Editar Atividade'}
          </h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">
          {/* Info Banner */}
          <div className="bg-sky-900/20 border border-sky-800/40 rounded-xl p-3 flex flex-col gap-1">
            <div className="text-sky-400 text-sm font-semibold">{lang === 'en' ? 'Date' : 'Data'}: {data.dKey.split('-').reverse().join('/')}</div>
          </div>

          {/* Task Selection (if multiple) */}
          {data.tasks.length > 1 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-neutral-300">{lang === 'en' ? 'Select Activity' : 'Selecione a Atividade'}</label>
              <div className="flex flex-wrap gap-2">
                {data.tasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${
                      selectedTaskId === task.id
                        ? 'bg-neutral-700 border-neutral-500 text-white'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    {task.type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Info */}
          <div className="flex flex-col gap-2">
            <div className="text-sm text-neutral-400">
              {lang === 'en' ? 'Current responsible for' : 'Responsável atual por'} <strong className="text-neutral-200">{selectedTask.type}</strong>: <span className="font-bold text-sky-400">Q{selectedTask.room}</span>
            </div>
            
            <label className="text-sm font-semibold text-neutral-300 mt-2">{lang === 'en' ? 'New Responsible' : 'Novo Responsável'}</label>
            <select
              value={selectedRoom}
              onChange={e => setSelectedRoom(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-neutral-200 outline-none focus:border-sky-500 transition-colors"
            >
              <option value="">{lang === 'en' ? 'Select a room...' : 'Selecione um quarto...'}</option>
              {ALL_ROOMS.map(r => (
                <option key={r} value={r}>Quarto {r}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <button
              disabled={!selectedRoom}
              onClick={handleSaveThisDay}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-sky-500/50 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
            >
              <Clock className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-neutral-200">{lang === 'en' ? 'Only this day' : 'Apenas neste dia'}</span>
              <span className="text-[10px] text-neutral-400 text-center leading-tight">
                {lang === 'en' ? 'Overrides only this specific date' : 'Muda o responsável apenas nesta data'}
              </span>
            </button>

            <button
              disabled={!selectedRoom}
              onClick={handleSaveFromHere}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-emerald-500/50 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
            >
              <FastForward className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-neutral-200">{lang === 'en' ? 'From here on' : 'A partir daqui'}</span>
              <span className="text-[10px] text-neutral-400 text-center leading-tight">
                {lang === 'en' ? 'Adjusts rotation from this point' : 'Ajusta a rotação a partir daqui'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
