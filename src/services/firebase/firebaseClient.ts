import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  fetchAndActivate,
  getBoolean,
  getNumber,
  getRemoteConfig,
  getString,
  type RemoteConfig,
} from 'firebase/remote-config';
import type { RemoteConfigSettings } from '@/src/types/study';
import { loadFirebaseClientConfig } from './config';

const {
  config,
  isConfigured,
  appCheckSiteKey,
  appCheckDebugEnabled,
  defaultCloudModel,
  isDemoModeAllowed,
} = loadFirebaseClientConfig();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let ai: AI | null = null;
let appCheck: AppCheck | null = null;
let remoteConfigInstance: RemoteConfig | null = null;
let appCheckConfigured = false;

if (isConfigured) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  auth = getAuth(app);
  db = config.firestoreDatabaseId
    ? getFirestore(app, config.firestoreDatabaseId)
    : getFirestore(app);

  if (typeof window !== 'undefined' && appCheckSiteKey) {
    if (appCheckDebugEnabled) {
      (globalThis as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckConfigured = true;
    } catch (err) {
      console.warn('Firebase App Check initialization skipped:', err);
    }
  }

  ai = getAI(app, {
    backend: new GoogleAIBackend(),
    useLimitedUseAppCheckTokens: appCheckConfigured,
  });

  if (typeof window !== 'undefined') {
    try {
      remoteConfigInstance = getRemoteConfig(app);
      remoteConfigInstance.settings.minimumFetchIntervalMillis = import.meta.env.DEV
        ? 60_000
        : 3_600_000;
      remoteConfigInstance.defaultConfig = {
        cloud_gemini_model: defaultCloudModel,
        max_note_chars: 16000,
        default_question_count: 5,
        enable_quiz_feature: true,
        enable_flashcards_feature: true,
      };
    } catch {
      remoteConfigInstance = null;
    }
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const firebaseServices = {
  app,
  auth,
  db,
  ai,
  appCheck,
  isConfigured,
  appCheckConfigured,
  cloudModelName: defaultCloudModel,
  isDemoModeAllowed,
};

export async function testFirestoreConnection(): Promise<{ ok: boolean; offline: boolean }> {
  if (!db) return { ok: false, offline: false };
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true, offline: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const offline = message.toLowerCase().includes('client is offline');
    if (offline) {
      console.error('Please check your Firebase configuration: client is offline.');
    }
    return { ok: false, offline };
  }
}

export async function loadRemoteConfigSettings(): Promise<RemoteConfigSettings> {
  const defaults: RemoteConfigSettings = {
    cloudModelName: defaultCloudModel,
    maxNoteChars: 16000,
    defaultQuestionCount: 5,
    enableQuizFeature: true,
    enableFlashcardsFeature: true,
  };

  if (!remoteConfigInstance) {
    return defaults;
  }

  try {
    await fetchAndActivate(remoteConfigInstance);
    const model = getString(remoteConfigInstance, 'cloud_gemini_model').trim();
    const maxChars = getNumber(remoteConfigInstance, 'max_note_chars');
    const qCount = getNumber(remoteConfigInstance, 'default_question_count');

    return {
      cloudModelName: model || defaults.cloudModelName,
      maxNoteChars:
        Number.isFinite(maxChars) && maxChars >= 2000 && maxChars <= 32000
          ? maxChars
          : defaults.maxNoteChars,
      defaultQuestionCount:
        Number.isFinite(qCount) && qCount >= 1 && qCount <= 15
          ? Math.round(qCount)
          : defaults.defaultQuestionCount,
      enableQuizFeature: getBoolean(remoteConfigInstance, 'enable_quiz_feature'),
      enableFlashcardsFeature: getBoolean(remoteConfigInstance, 'enable_flashcards_feature'),
    };
  } catch {
    return defaults;
  }
}
