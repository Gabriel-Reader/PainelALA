import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { useLang } from '../LanguageContext';

export function InstallPrompt() {
  const { t } = useLang();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default to true so it doesn't flash before checking
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if running as PWA (standalone)
    const isStandAloneMatch = window.matchMedia('(display-mode: standalone)').matches || 
                              (window.navigator as any).standalone === true;
    setIsStandalone(isStandAloneMatch);

    // Check if iOS
    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isApple);

    const handlePromptReady = () => {
      const e = (window as any).pwaDeferredPrompt;
      if (e) {
        setDeferredPrompt(e);
        if (!isStandAloneMatch && !sessionStorage.getItem('pwaPromptDismissed')) {
          setShow(true);
        }
      }
    };

    // Check if it already fired before React mounted
    handlePromptReady();

    // Listen for the custom event or native event just in case
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      (window as any).pwaDeferredPrompt = e;
      handlePromptReady();
    });

    // If iOS and not standalone, show the custom banner
    if (isApple && !isStandAloneMatch && !sessionStorage.getItem('pwaPromptDismissed')) {
      // Delay showing it so it doesn't annoy immediately on load
      setTimeout(() => setShow(true), 2000);
    }

    return () => {
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('pwaPromptDismissed', 'true');
  };

  if (!show || isStandalone) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-neutral-800 border border-[var(--theme-primary)]/50 shadow-2xl shadow-black/50 rounded-2xl p-4 z-50 flex items-start gap-4 animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div className="bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] p-2.5 rounded-xl flex-shrink-0">
        <Download size={24} />
      </div>
      
      <div className="flex-1 pt-0.5">
        <h3 className="font-bold text-neutral-100 text-sm mb-1">{t.installApp}</h3>
        <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
          {isIOS ? t.installIOSDesc : t.installDesc}
        </p>
        
        {isIOS ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 px-2 py-1.5 rounded-lg inline-flex">
            <Share size={14} /> <span>Compartilhar</span>
          </div>
        ) : (
          <button 
            onClick={handleInstallClick}
            className="bg-[var(--theme-primary)] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-all active:scale-95"
          >
            {t.installButton}
          </button>
        )}
      </div>

      <button 
        onClick={handleDismiss}
        className="text-neutral-500 hover:text-neutral-300 p-1 -mr-2 -mt-2 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
