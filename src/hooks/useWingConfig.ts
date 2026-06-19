import { useState, useEffect, useRef } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ─────────────────────────────────────────────────────────────────────────────

export interface AppProfile {
  email: string;
  role: 'resident' | 'representative' | 'dev';
  displayName?: string;
  room?: string;
  theme?: string;
  createdAt: any;
}

export interface RuleBlock {
  id: string;
  title: string;
  rules: string[];
}

export interface Product {
  id: string;
  name: string;
  type: 'unit' | 'amount' | 'both';
  quantity?: number;
  targetQuantity?: number;
  status?: 'full' | 'more_than_half' | 'half' | 'less_than_half' | 'empty';
}

export interface AppLink {
  id: string;
  href: string;
  title: string;
  description: string;
  iconName: string;
  color: string;
}

export interface AppConfig {
  appTitle?: string;
  appSubtitle?: string;
  tabMainName?: string;
  tabRulesName?: string;
  tabGeneralRulesName?: string;
  tabLinksName?: string;
  tabProductsName?: string;
  tabMaintenanceName?: string;
  maintenanceDescription?: string;
  rulesCardTitle?: string;
  rulesCardDescription?: string;
  generalRulesCardTitle?: string;
  generalRulesCardDescription?: string;
  maintenanceField1Title?: string;
  maintenanceField2Title?: string;
  maintenanceField3Title?: string;
  fundBalance?: number;
  rulesTitle?: string;
  maintenanceTasks: { id: string; room: string; task: string }[];
  schedule: Record<string, string>;
  cleaningRules?: string[];
  ruleBlocks?: RuleBlock[];
  generalRuleBlocks?: RuleBlock[];
  cleaningResponsible?: string;
  maintenanceResponsible?: string;
  fridgeCleaningResponsible?: string;
  buyingProductsResponsible?: string;
  cleaningDay?: string;
  maintenanceDay?: string;
  fridgeCleaningDay?: string;
  buyingProductsDay?: string;
  coletivoWeekends?: string[];
  products?: Product[];
  monthlyRotationOffset?: number;
  weeklyOffsets?: Record<string, number>;
  monthlyOffsets?: Record<string, number>;
  fridgeOffsets?: Record<string, number>;
  productsOffsets?: Record<string, number>;
  absentRooms?: string[];
  absentRoomsWeek?: number;
  links?: AppLink[];
  updatedAt: any;
}

const DEFAULT_CONFIG: AppConfig = {
  maintenanceTasks: [],
  schedule: { '15': '102', '16': '102' },
  ruleBlocks: [
    {
      id: 'default-1',
      title: 'Tarefas do Banheiro e Alas',
      rules: [
        'Varrer o chão.',
        'Lavar dentro do box (com cloro).',
        'Lavar o vaso sanitário (com cloro).',
        'Lavar a pia.',
        'Esfregar chão e as paredes.',
        'Passar pano (com desinfetante).',
        'Tirar o lixo!',
        'Passar pano na ala.',
        'Lavar panos e tapetes.',
      ],
    },
  ],
  generalRuleBlocks: [
    {
      id: 'general-1',
      title: 'Regras Gerais da Ala',
      rules: [
        'Respeitar a Lei do Silêncio (22h - 08h).',
        'Lavar as louças logo após o uso.',
      ],
    },
  ],
  updatedAt: null,
};

// Cache keys para localStorage
const LS_CONFIG_KEY = 'painel_config_cache';
const LS_PROFILE_KEY = 'painel_profile_cache';

/** Lê e parseia JSON do localStorage sem lançar erro */
function lsRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (sanitizeConfig(JSON.parse(raw)) as T) : null;
  } catch {
    return null;
  }
}

/** Salva JSON no localStorage sem lançar erro */
function lsWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — ignorar silenciosamente */
  }
}

/**
 * Remove campos que contenham objetos sentinel do Firestore (ex: deleteField())
 * que possam ter ficado em cache incorretamente. Esses objetos têm a chave `_methodName`.
 */
function sanitizeConfig<T extends object>(data: T): T {
  const clean = { ...data } as any;
  for (const key of Object.keys(clean)) {
    const val = clean[key];
    if (val && typeof val === 'object' && '_methodName' in val) {
      delete clean[key];
    }
  }
  return clean as T;
}

