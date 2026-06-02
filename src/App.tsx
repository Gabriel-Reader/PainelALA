import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { CalendarDays, ClipboardList, Settings, LogOut, Pencil, Languages, CheckSquare, BookOpen, Link2, Package, Wrench, Loader2, Palette, Users, Check } from 'lucide-react';
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut } from 'firebase/auth';
import { deleteField, doc, updateDoc, getDoc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useWingConfig } from './hooks/useWingConfig';
import { ActivitiesPanel } from './components/ActivitiesPanel';
import { CalendarSection } from './components/CalendarSection';
import { ResidentDayModal } from './components/ResidentDayModal';
import { ErrorBanner } from './components/ErrorBanner';
import { PromptModal } from './components/PromptModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer, showToast } from './components/Toast';
import { UsersTab } from './components/UsersTab';
import { NotificationBell } from './components/NotificationsPanel';
import { InstallPrompt } from './components/InstallPrompt';
import { UpdatePrompt } from './components/UpdatePrompt';
import { useLang } from './LanguageContext';
import { ROOMS } from './constants';
import { getWeekNumber, EPOCH_REFERENCE_DATE, getEffectiveOffset } from './utils/date';

const THEMES = [
  {
    key: 'ocean',
    name: 'Oceano & Céu',
    desc: 'Tema escuro clássico (padrão)',
    colors: ['bg-sky-500', 'bg-neutral-900'],
    primary: '#38bdf8',
    primaryHover: '#0ea5e9',
    headerBg: '#0c4a6e',
    headerBorder: '#075985',
    bg: '#171717',
    cardBg: '#262626',
    cardBorder: '#404040',
    accentLight: 'rgba(8, 47, 73, 0.4)',
  },
  {
    key: 'forest',
    name: 'Floresta & Musgo',
    desc: 'Verde floresta sereno',
    colors: ['bg-emerald-400', 'bg-emerald-900'],
    primary: '#34d399',
    primaryHover: '#059669',
    headerBg: '#064e3b',
    headerBorder: '#047857',
    bg: '#050a07',
    cardBg: '#0f1a14',
    cardBorder: 'rgba(52, 211, 153, 0.15)',
    accentLight: 'rgba(52, 211, 153, 0.08)',
  },
  {
    key: 'wine',
    name: 'Vinho & Rosé',
    desc: 'Tons elegantes de vinho e rosa',
    colors: ['bg-rose-500', 'bg-rose-950'],
    primary: '#fb7185',
    primaryHover: '#e11d48',
    headerBg: '#4c0519',
    headerBorder: '#881337',
    bg: '#0f0507',
    cardBg: '#1a0e10',
    cardBorder: 'rgba(251, 113, 133, 0.2)',
    accentLight: 'rgba(251, 113, 133, 0.08)',
  },
  {
    key: 'royal',
    name: 'Ametista Real',
    desc: 'Violeta e plum imperial',
    colors: ['bg-purple-400', 'bg-purple-950'],
    primary: '#c084fc',
    primaryHover: '#9333ea',
    headerBg: '#2e1065',
    headerBorder: '#6b21a8',
    bg: '#09050d',
    cardBg: '#160e22',
    cardBorder: 'rgba(192, 132, 252, 0.15)',
    accentLight: 'rgba(192, 132, 252, 0.08)',
  },
  {
    key: 'carbon',
    name: 'Carbono & Neon',
    desc: 'Grafite com neon ciano',
    colors: ['bg-cyan-400', 'bg-zinc-800'],
    primary: '#22d3ee',
    primaryHover: '#0891b2',
    headerBg: '#18181b',
    headerBorder: '#3f3f46',
    bg: '#09090b',
    cardBg: '#141416',
    cardBorder: 'rgba(34, 211, 238, 0.15)',
    accentLight: 'rgba(34, 211, 238, 0.08)',
  },
];

// ── Lazy-loaded tabs (carregadas apenas quando acessadas) ────────────────────
function lazyWithRetry<T extends React.ComponentType<any>>(componentImport: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.dispatchEvent(new CustomEvent('show-update-prompt', {
          detail: { message: 'Uma nova atualização do sistema foi publicada. Para acessar esta aba, é necessário recarregar a página.' }
        }));
        return new Promise<{ default: T }>(() => {}); // Fica carregando pendente
      }
      throw error;
    }
  });
}

const RulesTab = lazyWithRetry(() => import('./components/RulesTab').then(m => ({ default: m.RulesTab })));
const GeneralRulesTab = lazyWithRetry(() => import('./components/GeneralRulesTab').then(m => ({ default: m.GeneralRulesTab })));
const LinksTab = lazyWithRetry(() => import('./components/LinksTab').then(m => ({ default: m.LinksTab })));
const ProductsTab = lazyWithRetry(() => import('./ProductsTab').then(m => ({ default: m.ProductsTab })));
const MaintenanceTab = lazyWithRetry(() => import('./components/MaintenanceTab').then(m => ({ default: m.MaintenanceTab })));

/** Loading fallback para tabs lazy-loaded */
function TabLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
    </div>
  );
}

type ActiveTab = 'main' | 'rules' | 'general_rules' | 'links' | 'products' | 'maintenance' | 'users';
type CalendarMode = 'cleaning' | 'maintenance' | 'fridge' | 'products' | 'coletivo';

interface DayTask {
  id: string;
  shortType: string;
  type: string;
  color: string;
  room: string;
  isManual: boolean;
}

/** Retorna o número de dias de um mês. */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Retorna o dia da semana do primeiro dia do mês (0=dom ... 6=sáb). */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function App() {
  const { config, updateConfig, loading, profileLoading, user, authLoading, profile, saveError, clearSaveError, saveWeeklySnapshot } = useWingConfig();
  const { lang, setLang, t } = useLang();

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        // Fallback para redirect se o popup for bloqueado pelo navegador
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } else {
        console.error("Login error:", error);
      }
    }
  };

  // 1. Mostra spinner enquanto o estado do Firebase Auth está inicializando (evita flash da tela de login)
  // 2. Ou quando a config/profile de rede estão sendo carregadas pela primeira vez (se não houver cache)
  if (authLoading || loading || profileLoading) return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
      <div className="animate-pulse flex items-center space-x-2 text-sky-500">
        <Settings className="animate-spin" /><span className="font-medium">{t.loading}</span>
      </div>
    </div>
  );

  // Sem usuário autenticado (e Auth já resolveu que não está logado) → tela de login
  if (!user) return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="bg-neutral-800 p-8 rounded-2xl shadow-sm border border-neutral-700 max-w-sm w-full text-center">
        <div className="mx-auto w-16 h-16 bg-sky-900/50 text-sky-400 rounded-full flex items-center justify-center mb-6">
          <ClipboardList size={32} />
        </div>
        <h1 className="text-2xl font-bold text-neutral-100 mb-2">{t.loginTitle}</h1>
        <p className="text-neutral-400 mb-8">{t.loginDesc}</p>
        <button onClick={handleSignIn} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm">
          {t.loginBtn}
        </button>
      </div>
    </div>
  );

  // Dados ainda não disponíveis na memória (sem cache local e sem resposta do Firestore)
  if (!config || !profile) return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
      <div className="animate-pulse flex items-center space-x-2 text-sky-500">
        <Settings className="animate-spin" /><span className="font-medium">{t.loading}</span>
      </div>
    </div>
  );

  // Se o usuário ainda não tem nome (onboarding), mostra a tela de boas-vindas
  // Feito aqui no App (fora do AppContent) para não violar as Regras dos Hooks.
  if (!profile.displayName) {
    return <OnboardingScreen user={user} profile={profile} THEMES={THEMES} />;
  }

  return (
    <AppContent
      config={config}
      updateConfig={updateConfig}
      user={user}
      profile={profile}
      saveError={saveError}
      clearSaveError={clearSaveError}
      saveWeeklySnapshot={saveWeeklySnapshot}
      lang={lang}
      setLang={setLang}
      t={t}
    />
  );
}

