import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

let toastId = 0;
let addToastFn: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null;

/**
 * Função global para exibir toasts de qualquer lugar.
 */
export function showToast(text: string, type: ToastType = 'info') {
  addToastFn?.({ text, type });
}

interface ToastContainerProps {
  duration?: number;
}

/**
 * Container de toasts. Deve ser montado uma vez na raiz da aplicação.
 */
export function ToastContainer({ duration = 4000 }: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (msg) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { ...msg, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };
    return () => {
      addToastFn = null;
    };
  }, [duration]);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons: Record<ToastType, typeof Info> = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info,
  };

  const colors: Record<ToastType, string> = {
    error: 'bg-red-900/90 border-red-700 text-red-100',
    success: 'bg-emerald-900/90 border-emerald-700 text-emerald-100',
    info: 'bg-sky-900/90 border-sky-700 text-sky-100',
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm animate-[slideIn_0.2s_ease-out] ${colors[toast.type]}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <span className="text-sm flex-1">{toast.text}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
