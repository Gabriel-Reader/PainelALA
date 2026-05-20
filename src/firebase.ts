import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
setLogLevel('error');

// Firestore: banco correto (3º argumento) + cache IndexedDB multi-tab + fallback long-polling
const dbId = (firebaseConfig as any).firestoreDatabaseId ?? '(default)';
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }),
  experimentalForceLongPolling: true,
}, dbId);

// Auth: persistência local (sobrevive a fechar o browser)
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {/* silent */});