function OnboardingScreen({
  user,
  profile,
  THEMES,
}: {
  user: any;
  profile: any;
  THEMES: any[];
}) {
  const suggestedName = React.useMemo(() => {
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    return '';
  }, [user]);

  const [name, setName] = useState(suggestedName);
  const [selectedTheme, setSelectedTheme] = useState('ocean');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTheme = React.useMemo(() => {
    return THEMES.find((t) => t.key === selectedTheme) || THEMES[0];
  }, [selectedTheme, THEMES]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', activeTheme.primary);
    root.style.setProperty('--theme-primary-hover', activeTheme.primaryHover);
    root.style.setProperty('--theme-header-bg', activeTheme.headerBg);
    root.style.setProperty('--theme-header-border', activeTheme.headerBorder);
    root.style.setProperty('--theme-bg', activeTheme.bg);
    root.style.setProperty('--theme-card-bg', activeTheme.cardBg);
    root.style.setProperty('--theme-card-border', activeTheme.cardBorder);
    root.style.setProperty('--theme-accent-light', activeTheme.accentLight);
  }, [activeTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, insira o seu nome.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: name.trim(),
        theme: selectedTheme,
      });
      localStorage.setItem('app_theme_key', selectedTheme);
    } catch (err: any) {
      console.error('Error saving onboarding data:', err);
      setError('Ocorreu um erro ao salvar os seus dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500" style={{ backgroundColor: 'var(--theme-bg, #171717)', color: '#f3f4f6' }}>
      <div 
        className="w-full max-w-md p-8 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform scale-100 hover:scale-[1.01]"
        style={{ 
          backgroundColor: 'var(--theme-card-bg, #262626)', 
          borderColor: 'var(--theme-card-border, #404040)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-full mb-3" style={{ backgroundColor: 'var(--theme-accent-light, rgba(56, 189, 248, 0.1))' }}>
            <Palette className="w-8 h-8" style={{ color: 'var(--theme-primary, #38bdf8)' }} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Bem-vindo à Ala!</h2>
          <p className="text-sm text-neutral-400 mt-2">Personalize sua experiência antes de continuar.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/50 border border-red-500/30 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-neutral-300 mb-2">
              Seu Nome / Apelido
            </label>
            <input
              type="text"
              value={name || ''}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite como quer ser chamado"
              className="w-full px-4 py-3 rounded-xl bg-neutral-900/60 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-white transition-all duration-200"
              maxLength={40}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-300 mb-3">
              Escolha o Tema do App
            </label>
            <div className="grid grid-cols-1 gap-3">
              {THEMES.map((themeOption) => {
                const isSelected = selectedTheme === themeOption.key;
                return (
                  <button
                    key={themeOption.key}
                    type="button"
                    onClick={() => setSelectedTheme(themeOption.key)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 hover:bg-neutral-800/40 ${
                      isSelected
                        ? 'border-[var(--theme-primary)] bg-neutral-800/60 shadow-lg'
                        : 'border-neutral-800 bg-neutral-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className={`w-4 h-4 rounded-full ${themeOption.colors[0]}`} />
                        <div className={`w-4 h-4 rounded-full ${themeOption.colors[1]}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{themeOption.name}</div>
                        <div className="text-xs text-neutral-400">{themeOption.desc}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[var(--theme-primary)] text-neutral-900">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-neutral-900 transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: 'var(--theme-primary, #38bdf8)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-primary)'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <span>Começar a Usar</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function AppContent({
  config, updateConfig, user, profile, saveError, clearSaveError, saveWeeklySnapshot, lang, setLang, t,
}: {
  config: any;
  updateConfig: any;
  user: any;
  profile: any;
  saveError: string | null;
  clearSaveError: () => void;
  saveWeeklySnapshot: any;
  lang: string;
  setLang: (l: string) => void;
  t: any;
}) {
  const handleSignOut = () => signOut(auth);

  const isGabriel = user?.email === 'gabrielpinheiro632@gmail.com';
  const realRole = isGabriel ? 'dev' : profile.role;

  // Todos os hooks devem ser declarados incondicionalmente (Regras dos Hooks)
  const [activeThemeKey, setActiveThemeKey] = useState<string>(
    () => profile.theme || localStorage.getItem('app_theme_key') || 'ocean'
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Temporary migration
  React.useEffect(() => {
    if (config && user && config.monthlyRotationOffset === 4 && !config.monthlyOffsets) {
      updateConfig({
        monthlyOffsets: { '2026-05': 0 }
      });
    }
  }, [config?.monthlyRotationOffset, config?.monthlyOffsets, user]);

  const [activeView, setActiveView] = useState<string>(() => {
    const saved = localStorage.getItem(`painel_active_view_${user.uid}`);
    if (saved) {
      if (realRole === 'resident') return 'resident';
      if (realRole === 'representative' && saved === 'dev') return 'representative';
      return saved;
    }
    return realRole;
  });

  const handleSetActiveView = (val: string) => {
    setActiveView(val);
    localStorage.setItem(`painel_active_view_${user.uid}`, val);
  };

  const activeTheme = THEMES.find(t => t.key === activeThemeKey) || THEMES[0];

  const handleSelectTheme = (key: string) => {
    setActiveThemeKey(key);
    localStorage.setItem('app_theme_key', key);
    setIsSettingsOpen(false);
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    () => (localStorage.getItem('painel_active_tab') as ActiveTab) || 'main'
  );
  const handleSetActiveTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    localStorage.setItem('painel_active_tab', tab);
  };
  const [viewDate, setViewDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('cleaning');
  const [mockDateStr, setMockDateStr] = useState('');
  const [residentSelectedDay, setResidentSelectedDay] = useState<{ dayNumber: number; dayTasks: any[] } | null>(null);
  const [isClearMonthModalOpen, setIsClearMonthModalOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    initialValue: string;
    onSave: (val: string) => void;
  } | null>(null);

  // ── Automatic room assignment ──────────────────────────────────────────────
  const getAutomaticRoomsForDate = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day, 12, 0, 0, 0);
    const dayOfWeek = d.getDay();
    let weekNumber = getWeekNumber(d);
    if (config?.coletivoWeekends?.length) {
      const past = config.coletivoWeekends.filter(ds => {
        const [y, m, dn] = ds.split('-');
        return getWeekNumber(new Date(+y, +m - 1, +dn, 12, 0, 0, 0)) <= weekNumber;
      });
      weekNumber -= past.length;
    }
    const rot = ['101', '102', '103', '104', '105'];
    const weekKeyStr = `W${year}-${String(weekNumber).padStart(2, '0')}`;
    const monthKeyStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const wo = getEffectiveOffset(config?.weeklyOffsets, weekKeyStr, config?.weeklyRotationOffset ?? 0);
    const mo = getEffectiveOffset(config?.monthlyOffsets, monthKeyStr, config?.monthlyRotationOffset ?? 0);
    const absent = config?.absentRooms || [];
    
    // Semanal — pula quartos ausentes
    let wi = ((weekNumber + 3 + wo) % rot.length + rot.length) % rot.length;
    for (let t = 0; t < rot.length && absent.includes(rot[wi]); t++) wi = (wi + 1) % rot.length;
    const weeklyRoom = rot[wi];

    // Mensal — pula quartos ausentes
    let mi = (((year - 2024) * 12 + month + 2 + mo) % rot.length + rot.length) % rot.length;
    for (let t = 0; t < rot.length && absent.includes(rot[mi]); t++) mi = (mi + 1) % rot.length;
    const monthlyRoom = rot[mi];

    return {
      cleaning: weeklyRoom, maintenance: weeklyRoom,
      fridge: monthlyRoom, products: monthlyRoom,
      isCleaningDay: dayOfWeek === 5,
      isMaintenanceDay: dayOfWeek === 3,
      isFridgeDay: dayOfWeek === 4 && day >= 15 && day <= 21,
      isProductsDay: day === 1,
    };
  };

  const today = mockDateStr ? new Date(`${mockDateStr}T12:00:00Z`) : new Date();

  // ── Automatic Snapshot ─────────────────────────────────────────────────────
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  useEffect(() => {
    if (!config || !user || !saveWeeklySnapshot || savingSnapshot) return;
    const todayWeek = getWeekNumber(today);
    const lastWeekNum = todayWeek - 1;
    const year = today.getFullYear();
    const weekKey = `W${year}-${lastWeekNum}`;
    
    // Fast path: se já está no localStorage e não estamos em modo teste/dev, ignora.
    const isMock = !!mockDateStr;
    if (!isMock && localStorage.getItem('saved_snapshot_week') === weekKey) return;

    setSavingSnapshot(true);

    const checkAndSave = async () => {
      try {
        const docRef = doc(db, 'history', weekKey);
        
        // Consulta o servidor diretamente para ver se a escala está salva na nuvem.
        // Timeout de 2.5s para evitar travamento em redes instáveis ou Service Worker antigo.
        const docSnapPromise = getDocFromServer(docRef);
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 2500)
        );

        let docSnap;
        try {
          docSnap = await Promise.race([docSnapPromise, timeoutPromise]);
        } catch (err: any) {
          docSnap = await getDocFromCache(docRef).catch(() => null);
        }
        
        if (docSnap && docSnap.exists()) {
          localStorage.setItem('saved_snapshot_week', weekKey);
          setSavingSnapshot(false);
          return;
        }

        const d = new Date(today.getTime() - 7 * 86400000);
        const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        const auto = getAutomaticRoomsForDate(d.getFullYear(), d.getMonth(), d.getDate());
        const autoMonthly = getAutomaticRoomsForDate(d.getFullYear(), d.getMonth(), 1);

        const base = new Date(2024, 0, 4, 12, 0, 0, 0);
        const startThu = new Date(base.getTime() + lastWeekNum * 7 * 86400000);
        const autoFriday = new Date(startThu.getTime() + 1 * 86400000);
        const autoWednesday = new Date(startThu.getTime() + 6 * 86400000);
        const autoProducts = new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
        let autoFridge = new Date(d.getFullYear(), d.getMonth(), 15, 12, 0, 0, 0);
        while (autoFridge.getDay() !== 4) autoFridge = new Date(autoFridge.getTime() + 86400000);

        const fmt = (date: Date) => `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;

        const clnStr = config.cleaningDay ?? '';
        const mntStr = config.maintenanceDay ?? '';
        const prdStr = config.buyingProductsDay ?? '';
        const frgStr = config.fridgeCleaningDay ?? '';

        const clnEx = clnStr && getWeekNumber(new Date(clnStr + "T12:00:00Z")) === lastWeekNum ? clnStr : fmt(autoFriday);
        const mntEx = mntStr && getWeekNumber(new Date(mntStr + "T12:00:00Z")) === lastWeekNum ? mntStr : fmt(autoWednesday);
        const prdEx = prdStr.startsWith(monthKey) ? prdStr : fmt(autoProducts);
        const frgEx = frgStr.startsWith(monthKey) ? frgStr : fmt(autoFridge);

        const isColetivoInWeek = !!config.coletivoWeekends?.some(ds => {
          const [y, m, dn] = ds.split('-');
          const dt = new Date(+y, +m - 1, +dn, 12, 0, 0, 0);
          return getWeekNumber(dt) === lastWeekNum;
        });

        const snapshotData = {
          weekKey,
          monthKey,
          year,
          weekNumber: lastWeekNum,
          cleaningRoom: isColetivoInWeek ? 'Coletivo' : ((clnEx === clnStr) ? (config.cleaningResponsible || auto.cleaning) : auto.cleaning),
          maintenanceRoom: isColetivoInWeek ? 'Coletivo' : ((mntEx === mntStr) ? (config.maintenanceResponsible || auto.maintenance) : auto.maintenance),
          fridgeRoom: (frgEx === frgStr) ? (config.fridgeCleaningResponsible || autoMonthly.fridge) : autoMonthly.fridge,
          productsRoom: (prdEx === prdStr) ? (config.buyingProductsResponsible || autoMonthly.products) : autoMonthly.products,
          cleaningExactDate: clnEx,
          maintenanceExactDate: mntEx,
          fridgeExactDate: frgEx,
          productsExactDate: prdEx,
        };

        await saveWeeklySnapshot(snapshotData);
        localStorage.setItem('saved_snapshot_week', weekKey);
      } catch (e) {
        console.error('Erro ao salvar snapshot semanal:', e);
      } finally {
        setSavingSnapshot(false);
      }
    };

    checkAndSave();
  }, [config, user, today.getTime(), mockDateStr]);

  // ── Offset helpers ─────────────────────────────────────────────────────────
  const calcWeeklyOffsetUpdates = (targetRoom: string) => {
    const rot = ['101','102','103','104','105'];
    const absent = config?.absentRooms || [];
    let adj = getWeekNumber(today);
    if (config?.coletivoWeekends?.length) {
      adj -= config.coletivoWeekends.filter(ds => {
        const [y,m,d] = ds.split('-');
        return getWeekNumber(new Date(+y,+m-1,+d,12,0,0,0)) <= adj;
      }).length;
    }
    const bi = (adj + 3) % rot.length;
    let newOffset = 0;
    for (let off = 0; off < rot.length; off++) {
       let wi = ((bi + off) % rot.length + rot.length) % rot.length;
       for (let t = 0; t < rot.length && absent.includes(rot[wi]); t++) wi = (wi + 1) % rot.length;
       if (rot[wi] === targetRoom) { newOffset = off; break; }
    }
    const weekKey = `W${today.getFullYear()}-${String(getWeekNumber(today)).padStart(2, '0')}`;
    return { weeklyOffsets: { ...(config?.weeklyOffsets || {}), [weekKey]: newOffset } };
  };

  // Geladeira: o responsável sempre é pelo mês corrente (vira no dia 01)
  const calcFridgeOffsetUpdates = (targetRoom: string) => {
    const rot = ['101','102','103','104','105'];
    const absent = config?.absentRooms || [];
    const yr = today.getFullYear();
    const mo = today.getMonth(); // mês corrente, sem antecipação
    const bi = ((yr - 2024) * 12 + mo + 2) % rot.length;
    let newOffset = 0;
    for (let off = 0; off < rot.length; off++) {
       let mi = ((bi + off) % rot.length + rot.length) % rot.length;
       for (let t = 0; t < rot.length && absent.includes(rot[mi]); t++) mi = (mi + 1) % rot.length;
       if (rot[mi] === targetRoom) { newOffset = off; break; }
    }
    const monthKey = `${yr}-${String(mo + 1).padStart(2, '0')}`;
    return { monthlyOffsets: { ...(config?.monthlyOffsets || {}), [monthKey]: newOffset } };
  };

  // Compras: a partir do dia 20, já exibe e salva o responsável do próximo mês
  const calcProductsOffsetUpdates = (targetRoom: string) => {
    const rot = ['101','102','103','104','105'];
    const absent = config?.absentRooms || [];
    const yr = today.getFullYear();
    const mo = today.getMonth();
    const dy = today.getDate();
    // Se já é dia >= 20, registra o offset para o PRÓXIMO mês
    const pivotMo = dy >= 20 ? mo + 1 : mo;
    const pivotYr = pivotMo > 11 ? yr + 1 : yr;
    const normalizedMo = pivotMo % 12;
    const bi = ((pivotYr - 2024) * 12 + normalizedMo + 2) % rot.length;
    let newOffset = 0;
    for (let off = 0; off < rot.length; off++) {
       let mi = ((bi + off) % rot.length + rot.length) % rot.length;
       for (let t = 0; t < rot.length && absent.includes(rot[mi]); t++) mi = (mi + 1) % rot.length;
       if (rot[mi] === targetRoom) { newOffset = off; break; }
    }
    const monthKey = `${pivotYr}-${String(normalizedMo + 1).padStart(2, '0')}`;
    return { monthlyOffsets: { ...(config?.monthlyOffsets || {}), [monthKey]: newOffset } };
  };

  /** @deprecated Use calcFridgeOffsetUpdates or calcProductsOffsetUpdates */
  const calcMonthlyOffsetUpdates = calcFridgeOffsetUpdates;

  // ── Absent rooms toggle (só rep) ────────────────────────────────────────
  const handleToggleAbsent = (room: string) => {
    const current = config?.absentRooms || [];
    const roomsToRotate = ['101', '102', '103', '104', '105'];
    
    if (!current.includes(room)) {
      const futureAbsentCount = current.length + 1;
      if (futureAbsentCount >= roomsToRotate.length) {
        showToast("Você não pode marcar todos os quartos como ausentes. Pelo menos um quarto deve estar disponível para a escala.", 'error');
        return;
      }
    }

    updateConfig({
      absentRooms: current.includes(room)
        ? current.filter(r => r !== room)
        : [...current, room],
    });
  };

  const activeAutoDates = React.useMemo(() => {
    let d = new Date(today); let dw = d.getDay();
    let lastThu = new Date(d.getTime() - ((dw - 4 + 7) % 7) * 86400000);
    if (config?.coletivoWeekends?.length) {
      let skipped = true;
      let maxIter = 52;
      while (skipped && maxIter-- > 0) {
        const cur = getWeekNumber(lastThu);
        skipped = config.coletivoWeekends.some(ds => {
          const [y,m,dn] = ds.split('-');
          return getWeekNumber(new Date(+y,+m-1,+dn,12,0,0,0)) === cur;
        });
        if (skipped) lastThu = new Date(lastThu.getTime() + 7*86400000);
      }
    }
    const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    return {
      cleaningKey: fmt(new Date(lastThu.getTime() + 86400000)),
      maintenanceKey: fmt(new Date(lastThu.getTime() + 6*86400000)),
    };
  }, [today.getTime(), config?.coletivoWeekends]);

  const curRooms = getAutomaticRoomsForDate(today.getFullYear(), today.getMonth(), today.getDate());

  // Geladeira: vira no dia 01 de cada mês — usa o mês corrente sem ajuste
  const fridgePivotYear  = today.getFullYear();
  const fridgePivotMonth = today.getMonth();       // mes corrente (começa a valer desde o dia 1)
  const fridgePivotRooms = getAutomaticRoomsForDate(fridgePivotYear, fridgePivotMonth, 15); // 15 garante Thursday 15-21

  // Compras: vira no dia 20 — a partir do dia 20 já mostra o responsável do MÊS SEGUINTE
  const todayDay = today.getDate();
  const productsPivotDate = todayDay >= 20
    ? new Date(today.getFullYear(), today.getMonth() + 1, 1)   // próximo mês
    : new Date(today.getFullYear(), today.getMonth(), 1);      // mês corrente
  const productsPivotRooms = getAutomaticRoomsForDate(
    productsPivotDate.getFullYear(), productsPivotDate.getMonth(), 1
  );

  // Helper: só usa o valor do config se for string válida
  const cfgStr = (v: any): string | undefined => (typeof v === 'string' && v ? v : undefined);

  const currentCleaningResponsible       = cfgStr(config?.cleaningResponsible)    || curRooms.cleaning;
  const currentMaintenanceResponsible    = cfgStr(config?.maintenanceResponsible) || curRooms.maintenance;
  const currentFridgeResponsible         = cfgStr(config?.fridgeCleaningResponsible) || fridgePivotRooms.fridge;
  const currentBuyingProductsResponsible = cfgStr(config?.buyingProductsResponsible) || productsPivotRooms.products;

  useEffect(() => {
    if (mockDateStr) {
      const md = new Date(`${mockDateStr}T12:00:00Z`);
      setViewDate(new Date(md.getFullYear(), md.getMonth(), 1));
    }
  }, [mockDateStr]);
  
  const isRep = activeView === 'representative' || activeView === 'dev';
  const isDev = activeView === 'dev';
  
  // Real roles (used to restrict who can see the Settings View Mode selector)
  const canChangeView = realRole === 'dev' || realRole === 'representative';

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: e.target.value });
    } catch (err) {
      console.error('Erro ao mudar cargo', err);
      showToast('Erro ao alterar cargo. Verifique sua conexão e permissões.', 'error');
    }
  };

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const currentMonth = viewDate.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

  // ── Day tasks resolver (memoizado) ──────────────────────────────────────────
  const allDaysTasks = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const mp = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const result = new Map<number, ReturnType<typeof computeDayTasks>>();

    for (let day = 1; day <= daysInMonth; day++) {
      result.set(day, computeDayTasks(year, month, day));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewDate.getFullYear(), viewDate.getMonth(), daysInMonth,
    config?.cleaningDay, config?.maintenanceDay, config?.fridgeCleaningDay, config?.buyingProductsDay,
    config?.cleaningResponsible, config?.maintenanceResponsible, config?.fridgeCleaningResponsible, config?.buyingProductsResponsible,
    config?.schedule, config?.coletivoWeekends, config?.weeklyRotationOffset, config?.monthlyRotationOffset, config?.absentRooms,
    activeAutoDates.cleaningKey, activeAutoDates.maintenanceKey, lang, t,
  ]);

  function computeDayTasks(year: number, month: number, dayNum: number) {
    const mp = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const dKey = `${mp}${String(dayNum).padStart(2, '0')}`;
    const auto = getAutomaticRoomsForDate(year, month, dayNum);
    const curDate = new Date(year, month, dayNum, 12, 0, 0, 0);
    const curWeek = getWeekNumber(curDate);
    const isColetivoWeek = !!config?.coletivoWeekends?.some(ds => {
      const [y, m, d] = ds.split('-');
      return getWeekNumber(new Date(+y, +m - 1, +d, 12, 0, 0, 0)) === curWeek;
    });
    const chk = (manualDay: string | undefined, isAuto: boolean) => {
      if (typeof manualDay === 'string') {
        if (manualDay.startsWith(mp)) return manualDay === dKey;
      }
      return isAuto;
    };
    const isCln = chk(config?.cleaningDay, dKey === activeAutoDates.cleaningKey && !isColetivoWeek);
    const isMnt = chk(config?.maintenanceDay, dKey === activeAutoDates.maintenanceKey && !isColetivoWeek);
    const isFrg = chk(config?.fridgeCleaningDay, auto.isFridgeDay);
    const isPrd = chk(config?.buyingProductsDay, auto.isProductsDay);
    const aRoom = config?.schedule ? config.schedule[dKey] : undefined;
    const isManualCleaning = config?.cleaningDay === dKey;
    const isManualMaintenance = config?.maintenanceDay === dKey;
    const isManualFridge = config?.fridgeCleaningDay === dKey;
    const isManualProducts = config?.buyingProductsDay === dKey;

    const tasks: DayTask[] = [];
    // Garante que o responsável é string (evita objeto deleteField() em caso de cache desatualizado)
    const safeStr = (v: any): string | undefined => (typeof v === 'string' ? v : undefined);
    const cleanResp   = safeStr(config?.cleaningResponsible);
    const maintResp   = safeStr(config?.maintenanceResponsible);
    const fridgeResp  = safeStr(config?.fridgeCleaningResponsible);
    const prodResp    = safeStr(config?.buyingProductsResponsible);
    if (isCln) tasks.push({ id: 'clean', shortType: lang === 'en' ? t.cleaning : 'Limpeza', type: t.cleaning, color: 'sky', room: aRoom || cleanResp || auto.cleaning, isManual: isManualCleaning });
    if (isMnt) tasks.push({ id: 'maint', shortType: lang === 'en' ? t.maintenance : 'Manutenção', type: t.maintenance, color: 'amber', room: aRoom || maintResp || auto.maintenance, isManual: isManualMaintenance });
    if (isFrg) tasks.push({ id: 'fridge', shortType: lang === 'en' ? t.fridgeCleaning : 'L. Geladeira', type: t.fridgeCleaning, color: 'teal', room: aRoom || fridgeResp || auto.fridge, isManual: isManualFridge });
    if (isPrd) tasks.push({ id: 'prod', shortType: lang === 'en' ? t.buyingProducts : 'Compra', type: t.buyingProducts, color: 'pink', room: aRoom || prodResp || auto.products, isManual: isManualProducts });
    if (config?.coletivoWeekends?.includes(dKey)) tasks.push({ id: 'coletivo', shortType: t.coletivo, type: t.coletivo, color: 'purple', room: 'Coletivo', isManual: false });
    if (!tasks.length && aRoom) tasks.push({ id: 'manual', shortType: lang === 'en' ? 'Manual Task' : 'Tarefa', type: lang === 'en' ? 'Manual Task' : 'Tarefa Manual', color: 'emerald', room: aRoom, isManual: true });
    return { dayTasks: tasks, assignedRoom: aRoom, isCln, isMnt, isFrg, isPrd, auto };
  }

  const getFinalDaysAndTasks = useCallback((year: number, month: number, dayNum: number) => {
    // Usa o mapa memoizado se for o mês atual, senão calcula sob demanda
    if (year === viewDate.getFullYear() && month === viewDate.getMonth()) {
      return allDaysTasks.get(dayNum) ?? computeDayTasks(year, month, dayNum);
    }
    return computeDayTasks(year, month, dayNum);
  }, [viewDate.getFullYear(), viewDate.getMonth(), allDaysTasks]);

  // ── Day click ──────────────────────────────────────────────────────────────
  const handleDayClick = (day: number) => {
    const dKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const { isCln, isMnt, isFrg, isPrd, auto, dayTasks } = getFinalDaysAndTasks(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (!isRep) { setResidentSelectedDay({ dayNumber: day, dayTasks }); return; }

    const syncHistory = async (type: 'fridge'|'products', newDate: string) => {
      // Find the correct week snapshot to update
      const targetDate = new Date(newDate + "T12:00:00Z");
      const weekNum = getWeekNumber(targetDate);
      const weekKey = `W${targetDate.getFullYear()}-${weekNum}`;
      
      try {
        const historyRef = doc(db, 'history', weekKey);
        const update: any = {};
        if (type === 'fridge') update.fridgeExactDate = newDate;
        if (type === 'products') update.productsExactDate = newDate;
        await updateDoc(historyRef, update);
      } catch (e) {
        // History might not exist yet for this week, which is fine
      }
    };

    const cycle = (isFinal: boolean, curDay: string|undefined, curResp: string|undefined, autoRoom: string|undefined,
      dayF: string, respF: string) => {
      const dw = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
      const isWE = dw === 0 || dw === 6;
      let newCols = [...(config.coletivoWeekends || [])];
      let upd: any = {};
      
      if (isFinal) {
        // Se clicar em um dia que já tem a tarefa, removemos a data manual (volta para o automático original do sistema)
        upd = { [dayF]: deleteField() };
        if (isWE) newCols = newCols.filter(d => d !== dKey);
      } else {
        // Se clicar em um dia novo, apenas movemos a data da tarefa para este dia, mantendo o morador atual
        upd = { [dayF]: dKey };
        if (isWE) newCols = newCols.filter(d => d !== dKey);
        if (dayF === 'fridgeCleaningDay') syncHistory('fridge', dKey);
        if (dayF === 'buyingProductsDay') syncHistory('products', dKey);
      }
      
      if (isWE) upd.coletivoWeekends = newCols;
      updateConfig(upd);
    };

    if (calendarMode === 'cleaning') {
      const dw = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
      if (![4, 5, 6, 0, 1].includes(dw)) { showToast("A Limpeza só pode ser agendada entre Quinta e Segunda-feira.", 'error'); return; }
      // Validação de conflito: não permite limpeza manual em fim de semana coletivo
      if ((dw === 0 || dw === 6) && config.coletivoWeekends?.includes(dKey)) {
        showToast("Este fim de semana já está marcado como Coletivo. Remova o Coletivo primeiro.", 'error');
        return;
      }
      cycle(isCln, config.cleaningDay, config.cleaningResponsible, auto.cleaning, 'cleaningDay', 'cleaningResponsible');
    }
    else if (calendarMode === 'maintenance') {
      const dw = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
      if (![2, 3, 4].includes(dw)) { showToast(t.maintenanceOnlyTueThu, 'error'); return; }
      cycle(isMnt, config.maintenanceDay, config.maintenanceResponsible, auto.maintenance, 'maintenanceDay', 'maintenanceResponsible');
    }
    else if (calendarMode === 'fridge')   cycle(isFrg, config.fridgeCleaningDay,   config.fridgeCleaningResponsible,  auto.fridge,      'fridgeCleaningDay',  'fridgeCleaningResponsible');
    else if (calendarMode === 'products') cycle(isPrd, config.buyingProductsDay,    config.buyingProductsResponsible,  auto.products,    'buyingProductsDay',  'buyingProductsResponsible');
    else if (calendarMode === 'coletivo') {
      const dw = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
      if (dw === 0 || dw === 6) {
        // Validação de conflito: não permite coletivo em dia com escala manual de limpeza
        const hasManualCleaning = config.cleaningDay === dKey;
        if (hasManualCleaning) {
          showToast("Este dia já tem Limpeza manual agendada. Remova a escala manual antes de marcar como Coletivo.", 'error');
          return;
        }
        let c = [...(config.coletivoWeekends || [])];
        updateConfig({ coletivoWeekends: c.includes(dKey) ? c.filter(d => d !== dKey) : [...c, dKey] });
      }
    }
  };

  // ── Clear month ────────────────────────────────────────────────────────────
  const handleClearMonthClick = () => {
    if (!isRep) return;
    setIsClearMonthModalOpen(true);
  };

  const confirmClearMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const mp = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const daysInMonthCurrent = new Date(year, month + 1, 0).getDate();

    const newSch = { ...config.schedule };
    Object.keys(newSch).forEach(k => {
      // Remove chaves no formato ISO do mês atual (YYYY-MM-DD)
      if (k.startsWith(mp)) {
        delete newSch[k];
        return;
      }
      // Remove chaves numéricas (formato legado "1", "15", etc.) APENAS se
      // correspondem a dias válidos do mês atual (1..daysInMonth).
      // Isso evita apagar acidentalmente dados de outros meses.
      if (/^\d{1,2}$/.test(k)) {
        const dayNum = parseInt(k, 10);
        if (dayNum >= 1 && dayNum <= daysInMonthCurrent) {
          delete newSch[k];
        }
      }
    });

    const upd: any = { schedule: newSch };
    const fields: [string, any][] = [
      ['cleaningDay', config.cleaningDay], ['maintenanceDay', config.maintenanceDay],
      ['fridgeCleaningDay', config.fridgeCleaningDay], ['buyingProductsDay', config.buyingProductsDay],
    ];
    fields.forEach(([k, v]) => { if (typeof v === 'string' && v.startsWith(mp)) upd[k] = deleteField(); });
    if (config.coletivoWeekends?.length) {
      const nc = config.coletivoWeekends.filter(d => !d.startsWith(mp));
      if (nc.length !== config.coletivoWeekends.length) upd.coletivoWeekends = nc;
    }
    updateConfig(upd);
  };

  const currentRuleBlocks = config.ruleBlocks?.length
    ? config.ruleBlocks
    : [{ id: 'legacy', title: config.rulesTitle || 'Tarefas do Banheiro e Alas', rules: config.cleaningRules || [] }];
  const currentGeneralRuleBlocks = config.generalRuleBlocks || [];

  const defTabMain = 'Escalas e Atividades';
  const defTabRules = 'Tarefas da Limpeza';
  const defTabGenRules = 'Regras da Ala';
  const defTabLinks = 'Links Úteis';
  const defTabProducts = 'Estoque';
  const defTabMaintenance = 'Manutenção';

  const NAV_TABS: { key: ActiveTab; label: string; mobileLabel: string; icon: React.ReactNode; configKey?: keyof typeof config }[] = [
    { key: 'main',         label: (lang === 'en' && config.tabMainName === defTabMain) ? t.tabMain : (config.tabMainName || t.tabMain),         mobileLabel: lang === 'pt' ? 'Escalas'    : 'Schedules', icon: <CalendarDays size={22} />,  configKey: 'tabMainName' },
    { key: 'rules',        label: (lang === 'en' && config.tabRulesName === defTabRules) ? t.tabRules : (config.tabRulesName || t.tabRules),        mobileLabel: lang === 'pt' ? 'Limpeza'    : 'Cleaning',  icon: <CheckSquare size={22} />,   configKey: 'tabRulesName' },
    { key: 'general_rules',label: (lang === 'en' && config.tabGeneralRulesName === defTabGenRules) ? t.tabGeneralRules : (config.tabGeneralRulesName || t.tabGeneralRules), mobileLabel: lang === 'pt' ? 'Regras'     : 'Rules',     icon: <BookOpen size={22} />,      configKey: 'tabGeneralRulesName' },
    { key: 'links',        label: (lang === 'en' && config.tabLinksName === defTabLinks) ? t.tabLinks : (config.tabLinksName || t.tabLinks),        mobileLabel: 'Links',                                   icon: <Link2 size={22} />,         configKey: 'tabLinksName' },
    { key: 'products',     label: (lang === 'en' && config.tabProductsName === defTabProducts) ? t.tabProducts : (config.tabProductsName || t.tabProducts),     mobileLabel: lang === 'pt' ? 'Estoque'    : 'Stock',     icon: <Package size={22} />,       configKey: 'tabProductsName' },
    { key: 'maintenance',  label: (lang === 'en' && config.tabMaintenanceName === defTabMaintenance) ? t.tabMaintenance : (config.tabMaintenanceName || t.tabMaintenance),  mobileLabel: lang === 'pt' ? 'Manu-\ntenção' : 'Maint.',  icon: <Wrench size={22} />,        configKey: 'tabMaintenanceName' },
  ];

  if (isDev) {
    NAV_TABS.push({ key: 'users', label: t.tabUsers, mobileLabel: lang === 'pt' ? 'Usuários' : 'Users', icon: <Users size={22} /> });
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-neutral-100 font-sans transition-colors duration-300">
      <style>{`
        :root {
          --theme-bg: ${activeTheme.bg};
          --theme-header-bg: ${activeTheme.headerBg};
          --theme-header-border: ${activeTheme.headerBorder};
          --theme-primary: ${activeTheme.primary};
          --theme-primary-hover: ${activeTheme.primaryHover};
          --theme-card-bg: ${activeTheme.cardBg};
          --theme-card-border: ${activeTheme.cardBorder};
          --theme-accent-light: ${activeTheme.accentLight};
        }

        /* Sobrescritas globais e dinâmicas de contêineres padrões */
        .min-h-screen {
          background-color: var(--theme-bg) !important;
        }
        .bg-neutral-800, .bg-neutral-800\\/50 {
          background-color: var(--theme-card-bg) !important;
        }
        .border-neutral-700, .border-neutral-700\\/50 {
          border-color: var(--theme-card-border) !important;
        }
        .bg-neutral-900, .bg-neutral-900\\/50, .bg-neutral-900\\/95 {
          background-color: var(--theme-bg) !important;
        }

        /* Inputs e Foco */
        .focus-within\\:border-sky-500\\/50:focus-within {
          border-color: var(--theme-primary) !important;
        }

        /* Botões Padrões de Ação */
        .bg-sky-600 {
          background-color: var(--theme-primary) !important;
        }
        .hover\\:bg-sky-700:hover, .hover\\:bg-sky-500:hover {
          background-color: var(--theme-primary-hover) !important;
        }
        
        /* Fundos de Alerta e Painéis Informativos */
        .bg-sky-900\\/20, .bg-sky-950\\/40, .bg-sky-900\\/40 {
          background-color: var(--theme-accent-light) !important;
          border-color: rgba(56, 189, 248, 0.1) !important;
        }
        .border-sky-800\\/50, .border-sky-700\\/50 {
          border-color: var(--theme-card-border) !important;
        }
        
        /* Textos Destacáveis */
        .text-sky-400, .text-sky-500, .text-sky-300 {
          color: var(--theme-primary) !important;
        }
        .text-sky-200, .text-sky-200\\/80, .text-sky-200\\/95 {
          color: var(--theme-primary) !important;
          opacity: 0.9;
        }
        
        /* Elementos selecionados no calendário/marcações */
        .bg-sky-600\\/80 {
          background-color: var(--theme-primary) !important;
          opacity: 0.9;
        }
        
        .hover\\:text-sky-400:hover {
          color: var(--theme-primary) !important;
        }
      `}</style>
      <ToastContainer />
      <header className="bg-[var(--theme-header-bg)] text-white shadow-lg border-b border-[var(--theme-header-border)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex justify-between items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <ClipboardList className="h-7 w-7 sm:h-8 sm:w-8 text-sky-400 shrink-0" />
              <h1 className={`text-xl sm:text-[28px] font-bold tracking-tight leading-none truncate ${isDev ? 'cursor-pointer hover:underline decoration-dashed decoration-sky-400' : ''}`}
                onClick={() => { if (!isDev) return; setPromptConfig({ isOpen: true, title: t.editMainTitle, initialValue: config.appTitle || t.appTitle, onSave: (val) => updateConfig({ appTitle: val }) }); }}
                title={isDev ? t.editMainTitle : ""}>
                {config.appTitle || t.appTitle}
              </h1>
            </div>
            <p className={`mt-2 text-xs sm:text-[15px] text-sky-100/70 italic leading-snug font-light truncate ${isDev ? 'cursor-pointer hover:underline decoration-dashed decoration-sky-400/50 w-max max-w-full' : ''}`}
              onClick={() => { if (!isDev) return; setPromptConfig({ isOpen: true, title: t.editSubtitle, initialValue: config.appSubtitle || t.appSubtitle, onSave: (val) => updateConfig({ appSubtitle: val }) }); }}
              title={isDev ? t.editSubtitle : ""}>
              {config.appSubtitle || t.appSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 relative">

            <NotificationBell
              isDev={isRep}
              onNavigateToTab={(tab) => handleSetActiveTab(tab as any)}
            />
            <div className="relative h-8 sm:h-9">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="flex items-center gap-2 h-full bg-black/10 hover:bg-black/20 text-white border border-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-sm font-medium"
                title={t.settings}
              >
                <Settings size={18} className="text-[var(--theme-primary)]" />
              </button>
            </div>
            <div className="flex items-center gap-1 sm:gap-3 bg-black/10 hover:bg-black/20 transition-colors px-2 sm:px-3 py-1.5 rounded-lg border border-white/5 max-w-[160px] sm:max-w-none">
              <div className="text-right flex flex-col justify-center min-w-0">
                <span className="text-xs sm:text-sm font-bold leading-none mb-1 truncate">{user.displayName?.split(' ')[0] || user.email}</span>
                <span className="text-[8px] sm:text-[9px] uppercase font-semibold text-white/60 tracking-wider leading-none truncate">
                  {activeView === 'resident' ? t.roleResident : activeView === 'representative' ? t.roleRep : t.roleDev}
                </span>
              </div>
              <div className="w-px h-6 bg-white/10 mx-1 shrink-0"></div>
              <button onClick={handleSignOut} title={t.signOut} className="text-white/80 hover:text-white transition-colors shrink-0">
                <LogOut size={18} />
              </button>
            </div>

            {isSettingsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+0.5rem)] w-[calc(100vw-2rem)] sm:w-64 max-w-[20rem] sm:max-w-none bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-neutral-800/60 flex items-center gap-2">
                    <Settings size={14} className="text-neutral-400" />
                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">{t.settings}</span>
                  </div>
                  
                  <div className="p-3 space-y-4 max-h-[80vh] overflow-y-auto">
                      {/* Language */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-sky-400 mb-2 block">{t.language}</label>
                        <div className="flex gap-2">
                          <button onClick={() => setLang('pt')} className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${lang === 'pt' ? 'bg-[var(--theme-primary)] text-white border-transparent font-bold' : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'}`}>PT</button>
                          <button onClick={() => setLang('en')} className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${lang === 'en' ? 'bg-[var(--theme-primary)] text-white border-transparent font-bold' : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'}`}>EN</button>
                        </div>
                      </div>

                      {/* View Mode */}
                      {canChangeView && (
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-sky-400 mb-2 block">{t.viewMode}</label>
                          <select value={activeView} onChange={(e) => handleSetActiveView(e.target.value)}
                            className="w-full bg-black/20 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-sky-500 transition-colors appearance-none cursor-pointer">
                            <option value="resident" className="text-black">{t.visionResident}</option>
                            <option value="representative" className="text-black">{t.visionRep}</option>
                            {realRole === 'dev' && <option value="dev" className="text-black">{t.visionDev}</option>}
                          </select>
                        </div>
                      )}

                      {/* Mock Date */}
                      {isDev && (
                        <div>
                          <label htmlFor="mockDateSettings" className="text-[10px] uppercase font-bold tracking-wider text-sky-400 mb-2 block">{t.testDay}</label>
                          <input type="date" id="mockDateSettings" value={mockDateStr} onChange={e => setMockDateStr(e.target.value)}
                            className="w-full bg-black/20 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-sky-500 transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
                        </div>
                      )}

                      {/* Theme */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-sky-400 mb-2 block">{t.theme}</label>
                        <div className="space-y-1">
                          {THEMES.map(tOption => {
                            const isOptionActive = tOption.key === activeThemeKey;
                            let themeName = tOption.name;
                            let themeDesc = tOption.desc;
                            if (tOption.key === 'ocean') { themeName = t.themeOceanName || themeName; themeDesc = t.themeOceanDesc || themeDesc; }
                            else if (tOption.key === 'forest') { themeName = t.themeForestName || themeName; themeDesc = t.themeForestDesc || themeDesc; }
                            else if (tOption.key === 'wine') { themeName = t.themeWineName || themeName; themeDesc = t.themeWineDesc || themeDesc; }
                            else if (tOption.key === 'royal') { themeName = t.themeRoyalName || themeName; themeDesc = t.themeRoyalDesc || themeDesc; }
                            else if (tOption.key === 'carbon') { themeName = t.themeCarbonName || themeName; themeDesc = t.themeCarbonDesc || themeDesc; }

                            return (
                              <button
                                key={tOption.key}
                                onClick={() => handleSelectTheme(tOption.key)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors hover:bg-white/5 ${
                                  isOptionActive ? 'bg-white/5 text-[var(--theme-primary)] font-bold' : 'text-neutral-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="flex -space-x-1">
                                    {tOption.colors.map((c, idx) => (
                                      <span key={idx} className={`w-3.5 h-3.5 rounded-full border border-neutral-900 ${c}`} />
                                    ))}
                                  </div>
                                  <div className="text-left">
                                    <p className="font-semibold">{themeName}</p>
                                    <p className="text-[9px] text-neutral-500 font-normal">{themeDesc}</p>
                                  </div>
                                </div>
                                {isOptionActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="max-w-7xl mx-auto hidden sm:flex overflow-x-auto px-4 sm:px-6 lg:px-8" style={{ scrollbarWidth: 'none' }}>
          {NAV_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <div key={tab.key} className="flex items-center shrink-0">
                <button onClick={() => handleSetActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 font-medium text-[13px] whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                    isActive 
                    ? 'bg-black/10 text-white border-[var(--theme-primary)]' 
                    : 'text-white/60 border-transparent hover:text-white hover:bg-black/5'
                  }`}>
                  {React.cloneElement(tab.icon as React.ReactElement, { size: 16, className: isActive ? 'text-[var(--theme-primary)]' : 'text-white/50' })}
                  {tab.label}
                </button>
                {isDev && (
                  <button onClick={() => setPromptConfig({ isOpen: true, title: `${t.editTabName} (${tab.label})`, initialValue: tab.label, onSave: (val) => updateConfig({ [tab.configKey]: val }) })}
                    className="p-1 -ml-1 mr-2 text-sky-400/50 hover:text-sky-300 bg-black/10 rounded-md transition-colors" title={t.editTabName}>
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === 'main' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-6 flex flex-col">
              <ActivitiesPanel
                config={config}
                isRep={isRep}
                updateConfig={updateConfig}
                calcWeeklyOffsetUpdates={calcWeeklyOffsetUpdates}
                calcFridgeOffsetUpdates={calcFridgeOffsetUpdates}
                calcProductsOffsetUpdates={calcProductsOffsetUpdates}
                currentCleaningResponsible={currentCleaningResponsible}
                currentMaintenanceResponsible={currentMaintenanceResponsible}
                currentFridgeResponsible={currentFridgeResponsible}
                currentBuyingProductsResponsible={currentBuyingProductsResponsible}
                absentRooms={config.absentRooms || []}
                onToggleAbsent={handleToggleAbsent}
              />
            </div>
            <CalendarSection
              config={config}
              isRep={isRep}
              isDev={isDev}
              viewDate={viewDate}
              today={today}
              currentMonth={currentMonth}
              daysInMonth={daysInMonth}
              firstDay={firstDay}
              calendarMode={calendarMode}
              setCalendarMode={setCalendarMode}
              getFinalDaysAndTasks={getFinalDaysAndTasks}
              handleDayClick={handleDayClick}
              handlePrevMonth={handlePrevMonth}
              handleNextMonth={handleNextMonth}
              handleClearMonth={handleClearMonthClick}
            />
          </div>
        )}
        {activeTab === 'rules' && (
          <Suspense fallback={<TabLoading />}>
            <RulesTab config={config} isRep={isRep} updateConfig={updateConfig} currentRuleBlocks={currentRuleBlocks} />
          </Suspense>
        )}
        {activeTab === 'general_rules' && (
          <Suspense fallback={<TabLoading />}>
            <GeneralRulesTab config={config} isRep={isRep} updateConfig={updateConfig} currentGeneralRuleBlocks={currentGeneralRuleBlocks} />
          </Suspense>
        )}
        {activeTab === 'links' && (
          <Suspense fallback={<TabLoading />}>
            <LinksTab links={config?.links} isAdmin={isDev || isRep} updateConfig={updateConfig} />
          </Suspense>
        )}
        {activeTab === 'products' && (
          <Suspense fallback={<TabLoading />}>
            <ProductsTab products={config?.products || []} isRep={isRep} updateProducts={products => updateConfig({ products })}
              fundBalance={config?.fundBalance} updateFundBalance={fundBalance => updateConfig({ fundBalance })} />
          </Suspense>
        )}
        {activeTab === 'maintenance' && (
          <Suspense fallback={<TabLoading />}>
            <MaintenanceTab config={config} isAdmin={isDev || isRep} updateConfig={updateConfig} />
          </Suspense>
        )}
        {activeTab === 'users' && isDev && (
          <UsersTab />
        )}
        </div>
      </main>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-700/80 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.6)] flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {NAV_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => handleSetActiveTab(tab.key)}
              className={`min-w-0 min-w-[50px] shrink flex-1 flex flex-col items-center justify-center gap-1 py-3 px-0.5 transition-all duration-200 relative ${isActive ? 'text-[var(--theme-primary)]' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--theme-primary)]" />}
              <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>{tab.icon}</span>
              <span className="text-[9px] font-semibold leading-tight text-center whitespace-pre-line">{tab.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
      <ConfirmModal isOpen={isClearMonthModalOpen} title={t.clearMonth} message={t.clearMonthConfirm} onConfirm={confirmClearMonth} onCancel={() => setIsClearMonthModalOpen(false)} />
      {residentSelectedDay && <ResidentDayModal dayNumber={residentSelectedDay.dayNumber} dayTasks={residentSelectedDay.dayTasks} onClose={() => setResidentSelectedDay(null)} />}
      {saveError && <ErrorBanner message={saveError} onDismiss={clearSaveError} />}
      {promptConfig?.isOpen && (
        <PromptModal title={promptConfig.title} initialValue={promptConfig.initialValue} onSave={(val) => { promptConfig.onSave(val); setPromptConfig(null); }} onClose={() => setPromptConfig(null)} />
      )}
      <InstallPrompt />
      <UpdatePrompt />
    </div>
  );
}
