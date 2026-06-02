/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './LanguageContext.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

declare const __APP_VERSION__: string;

const updateChannel = new BroadcastChannel('app-update');
const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const storedVersion = localStorage.getItem('app_version');
if (storedVersion !== currentVersion) {
  localStorage.setItem('app_version', currentVersion);
  updateChannel.postMessage({ type: 'version_changed', version: currentVersion });
}

updateChannel.onmessage = (event) => {
  if (event.data === 'force-reload') {
    window.location.reload();
  } else if (event.data?.type === 'version_changed') {
    if (event.data.version !== currentVersion) {
      window.location.reload();
    }
  }
};

// Filtra logs automáticos do Vite HMR e do React DevTools no desenvolvimento
if (import.meta.env.DEV) {
  const filterLogs = (fn: (...args: any[]) => void) => {
    return (...args: any[]) => {
      const msg = args[0];
      if (typeof msg === 'string') {
        if (msg.includes('[vite]') || msg.includes('React DevTools')) {
          return;
        }
      }
      fn(...args);
    };
  };
  console.log = filterLogs(console.log);
  console.warn = filterLogs(console.warn);
  console.info = filterLogs(console.info);
} else {
  // Em produção, se houver erro ao carregar um chunk do Vite (novo deploy), recarrega a página
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const isRefreshed = sessionStorage.getItem('vite-preload-refreshed');
    if (!isRefreshed) {
      window.dispatchEvent(new CustomEvent('show-update-prompt', {
        detail: { message: 'Uma nova atualização do sistema foi publicada. Para acessar todos os recursos, é necessário recarregar a página.' }
      }));
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </LanguageProvider>
  </StrictMode>,
);
