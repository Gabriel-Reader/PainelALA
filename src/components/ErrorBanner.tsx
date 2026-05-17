import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-red-950 border border-red-700 rounded-xl p-4 shadow-2xl flex items-start gap-3 animate-pulse-once">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-200">Erro ao salvar</p>
          <p className="text-xs text-red-400/80 mt-0.5 break-words line-clamp-2">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-200 p-1 rounded transition-colors shrink-0"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