export function useWingConfig() {
  // Hidrata o estado a partir do cache local IMEDIATAMENTE (zero latência)
  const [config, setConfig] = useState<AppConfig | null>(
    () => lsRead<AppConfig>(LS_CONFIG_KEY)
  );
  const [profile, setProfile] = useState<AppProfile | null>(
    () => lsRead<AppProfile>(LS_PROFILE_KEY)
  );
  // Se já há cache local, não mostra tela de loading
  const [loading, setLoading] = useState(() => !lsRead(LS_CONFIG_KEY));
  const [profileLoading, setProfileLoading] = useState(
    () => !lsRead(LS_PROFILE_KEY)
  );
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Flag para evitar race condition na primeira renderização
  const configFromCacheRef = useRef(!!lsRead(LS_CONFIG_KEY));

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setProfile(null);
        setProfileLoading(false);
        setConfig(null);
        setLoading(false);
        // Limpa cache ao sair
        localStorage.removeItem(LS_CONFIG_KEY);
        localStorage.removeItem(LS_PROFILE_KEY);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;

    // ── Listener do perfil ────────────────────────────────────────────────────
    const userRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setDoc(userRef, {
            email: user.email,
            role: 'resident',
            createdAt: serverTimestamp(),
          })
            .catch((e) => console.error('Setup profile error:', e))
            .finally(() => setProfileLoading(false));
        } else {
          const data = snap.data() as AppProfile;
          
          // MIGRATION LOGIC
          const migrations: Record<string, { displayName: string; room: string }> = {
            'izabellyvflima07@gmail.com': { displayName: 'Izabelly Lima', room: '102' },
            'tyheusner@gmail.com': { displayName: 'Tífani Heusner', room: '102' },
            'angelamac3enkeli@gmail.com': { displayName: 'Angela Macedo', room: '101' },
            'gabrielpinheiro632@gmail.com': { displayName: 'Gabriel Pinheiro', room: '101' },
            'emilly.furg@gmail.com': { displayName: 'Emilly', room: '103' },
          };
          
          if (migrations[data.email] && (!data.displayName || !data.room)) {
            const updates = migrations[data.email];
            updateDoc(userRef, updates).catch(e => console.error('Migration error:', e));
            const updatedData = { ...data, ...updates };
            setProfile(updatedData);
            lsWrite(LS_PROFILE_KEY, updatedData);
          } else {
            setProfile(data);
            lsWrite(LS_PROFILE_KEY, data); // persiste no cache
          }
          
          setProfileLoading(false);
        }
      },
      (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`)
    );

    // ── Listener da config (inicia em paralelo) ───────────────────────────────
    const configRef = doc(db, 'config', 'default');
    const unsubConfig = onSnapshot(
      configRef,
      (snap) => {
        if (!snap.exists()) {
          if (user.email === 'gabrielpinheiro632@gmail.com') {
            setDoc(configRef, {
              ...DEFAULT_CONFIG,
              updatedAt: serverTimestamp(),
            }).catch((e) =>
              handleFirestoreError(e, OperationType.CREATE, 'config/default')
            );
          }
          setConfig(DEFAULT_CONFIG);
          lsWrite(LS_CONFIG_KEY, DEFAULT_CONFIG);
        } else {
          const data = sanitizeConfig(snap.data() as AppConfig);
          setConfig(data);
          lsWrite(LS_CONFIG_KEY, data); // persiste no cache
          // Só oculta o loading na primeira vez que vem do servidor
          if (!configFromCacheRef.current) {
            configFromCacheRef.current = true;
          }
        }
        setLoading(false);
      },
      (e) => handleFirestoreError(e, OperationType.GET, 'config/default')
    );

    return () => {
      unsubProfile();
      unsubConfig();
    };
  }, [user]);

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    if (!config) return;
    setSaveError(null);

    // Optimistic update: aplica no estado local e cache antes de ir ao Firestore.
    // Remove campos com deleteField() (objetos internos do Firestore com _methodName)
    // para não serem armazenados no estado local e causarem erro de renderização React.
    const localUpdate: Partial<AppConfig> = {};
    const deletedKeys: string[] = [];
    for (const [k, v] of Object.entries(newConfig)) {
      if (v && typeof v === 'object' && '_methodName' in v) {
        deletedKeys.push(k);
      } else {
        (localUpdate as any)[k] = v;
      }
    }
    const merged: any = { ...config, ...localUpdate };
    deletedKeys.forEach(k => delete merged[k]);
    setConfig(merged);
    lsWrite(LS_CONFIG_KEY, merged);

    const configRef = doc(db, 'config', 'default');
    try {
      await updateDoc(configRef, { ...newConfig, updatedAt: serverTimestamp() });
    } catch (e) {
      // Reverte o optimistic update em caso de erro
      setConfig(config);
      lsWrite(LS_CONFIG_KEY, config);
      const msg = e instanceof Error ? e.message : 'Erro desconhecido ao salvar.';
      setSaveError(msg);
      console.error('Firestore save error:', e);
    }
  };

  const saveWeeklySnapshot = async (snapshotData: any) => {
    if (!user) return;
    const docRef = doc(db, 'history', snapshotData.weekKey);
    try {
      await setDoc(
        docRef,
        { ...snapshotData, savedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.error('Firestore save history error:', e);
      const msg =
        e instanceof Error ? e.message : 'Erro desconhecido ao salvar histórico.';
      setSaveError(msg);
      throw e;
    }
  };

  return {
    config,
    updateConfig,
    loading,
    profileLoading,
    user,
    authLoading,
    profile,
    saveError,
    clearSaveError: () => setSaveError(null),
    saveWeeklySnapshot,
  };
}
