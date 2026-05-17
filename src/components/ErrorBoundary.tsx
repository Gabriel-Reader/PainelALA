import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// @ts-nocheck - React 19 class component compatibility
class ErrorBoundaryClass extends React.Component {
  constructor(props: Props) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error inside React Tree:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const state = (this as any).state as State;
    const props = (this as any).props as Props;

    if (state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-neutral-100">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 via-transparent to-transparent opacity-40 pointer-events-none" />
            
            <div className="mx-auto w-16 h-16 bg-red-950/60 border border-red-700/50 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-950/30 animate-pulse">
              <AlertTriangle size={32} />
            </div>

            <h1 className="text-2xl font-black mb-3 tracking-tight">Oops! Algo deu errado.</h1>
            
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Ocorreu um erro inesperado na renderização do painel. Mas não se preocupe, os dados estão seguros e salvos no banco de dados.
            </p>

            {state.error && (
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 mb-6 text-left overflow-auto max-h-36 scrollbar-thin">
                <p className="text-xs font-mono text-red-400 break-words whitespace-pre-wrap">
                  {state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-5 rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw size={18} />
              Recarregar Painel
            </button>
          </div>
        </div>
      );
    }

    return props.children;
  }
}

export function ErrorBoundary({ children }: Props) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
}
