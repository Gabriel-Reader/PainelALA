import { useState, useEffect } from 'react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------

export interface AppProfile {
  email: string;
  role: 'resident' | 'representative';
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
  type: 'unit' | 'amount';
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
  cleaningDay?: number | string;
  maintenanceDay?: number | string;
  fridgeCleaningDay?: number | string;
  buyingProductsDay?: number | string;
  coletivoWeekends?: string[];
  products?: Product[];
  weeklyRotationOffset?: number;
  monthlyRotationOffset?: number;
  absentRooms?: string[];
  absentRoomsWeek?: number;
  links?: AppLink[];
  updatedAt: any;
}

const DEFAULT_CONFIG: AppConfig = {
  maintenanceTasks: [],
  schedule: {
    "15": "102",
    "16": "102"
  },
  ruleBlocks: [
    {
      id: "default-1",
      title: "Tarefas do Banheiro e Alas",
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
      ]
    }
  ],
  generalRuleBlocks: [
    {
      id: "general-1",
      title: "Regras Gerais da Ala",
      rules: [
        'Respeitar a Lei do Silêncio (22h - 08h).',
        'Lavar as louças logo após o uso.',
      ]
    }
  ],
  updatedAt: null,
};

export function useWingConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setProfileLoading(false);
        setConfig(null);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Check/create user profile
    const setupProfile = async () => {
      const userRef = doc(db, 'users', user.uid);
      const unsubProfile = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) {
          // Attempt to create
          setDoc(userRef, {
             email: user.email,
             role: 'resident',
             createdAt: serverTimestamp()
          }).catch(e => {
             console.error("Setup profile error:", e);
             // We won't crash if it fails, maybe someone else created it
          }).finally(() => setProfileLoading(false));
        } else {
          setProfile(snap.data() as AppProfile);
          setProfileLoading(false);
        }
      }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`));
      return unsubProfile;
    };

    let unsubProfileFunc: () => void;
    setupProfile().then(u => unsubProfileFunc = u);

    const configRef = doc(db, 'config', 'default');
    const unsubConfig = onSnapshot(configRef, (snap) => {
      if (!snap.exists()) {
        if (user.email === 'gabrielpinheiro632@gmail.com') {
           setDoc(configRef, {
             ...DEFAULT_CONFIG,
             updatedAt: serverTimestamp()
           }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'config/default'));
        }
        setConfig(DEFAULT_CONFIG);
      } else {
        setConfig(snap.data() as AppConfig);
      }
      setLoading(false);
    }, (e) => handleFirestoreError(e, OperationType.GET, 'config/default'));

    return () => {
      if (unsubProfileFunc) unsubProfileFunc();
      unsubConfig();
    };
  }, [user]);

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
     if (!config) return;
     setSaveError(null);
     const configRef = doc(db, 'config', 'default');
     try {
       await updateDoc(configRef, { ...newConfig, updatedAt: serverTimestamp() });
     } catch (e) {
       const msg = e instanceof Error ? e.message : 'Erro desconhecido ao salvar.';
       setSaveError(msg);
       console.error('Firestore save error:', e);
     }
  };

  const saveWeeklySnapshot = async (snapshotData: any) => {
     if (!user) return;
     const docRef = doc(db, 'history', snapshotData.weekKey);
     try {
       await setDoc(docRef, { ...snapshotData, savedAt: serverTimestamp() }, { merge: true });
     } catch (e) {
       console.error('Firestore save history error:', e);
       const msg = e instanceof Error ? e.message : 'Erro desconhecido ao salvar histórico.';
       setSaveError(msg);
       throw e;
     }
  };

  return { config, updateConfig, loading, profileLoading, user, profile, saveError, clearSaveError: () => setSaveError(null), saveWeeklySnapshot };
}
