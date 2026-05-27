import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  Auth,
  // @ts-ignore — react-native persistence adapter
  getReactNativePersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Firebase config — values are loaded from Expo public env vars.
// Copy .env.example → .env.local and fill in your project's values.
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? 'YOUR_API_KEY',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? 'YOUR_PROJECT.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? 'YOUR_PROJECT_ID',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? 'YOUR_PROJECT.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? 'YOUR_SENDER_ID',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? 'YOUR_APP_ID',
  measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID     ?? 'YOUR_MEASUREMENT_ID',
};

// ---------------------------------------------------------------------------
// Singleton initialisation — safe to call multiple times (e.g. HMR in Expo)
// ---------------------------------------------------------------------------

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  // First initialisation
  app = initializeApp(firebaseConfig);

  // Auth with AsyncStorage persistence so the user stays signed-in across
  // app restarts (React Native has no sessionStorage / indexedDB).
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if called again on hot reload; fall back to getAuth
    auth = getAuth(app);
  }

  // Firestore with offline persistence.
  // `persistentLocalCache` enables IndexedDB-backed offline support.
  // On React Native the SDK falls back gracefully when IndexedDB is unavailable.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
    });
  } catch {
    // Already initialised (hot reload)
    db = getFirestore(app);
  }
} else {
  // Already initialised — reuse existing instances
  app  = getApp();
  auth = getAuth(app);
  db   = getFirestore(app);
}

// ---------------------------------------------------------------------------
// Firestore collection path constants — centralised to avoid typos
// ---------------------------------------------------------------------------

export const COLLECTIONS = {
  USERS:               'users',
  TASKS:               'tasks',
  CATEGORIES:          'categories',
  EVENTS:              'events',
  HABITS:              'habits',
  HABIT_LOGS:          'habitLogs',
  TRANSACTIONS:        'transactions',
  FINANCE_CATEGORIES:  'financeCategories',
  BUDGETS:             'budgets',
  SMS_PATTERNS:        'smsPatterns',
} as const;

export { app, auth, db };
export default app;
