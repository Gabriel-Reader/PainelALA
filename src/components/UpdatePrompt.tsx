import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export function UpdatePrompt() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setMessage(customEvent.detail?.message || 'Uma nova atualização do sistema foi publicada. Para acessar todos os recursos, é necessário recarregar a página.');
      setShow(true);
    };

    window.addEventListener('show-update-prompt', handleUpdate);
    return () => window.removeEventListener('show-update-prompt', handleUpdate);
  }, []);

  if (!show) return null;

  const handleReload = () => {
    sessionStorage.setItem('vite-preload-refreshed', 'true');
    const bc = new BroadcastChannel('app-update');
    bc.postMessage('force-reload');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-sm bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-300"
        style={{ backgroundColor: 'var(--theme-card-bg, #262626)', borderColor: 'var(--theme-card-border, #404040)' }}
      >
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4"
             style={{ backgroundColor: 'var(--theme-accent-light, rgba(56, 189, 248, 0.1))', color: 'var(--theme-primary, #38bdf8)' }}>
          <RefreshCw size={24} />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Atualização Disponível</h3>
        <p className="text-sm text-neutral-400 mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleReload}
            className="w-full py-3.5 px-4 font-bold text-neutral-900 rounded-xl transition-all"
            style={{ backgroundColor: 'var(--theme-primary, #38bdf8)' }}
          >
            Recarregar Agora
          </button>
          <button
            onClick={() => setShow(false)}
            className="w-full py-3.5 px-4 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-300 font-medium rounded-xl transition-colors border border-transparent hover:border-neutral-700"
          >
            Agora Não
          </button>
        </div>
      </div>
    </div>
  );
}
