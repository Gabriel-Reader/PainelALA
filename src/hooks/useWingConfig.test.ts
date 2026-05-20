import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWingConfig } from './useWingConfig';

// Mock do módulo interno
vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'user123', email: 'test@test.com' } },
  db: {}
}));

// Mock do firebase/auth
vi.mock('firebase/auth', () => {
  let authCallback: any = null;
  return {
    onAuthStateChanged: vi.fn((auth, cb) => {
      authCallback = cb;
      setTimeout(() => cb({ uid: 'user123', email: 'test@test.com' }), 0);
      return () => { authCallback = null; };
    }),
  };
});

// Mock do firebase/firestore
vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((db, collection, id) => ({ collection, id })),
    serverTimestamp: vi.fn(() => 'mocked-timestamp'),
    onSnapshot: vi.fn((ref, cb) => {
      if (ref.collection === 'users') {
        setTimeout(() => cb({ exists: () => true, data: () => ({ role: 'resident', email: 'test@test.com' }) }), 0);
      } else if (ref.collection === 'config') {
        setTimeout(() => cb({ exists: () => true, data: () => ({ appTitle: 'Painel Teste' }) }), 0);
      }
      return () => {};
    }),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
  };
});

describe('useWingConfig', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('inicializa as variáveis e recupera dados do firestore corretamente', async () => {
    const { result } = renderHook(() => useWingConfig());
    
    // Antes da resposta do Firebase e sem cache local
    expect(result.current.authLoading).toBe(true);
    
    // Avança timers do React / setTimeout
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // authLoading resolve
    expect(result.current.authLoading).toBe(false);
    expect(result.current.user?.uid).toBe('user123');
    
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    
    // config e profile resolvem
    expect(result.current.loading).toBe(false);
    expect(result.current.profileLoading).toBe(false);
    expect(result.current.profile?.role).toBe('resident');
    expect(result.current.config?.appTitle).toBe('Painel Teste');
  });

  it('faz atualizações otimistas (optimistic update) e reverte em caso de erro', async () => {
    const firestoreMock = await import('firebase/firestore');
    
    // Injetando cache para começar imediatamente com dados
    localStorage.setItem('painel_config_cache', JSON.stringify({ appTitle: 'Antigo' }));
    
    const { result } = renderHook(() => useWingConfig());
    
    // Estado inicial reflete o cache
    expect(result.current.config?.appTitle).toBe('Antigo');
    
    // Atualização com sucesso
    await act(async () => {
      await result.current.updateConfig({ appTitle: 'Novo Titulo' });
    });
    
    // Deve aplicar a mudança localmente
    expect(result.current.config?.appTitle).toBe('Novo Titulo');
    expect(firestoreMock.updateDoc).toHaveBeenCalled();
    
    // Simulando falha do backend ao salvar
    vi.mocked(firestoreMock.updateDoc).mockRejectedValueOnce(new Error('Falha no banco de dados'));
    
    await act(async () => {
      await result.current.updateConfig({ appTitle: 'Titulo Errado' });
    });
    
    // O hook tem que reverter para o valor anterior à falha ("Novo Titulo")
    expect(result.current.config?.appTitle).toBe('Novo Titulo'); 
    expect(result.current.saveError).toBe('Falha no banco de dados');
  });
});
