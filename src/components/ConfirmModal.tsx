import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLang } from '../LanguageContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  const { t } = useLang();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-bold text-neutral-100 mb-2">
            {title || 'Confirmação'}
          </h3>
          <p className="text-neutral-400 text-sm">
            {message}
          </p>
        </div>
        <div className="flex bg-neutral-800/50 border-t border-neutral-700/50 p-3 gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-medium rounded-lg transition-colors"
          >
            {t.cancel || 'Cancelar'}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            {t.confirm || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
