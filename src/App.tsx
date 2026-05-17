import React, { useState, useEffect } from 'react';
import { CalendarDays, ClipboardList, Settings, LogOut, Pencil, Languages } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useWingConfig } from './hooks/useWingConfig';
import { ProductsTab } from './ProductsTab';
import { MaintenanceTab } from './components/MaintenanceTab';
import { ActivitiesPanel } from './components/ActivitiesPanel';
import { CalendarSection } from './components/CalendarSection';
import { RulesTab } from './components/RulesTab';
import { GeneralRulesTab } from './components/GeneralRulesTab';
import { LinksTab } from './components/LinksTab';
import { ResidentDayModal } from './components/ResidentDayModal';
import { ErrorBanner } from './components/ErrorBanner';
import { PromptModal } from './components/PromptModal';
import { useLang } from './LanguageContext';

const ROOMS = ['101', '102', '103', '104', '105', 'Coletivo'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

type ActiveTab = 'main' | 'rules' | 'general_rules' | 'links' | 'products' | 'maintenance';
type CalendarMode = 'cleaning' | 'maintenance' | 'fridge' | 'products' | 'coletivo';

export default function App() {
  const { config, updateConfig, loading, profileLoading, user, profile, saveError, clearSaveError, saveWeeklySnapshot } = useWingConfig();
  const { lang, setLang, t } = useLang();
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
  
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    initialValue: string;
    onSave: (val: string) => void;
  } | null>(null);

  // ── Wipe legacy keys once ──────────────────────────────────────────────────
  useEffect(() => {
    if (config !== undefined && !localStorage.getItem('wiped_all_manual_200')) {
      const legacy = ['schedule','cleaningDay','maintenanceDay','fridgeCleaningDay','buyingProductsDay',
        'cleaningResponsible','maintenanceResponsible','fridgeCleaningResponsible','buyingProductsResponsible'];
      const updates: any = {};
      let needs = false;
      for (const k of legacy) {
        if (config && typeof config === 'object' && k in config) { updates[k] = deleteField(); needs = true; }
      }
      if (needs) updateConfig(updates);
      localStorage.setItem('wiped_all_manual_200', 'true');
    }
  }, [config, updateConfig]);

  // ── Week number helper ─────────────────────────────────────────────────────
  const getWeekNumber = (d: Date) => {
    const dw = d.getDay();
    const dst = (dw - 4 + 7) % 7;
    const lastThu = new Date(d.getTime() - dst * 86400000);
    const base = new Date(2024, 0, 4, 12, 0, 0, 0);
    return Math.round((lastThu.getTime() - base.getTime()) / (7 * 86400000));
  };

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
    const wo = config?.weeklyRotationOffset ?? 0;
    const mo = config?.monthlyRotationOffset ?? 0;
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
      isFridgeDay: dayOfWeek === 4 && d.getDate() >= 15 && d.getDate() <= 21,
      isProductsDay: d.getDate() === 1,
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
    
    if (localStorage.getItem('saved_snapshot_week') === weekKey) return;

    setSavingSnapshot(true);
    // Use a target date from last week to compute things
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

    const clnStr = typeof config.cleaningDay === 'string' ? config.cleaningDay : '';
    const mntStr = typeof config.maintenanceDay === 'string' ? config.maintenanceDay : '';
    const prdStr = typeof config.buyingProductsDay === 'string' ? config.buyingProductsDay : '';
    const frgStr = typeof config.fridgeCleaningDay === 'string' ? config.fridgeCleaningDay : '';

    const clnEx = clnStr && getWeekNumber(new Date(clnStr + "T12:00:00Z")) === lastWeekNum ? clnStr : fmt(autoFriday);
    const mntEx = mntStr && getWeekNumber(new Date(mntStr + "T12:00:00Z")) === lastWeekNum ? mntStr : fmt(autoWednesday);
    const prdEx = prdStr.startsWith(monthKey) ? prdStr : fmt(autoProducts);
    const frgEx = frgStr.startsWith(monthKey) ? frgStr : fmt(autoFridge);

    const snapshotData = {
      weekKey,
      monthKey,
      year,
      weekNumber: lastWeekNum,
      cleaningRoom: (clnEx === clnStr) ? (config.cleaningResponsible || auto.cleaning) : auto.cleaning,
      maintenanceRoom: (mntEx === mntStr) ? (config.maintenanceResponsible || auto.maintenance) : auto.maintenance,
      fridgeRoom: (frgEx === frgStr) ? (config.fridgeCleaningResponsible || autoMonthly.fridge) : autoMonthly.fridge,
      productsRoom: (prdEx === prdStr) ? (config.buyingProductsResponsible || autoMonthly.products) : autoMonthly.products,
      cleaningExactDate: clnEx,
      maintenanceExactDate: mntEx,
      fridgeExactDate: frgEx,
      productsExactDate: prdEx,
    };

    saveWeeklySnapshot(snapshotData).then(() => {
      localStorage.setItem('saved_snapshot_week', weekKey);
    }).catch(e => {
      console.error('Erro ao salvar snapshot semanal:', e);
    }).finally(() => {
      setSavingSnapshot(false);
    });
  }, [config, user, today.getTime()]);



  // ── Offset helpers ─────────────────────────────────────────────────────────
  const calcWeeklyOffset = (targetRoom: string) => {
    const rot = ['101','102','103','104','105'];
    const ni = rot.indexOf(targetRoom); if (ni === -1) return config?.weeklyRotationOffset ?? 0;
    let adj = getWeekNumber(today);
    if (config?.coletivoWeekends?.length) {
      adj -= config.coletivoWeekends.filter(ds => {
        const [y,m,d] = ds.split('-');
        return getWeekNumber(new Date(+y,+m-1,+d,12,0,0,0)) <= adj;
      }).length;
    }
    return ((ni - (adj + 3) % rot.length) % rot.length + rot.length) % rot.length;
  };

  const calcMonthlyOffset = (targetRoom: string) => {
    const rot = ['101','102','103','104','105'];
    const ni = rot.indexOf(targetRoom); if (ni === -1) return config?.monthlyRotationOffset ?? 0;
    const [yr, mo, dy] = [today.getFullYear(), today.getMonth(), today.getDate()];
    const bi = ((yr - 2024) * 12 + mo + (dy >= 20 ? 1 : 0) + 2) % rot.length;
    return ((ni - bi) % rot.length + rot.length) % rot.length;
  };

  // ── Active auto dates ──────────────────────────────────────────────────────
  // ── Absent rooms toggle (só rep) ────────────────────────────────────────
  const handleToggleAbsent = (room: string) => {
    const current = config?.absentRooms || [];
    const curWeek = getWeekNumber(today);
    updateConfig({
      absentRooms: current.includes(room)
        ? current.filter(r => r !== room)
        : [...current, room],
      absentRoomsWeek: curWeek,
    });
  };

  // ── Auto-clear absent rooms weekly ─────────────────────────────────────────
  useEffect(() => {
    const roleIsRep = profile?.role === 'representative' || profile?.role === 'dev';
    if (!config || !roleIsRep) return;
    const curWeek = getWeekNumber(today);
    if (config.absentRooms?.length && config.absentRoomsWeek !== curWeek) {
      updateConfig({
        absentRooms: [],
        absentRoomsWeek: curWeek,
      });
    }
  }, [config, profile, today]);

  const activeAutoDates = React.useMemo(() => {
    let d = new Date(today); let dw = d.getDay();
    let lastThu = new Date(d.getTime() - ((dw - 4 + 7) % 7) * 86400000);
    if (config?.coletivoWeekends?.length) {
      let skipped = true;
      let maxIter = 52; // Limit loop to prevent potential infinite freeze
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
  const currentCleaningResponsible    = config?.cleaningResponsible    || curRooms.cleaning;
  const currentMaintenanceResponsible = config?.maintenanceResponsible || curRooms.maintenance;
  const currentFridgeResponsible      = config?.fridgeCleaningResponsible || curRooms.fridge;
  const currentBuyingProductsResponsible = config?.buyingProductsResponsible || curRooms.products;

  useEffect(() => {
    if (mockDateStr) {
      const md = new Date(`${mockDateStr}T12:00:00Z`);
      setViewDate(new Date(md.getFullYear(), md.getMonth(), 1));
    }
  }, [mockDateStr]);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const handleSignIn = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(console.error);
  const handleSignOut = () => signOut(auth);

  if (loading || profileLoading) return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
      <div className="animate-pulse flex items-center space-x-2 text-sky-500">
        <Settings className="animate-spin" /><span className="font-medium">{t.loading}</span>
      </div>
    </div>
  );

  if (!user || !config || !profile) return (
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

  const isRep = profile.role === 'representative' || profile.role === 'dev';
  const isDev = profile.role === 'dev';
  const isGabriel = user.email === 'gabrielpinheiro632@gmail.com';

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: e.target.value });
    } catch (err) {
      console.error('Erro ao mudar cargo', err);
      alert('Erro ao alterar cargo. Verifique sua conexão e permissões.');
    }
  };

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const currentMonth = viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

  // ── Day tasks resolver ─────────────────────────────────────────────────────
  const getFinalDaysAndTasks = (year: number, month: number, dayNum: number) => {
    const mp = `${year}-${String(month+1).padStart(2,'0')}-`;
    const dKey = `${mp}${String(dayNum).padStart(2,'0')}`;
    const auto = getAutomaticRoomsForDate(year, month, dayNum);
    const curDate = new Date(year, month, dayNum, 12, 0, 0, 0);
    const curWeek = getWeekNumber(curDate);
    const isColetivoWeek = !!config?.coletivoWeekends?.some(ds => {
      const [y,m,d] = ds.split('-');
      return getWeekNumber(new Date(+y,+m-1,+d,12,0,0,0)) === curWeek;
    });
    const chk = (manualDay: string|undefined, isAuto: boolean) => {
      if (typeof manualDay === 'string') {
        const md = new Date(manualDay + "T12:00:00Z");
        const manualWeek = getWeekNumber(md);
        const todayWeek = getWeekNumber(today);
        if (manualWeek < todayWeek) return isAuto;
        if (manualDay.startsWith(mp)) return manualDay === dKey;
      }
      return isAuto;
    };
    const isCln  = chk(config?.cleaningDay as string,   dKey === activeAutoDates.cleaningKey    && !isColetivoWeek);
    const isMnt  = chk(config?.maintenanceDay as string, dKey === activeAutoDates.maintenanceKey && !isColetivoWeek);
    const isFrg  = chk(config?.fridgeCleaningDay as string, auto.isFridgeDay);
    const isPrd  = chk(config?.buyingProductsDay as string, auto.isProductsDay);
    const aRoom  = config?.schedule ? config.schedule[dKey] : undefined;
    const tasks: any[] = [];
    if (isCln) tasks.push({ id:'clean', shortType:'Limpeza',  type:'Limpeza',          color:'sky',     room: aRoom||config?.cleaningResponsible||auto.cleaning });
    if (isMnt) tasks.push({ id:'maint', shortType:'Manut.',   type:'Manutenção',        color:'amber',   room: aRoom||config?.maintenanceResponsible||auto.maintenance });
    if (isFrg) tasks.push({ id:'fridge',shortType:'L. Gel',   type:'L. Geladeira',      color:'teal',    room: aRoom||config?.fridgeCleaningResponsible||auto.fridge });
    if (isPrd) tasks.push({ id:'prod',  shortType:'Prod.',     type:'Comprar Produtos',  color:'pink',    room: aRoom||config?.buyingProductsResponsible||auto.products });
    if (config?.coletivoWeekends?.includes(dKey)) tasks.push({ id:'coletivo', shortType:'Coletivo', type:'Final de Semana Coletivo', color:'purple', room:'Coletivo' });
    if (!tasks.length && aRoom) tasks.push({ id:'manual', shortType:'Tarefa', type:'Tarefa Manual', color:'emerald', room: aRoom });
    return { dayTasks: tasks, assignedRoom: aRoom, isCln, isMnt, isFrg, isPrd, auto };
  };

  // ── Day click ──────────────────────────────────────────────────────────────
  const handleDayClick = (day: number) => {
    const dKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const mp   = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-`;
    const { isCln, isMnt, isFrg, isPrd, auto, dayTasks } = getFinalDaysAndTasks(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (!isRep) { setResidentSelectedDay({ dayNumber: day, dayTasks }); return; }

    const cycle = (isFinal: boolean, curDay: string|undefined, curResp: string|undefined, autoRoom: string|undefined,
      dayF: any, respF: any) => {
      const dw = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
      const isWE = dw === 0 || dw === 6;
      let newCols = [...(config.coletivoWeekends || [])];
      let upd: any = {};
      if (isFinal) {
        // Remove assignment entirely
        upd = { [dayF]: deleteField(), [respF]: deleteField() };
        if (isWE) newCols = newCols.filter(d => d !== dKey);
      } else {
        // Move task to this day, leaving the room to be determined by the automatic offset
        upd = { [dayF]: dKey, [respF]: deleteField() };
        if (isWE) newCols = newCols.filter(d => d !== dKey);
      }
      if (isWE) upd.coletivoWeekends = newCols;
      updateConfig(upd);
    };

    if (calendarMode === 'cleaning') {
      const dw = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
      if (![4, 5, 6, 0, 1].includes(dw)) {
         alert("A Limpeza só pode ser agendada entre Quinta e Segunda-feira.");
         return;
      }
      cycle(isCln, config.cleaningDay as string, config.cleaningResponsible, auto.cleaning, 'cleaningDay', 'cleaningResponsible');
    }
    else if (calendarMode === 'maintenance') {
      const dw = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
      if (![2, 3, 4].includes(dw)) {
         alert(t.maintenanceOnlyTueThu);
         return;
      }
      cycle(isMnt, config.maintenanceDay as string, config.maintenanceResponsible, auto.maintenance, 'maintenanceDay', 'maintenanceResponsible');
    }
    else if (calendarMode === 'fridge')   cycle(isFrg, config.fridgeCleaningDay as string,   config.fridgeCleaningResponsible,  auto.fridge,      'fridgeCleaningDay',  'fridgeCleaningResponsible');
    else if (calendarMode === 'products') cycle(isPrd, config.buyingProductsDay as string,    config.buyingProductsResponsible,  auto.products,    'buyingProductsDay',  'buyingProductsResponsible');
    else if (calendarMode === 'coletivo') {
      const dw = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
      if (dw === 0 || dw === 6) {
        let c = [...(config.coletivoWeekends || [])];
        updateConfig({ coletivoWeekends: c.includes(dKey) ? c.filter(d => d !== dKey) : [...c, dKey] });
      }
    }
  };

  // ── Clear month ────────────────────────────────────────────────────────────
  const handleClearMonth = () => {
    if (!isRep) return;
    if (!window.confirm(t.clearMonthConfirm)) return;
    const mp = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-`;
    const newSch = { ...config.schedule };
    Object.keys(newSch).forEach(k => { if (k.startsWith(mp) || /^\d{1,2}$/.test(k)) delete newSch[k]; });
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

  // ── Rule blocks ────────────────────────────────────────────────────────────
  const currentRuleBlocks = config.ruleBlocks?.length
    ? config.ruleBlocks
    : [{ id: 'legacy', title: config.rulesTitle || 'Tarefas do Banheiro e Alas', rules: config.cleaningRules || [] }];
  const currentGeneralRuleBlocks = config.generalRuleBlocks || [];

  // ── NAV TABS ───────────────────────────────────────────────────────────────
  const NAV_TABS: { key: ActiveTab; label: string; configKey: keyof typeof config }[] = [
    { key: 'main', label: config.tabMainName || t.tabMain, configKey: 'tabMainName' },
    { key: 'rules', label: config.tabRulesName || t.tabRules, configKey: 'tabRulesName' },
    { key: 'general_rules', label: config.tabGeneralRulesName || t.tabGeneralRules, configKey: 'tabGeneralRulesName' },
    { key: 'links', label: config.tabLinksName || t.tabLinks, configKey: 'tabLinksName' },
    { key: 'products', label: config.tabProductsName || t.tabProducts, configKey: 'tabProductsName' },
    { key: 'maintenance', label: config.tabMaintenanceName || t.tabMaintenance, configKey: 'tabMaintenanceName' },
  ];

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans selection:bg-sky-900 selection:text-sky-100">

      {/* ── Header ── */}
      <header className="bg-sky-900 text-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] border-b border-sky-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <ClipboardList className="h-8 w-8 text-sky-300" />
              <h1 
                className={`text-3xl font-bold tracking-tight ${isDev ? 'cursor-pointer hover:underline decoration-dashed decoration-sky-400' : ''}`}
                onClick={() => {
                  if (!isDev) return;
                  setPromptConfig({
                    isOpen: true,
                    title: t.editMainTitle,
                    initialValue: config.appTitle || t.appTitle,
                    onSave: (val) => updateConfig({ appTitle: val })
                  });
                }}
                title={isDev ? t.editMainTitle : ""}
              >
                {config.appTitle || t.appTitle}
              </h1>
            </div>
            <p 
              className={`mt-2 text-sky-200/80 italic ${isDev ? 'cursor-pointer hover:underline decoration-dashed decoration-sky-400/50 w-max' : ''}`}
              onClick={() => {
                if (!isDev) return;
                setPromptConfig({
                  isOpen: true,
                  title: t.editSubtitle,
                  initialValue: config.appSubtitle || t.appSubtitle,
                  onSave: (val) => updateConfig({ appSubtitle: val })
                });
              }}
              title={isDev ? t.editSubtitle : ""}
            >
              {config.appSubtitle || t.appSubtitle}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {isDev && (
              <div className="flex items-center gap-2 bg-sky-950/40 p-1.5 rounded-md border border-sky-800/30">
                <label htmlFor="mockDate" className="text-[10px] uppercase font-bold tracking-wider text-sky-400">{t.testDay}</label>
                <input type="date" id="mockDate" value={mockDateStr} onChange={e => setMockDateStr(e.target.value)}
                  className="bg-sky-950 text-sky-100 border border-sky-700/50 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500" />
              </div>
            )}
            
            {isGabriel && (
              <select 
                value={profile.role} 
                onChange={handleRoleChange}
                className="bg-sky-950 text-sky-100 border border-sky-700/50 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500"
              >
                <option value="resident">{t.visionResident}</option>
                <option value="representative">{t.visionRep}</option>
                <option value="dev">{t.visionDev}</option>
              </select>
            )}

            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
              title={t.language}
              className="flex items-center gap-1.5 bg-sky-950/60 hover:bg-sky-900/70 border border-sky-800/50 hover:border-sky-600/60 text-sky-200 hover:text-white px-2.5 py-1.5 rounded-lg transition-all text-xs font-bold tracking-wide"
            >
              <Languages size={14} />
              {lang === 'pt' ? 'EN' : 'PT'}
            </button>

            <div className="flex items-center gap-3 bg-sky-950/60 p-2 rounded-lg border border-sky-800/50">
              <div className="text-right">
                <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                <p className="text-xs text-sky-300/80 mt-1 capitalize leading-none">
                  {profile.role === 'resident' ? t.roleResident : profile.role === 'representative' ? t.roleRep : t.roleDev}
                </p>
              </div>
              <button onClick={handleSignOut} title={t.signOut} className="p-2 hover:bg-sky-800 rounded-md transition-colors text-sky-200 hover:text-white">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="max-w-7xl mx-auto flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {NAV_TABS.map(tab => (
            <div key={tab.key} className={`flex items-center shrink-0 border-b-4 transition-colors ${activeTab === tab.key ? 'border-sky-400' : 'border-transparent hover:border-sky-700'}`}>
              <button onClick={() => handleSetActiveTab(tab.key)}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === tab.key ? 'text-sky-100' : 'text-sky-300/70 hover:text-sky-100'
                }`}>
                {tab.label}
              </button>
              {isDev && (
                <button 
                  onClick={() => {
                    setPromptConfig({
                      isOpen: true,
                      title: `${t.editTabName} (${tab.label})`,
                      initialValue: tab.label,
                      onSave: (val) => updateConfig({ [tab.configKey]: val })
                    });
                  }}
                  className="p-1 -ml-1 mr-2 text-sky-400/50 hover:text-sky-300 bg-sky-900/30 rounded-md transition-colors"
                  title={t.editTabName}
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {activeTab === 'main' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-6 flex flex-col">
              <ActivitiesPanel
                config={config}
                isRep={isRep}
                updateConfig={updateConfig}
                calcWeeklyOffset={calcWeeklyOffset}
                calcMonthlyOffset={calcMonthlyOffset}
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
              handleClearMonth={handleClearMonth}
            />
          </div>
        )}

        {activeTab === 'rules' && (
          <RulesTab config={config} isRep={isRep} updateConfig={updateConfig} currentRuleBlocks={currentRuleBlocks} />
        )}

        {activeTab === 'general_rules' && (
          <GeneralRulesTab isRep={isRep} updateConfig={updateConfig} currentGeneralRuleBlocks={currentGeneralRuleBlocks} />
        )}

        {activeTab === 'links' && (
          <LinksTab links={config?.links} isAdmin={isDev || isRep} updateConfig={updateConfig} />
        )}
        {activeTab === 'products' && (
          <ProductsTab
            products={config?.products || []}
            isRep={isRep}
            updateProducts={products => updateConfig({ products })}
            fundBalance={config?.fundBalance}
            updateFundBalance={fundBalance => updateConfig({ fundBalance })}
          />
        )}
        {activeTab === 'maintenance' && (
          <MaintenanceTab config={config} isAdmin={isDev || isRep} updateConfig={updateConfig} />
        )}
      </main>

      {/* ── Modals ── */}
      {residentSelectedDay && (
        <ResidentDayModal
          dayNumber={residentSelectedDay.dayNumber}
          dayTasks={residentSelectedDay.dayTasks}
          onClose={() => setResidentSelectedDay(null)}
        />
      )}

      {saveError && <ErrorBanner message={saveError} onDismiss={clearSaveError} />}

      {promptConfig?.isOpen && (
        <PromptModal
          title={promptConfig.title}
          initialValue={promptConfig.initialValue}
          onSave={(val) => {
            promptConfig.onSave(val);
            setPromptConfig(null);
          }}
          onClose={() => setPromptConfig(null)}
        />
      )}
    </div>
  );
}
