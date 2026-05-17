import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

interface PromptModalProps {
  title: string;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

export function PromptModal({ title, initialValue, onSave, onClose }: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input when modal opens
    if (inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      inputRef.current.select();
    }
  }, []);

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50">
          <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 flex flex-col gap-4">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-neutral-950 border border-neutral-700 text-neutral-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all shadow-inner"
            placeholder="Digite o novo texto..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-800 bg-neutral-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-lg shadow-sky-900/20"
          >
            <Check className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
