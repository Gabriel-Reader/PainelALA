import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './LanguageContext.tsx';
import './index.css';

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
