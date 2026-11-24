export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
  recaptchaSiteKey?: string;
}

const appletConfigs = import.meta.glob('/firebase-applet-config.json', { eager: true }) as Record<
  string,
  { default?: Partial<FirebaseClientConfig> }
>;

const embeddedConfig: Partial<FirebaseClientConfig> =
  Object.values(appletConfigs)[0]?.default ?? {};

function envOrConfig(envVal: string | undefined, configVal: string | undefined): string {
  const trimmedEnv = envVal?.trim();
  if (trimmedEnv) return trimmedEnv;
  return configVal?.trim() ?? '';
}

export function loadFirebaseClientConfig(): {
  config: FirebaseClientConfig;
  isConfigured: boolean;
  appCheckSiteKey: string;
  appCheckDebugEnabled: boolean;
  defaultCloudModel: string;
  isDemoModeAllowed: boolean;
} {
  const config: FirebaseClientConfig = {
    apiKey: envOrConfig(import.meta.env.VITE_FIREBASE_API_KEY, embeddedConfig.apiKey),
    authDomain: envOrConfig(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, embeddedConfig.authDomain),
    projectId: envOrConfig(import.meta.env.VITE_FIREBASE_PROJECT_ID, embeddedConfig.projectId),
    storageBucket: envOrConfig(
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      embeddedConfig.storageBucket,
    ),
    messagingSenderId: envOrConfig(
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      embeddedConfig.messagingSenderId,
    ),
    appId: envOrConfig(import.meta.env.VITE_FIREBASE_APP_ID, embeddedConfig.appId),
    measurementId: envOrConfig(
      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      embeddedConfig.measurementId,
    ),
    firestoreDatabaseId: envOrConfig(
      import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
      embeddedConfig.firestoreDatabaseId,
    ),
    recaptchaSiteKey: envOrConfig(
      import.meta.env.VITE_FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY,
      embeddedConfig.recaptchaSiteKey,
    ),
  };

  const isConfigured = Boolean(config.apiKey && config.projectId && config.appId);
  const appCheckSiteKey = config.recaptchaSiteKey ?? '';
  const appCheckDebugEnabled =
    import.meta.env.DEV && import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN === 'true';
  const defaultCloudModel =
    import.meta.env.VITE_CLOUD_GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  const isDemoModeAllowed =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

  return {
    config,
    isConfigured,
    appCheckSiteKey,
    appCheckDebugEnabled,
    defaultCloudModel,
    isDemoModeAllowed,
  };
}
