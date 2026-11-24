import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { initializeLocalNanoModel } from '@/src/services/ai/hybridInference';
import { inspectHybridCapabilities } from '@/src/services/ai/inferenceStatus';
import {
  firebaseServices,
  googleProvider,
  loadRemoteConfigSettings,
  testFirestoreConnection,
} from '@/src/services/firebase/firebaseClient';
import {
  deleteFlashcardSetRecord,
  deleteNoteRecord,
  deleteQuizResultRecord,
  deleteStudySession,
  loadUserPreferences,
  recordStudySession,
  saveFlashcardSetRecord,
  saveNoteRecord,
  saveQuizResultRecord,
  saveUserPreferences,
  subscribeFlashcardSets,
  subscribeNotes,
  subscribeQuizResults,
  subscribeStudySessions,
} from '@/src/services/firebase/firestoreRepo';
import type {
  ActiveStudySource,
  AIResponseMetadata,
  AppRoute,
  ExecutionModePreference,
  ExplanationStyle,
  FlashcardItem,
  FlashcardSetRecord,
  InferenceCapabilityState,
  NoteRecord,
  QuizDifficulty,
  QuizResultRecord,
  RemoteConfigSettings,
  StudySessionRecord,
} from '@/src/types/study';

interface PendingConsentRequest {
  message: string;
  onConfirm: () => void;
}

interface StudyMateContextValue {
  route: AppRoute;
  setRoute: (route: AppRoute) => void;
  user: User | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  capability: InferenceCapabilityState;
  refreshCapability: () => Promise<void>;
  preparingLocalModel: boolean;
  localDownloadProgress: number | null;
  localModelMessage: string | null;
  prepareLocalModel: () => Promise<void>;
  modePreference: ExecutionModePreference;
  setModePreference: (mode: ExecutionModePreference) => void;
  preferredSubject: string;
  setPreferredSubject: (subject: string) => void;
  explanationStyle: ExplanationStyle;
  setExplanationStyle: (style: ExplanationStyle) => void;
  cloudConsentGiven: boolean;
  setCloudConsentGiven: (val: boolean) => void;
  pendingCloudConsent: PendingConsentRequest | null;
  requestCloudConsent: (message: string, onConfirm: () => void) => void;
  approveCloudConsent: (remember: boolean) => void;
  cancelCloudConsent: () => void;
  remoteConfig: RemoteConfigSettings;
  notes: NoteRecord[];
  sessions: StudySessionRecord[];
  quizResults: QuizResultRecord[];
  flashcardSets: FlashcardSetRecord[];
  dataLoading: boolean;
  firestoreError: string | null;
  firestoreOffline: boolean;
  activeStudySource: ActiveStudySource | null;
  setActiveStudySource: (src: ActiveStudySource | null) => void;
  logSessionActivity: (input: {
    feature: 'assistant' | 'notes' | 'quiz' | 'flashcards';
    subject: string;
    title: string;
    metadata: AIResponseMetadata;
  }) => Promise<void>;
  saveNote: (input: {
    title: string;
    subject: string;
    sourceType: 'pdf' | 'text';
    pageCount: number;
    charCount: number;
    excerptPreview?: string;
    summary?: string;
    keyPoints?: string[];
    inferenceSource?: NoteRecord['inferenceSource'];
  }) => Promise<string | null>;
  saveQuizScore: (input: {
    topic: string;
    subject: string;
    difficulty: QuizDifficulty;
    totalQuestions: number;
    correctCount: number;
    scorePercent: number;
    inferenceSource: QuizResultRecord['inferenceSource'];
  }) => Promise<string | null>;
  saveFlashcardDeck: (input: {
    title: string;
    subject: string;
    cards: FlashcardItem[];
    inferenceSource: FlashcardSetRecord['inferenceSource'];
  }) => Promise<string | null>;
  removeNote: (id: string) => Promise<void>;
  removeQuizResult: (id: string) => Promise<void>;
  removeFlashcardDeck: (id: string) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  demoModeAllowed: boolean;
  demoModeActive: boolean;
  setDemoModeActive: (active: boolean) => void;
}

const StudyMateContext = createContext<StudyMateContextValue | null>(null);

const PREF_STORAGE_KEY = 'studymate_ui_prefs_v1';

function readStoredPrefs(): Partial<{
  theme: 'light' | 'dark';
  modePreference: ExecutionModePreference;
  preferredSubject: string;
  explanationStyle: ExplanationStyle;
  cloudConsentGiven: boolean;
}> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PREF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function StudyMateProvider({ children }: { children: ReactNode }) {
  const initialStored = useMemo(() => readStoredPrefs(), []);

  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(
    initialStored.theme === 'dark' ? 'dark' : 'light',
  );
  const [modePreference, setModePreferenceState] = useState<ExecutionModePreference>(
    initialStored.modePreference ?? 'prefer_on_device',
  );
  const [preferredSubject, setPreferredSubjectState] = useState<string>(
    initialStored.preferredSubject ?? 'Computer Science',
  );
  const [explanationStyle, setExplanationStyleState] = useState<ExplanationStyle>(
    initialStored.explanationStyle ?? 'clear',
  );
  const [cloudConsentGiven, setCloudConsentGivenState] = useState<boolean>(
    Boolean(initialStored.cloudConsentGiven),
  );

  const [remoteConfig, setRemoteConfig] = useState<RemoteConfigSettings>({
    cloudModelName: firebaseServices.cloudModelName,
    maxNoteChars: 16000,
    defaultQuestionCount: 5,
    enableQuizFeature: true,
    enableFlashcardsFeature: true,
  });

  const [capability, setCapability] = useState<InferenceCapabilityState>({
    browserName: 'Checking browser...',
    hasLanguageModelApi: false,
    deviceAvailability: 'unsupported_browser',
    isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    firebaseConfigured: firebaseServices.isConfigured,
    appCheckConfigured: firebaseServices.appCheckConfigured,
    cloudModel: firebaseServices.cloudModelName,
    details: 'Inspecting Chrome Prompt API and Firebase AI Logic capabilities...',
  });

  const [preparingLocalModel, setPreparingLocalModel] = useState(false);
  const [localDownloadProgress, setLocalDownloadProgress] = useState<number | null>(null);
  const [localModelMessage, setLocalModelMessage] = useState<string | null>(null);

  const [pendingCloudConsent, setPendingCloudConsent] = useState<PendingConsentRequest | null>(null);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [sessions, setSessions] = useState<StudySessionRecord[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResultRecord[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSetRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [firestoreOffline, setFirestoreOffline] = useState(false);
  const [activeStudySource, setActiveStudySource] = useState<ActiveStudySource | null>(null);

  const [demoModeActive, setDemoModeActive] = useState(false);

  const refreshCapability = useCallback(async () => {
    const next = await inspectHybridCapabilities(remoteConfig.cloudModelName);
    setCapability(next);
  }, [remoteConfig.cloudModelName]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        PREF_STORAGE_KEY,
        JSON.stringify({
          theme,
          modePreference,
          preferredSubject,
          explanationStyle,
          cloudConsentGiven,
        }),
      );
    } catch {
      // Ignore storage failures
    }
  }, [theme, modePreference, preferredSubject, explanationStyle, cloudConsentGiven]);

  useEffect(() => {
    refreshCapability();
    const handleNetworkChange = () => {
      refreshCapability();
    };
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [refreshCapability]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [conn, rc] = await Promise.all([
        testFirestoreConnection(),
        loadRemoteConfigSettings(),
      ]);
      if (!active) return;
      setFirestoreOffline(conn.offline);
      setRemoteConfig(rc);
      const nextCap = await inspectHybridCapabilities(rc.cloudModelName);
      if (active) setCapability(nextCap);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const auth = firebaseServices.auth;
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser && !firebaseUser.emailVerified) {
        setAuthError(
          'Your Google account email is not marked verified. Firestore saving requires a verified email.',
        );
      } else {
        setAuthError(null);
      }
    });
    return () => unsub();
  }, []);

  const persistPreferencesIfSignedIn = useCallback(
    async (
      overrides: Partial<{
        theme: 'light' | 'dark';
        modePreference: ExecutionModePreference;
        preferredSubject: string;
        explanationStyle: ExplanationStyle;
        cloudConsentGiven: boolean;
      }>,
    ) => {
      if (!user || !user.emailVerified || !firebaseServices.db) return;
      try {
        await saveUserPreferences(user.uid, {
          preferredInferenceMode: overrides.modePreference ?? modePreference,
          preferredSubject: overrides.preferredSubject ?? preferredSubject,
          explanationStyle: overrides.explanationStyle ?? explanationStyle,
          theme: overrides.theme ?? theme,
          cloudConsentGiven: overrides.cloudConsentGiven ?? cloudConsentGiven,
        });
      } catch (err) {
        setFirestoreError(
          err instanceof Error ? 'Unable to save preferences to Firestore.' : null,
        );
      }
    },
    [user, modePreference, preferredSubject, explanationStyle, theme, cloudConsentGiven],
  );

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || !firebaseServices.db) {
      setNotes([]);
      setSessions([]);
      setQuizResults([]);
      setFlashcardSets([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setFirestoreError(null);

    loadUserPreferences(user.uid)
      .then((prefs) => {
        if (!prefs) return;
        setTheme(prefs.theme);
        setModePreferenceState(prefs.preferredInferenceMode);
        setPreferredSubjectState(prefs.preferredSubject);
        setExplanationStyleState(prefs.explanationStyle);
        setCloudConsentGivenState(prefs.cloudConsentGiven);
      })
      .catch(() => {
        // Non-blocking preference load
      });

    const handleSubError = () => {
      setFirestoreError(
        'Could not sync some study records from Firestore. Check your connection or permissions.',
      );
      setDataLoading(false);
    };

    let settled = 0;
    const markSettled = () => {
      settled += 1;
      if (settled >= 4) setDataLoading(false);
    };

    const unsubNotes = subscribeNotes(
      user.uid,
      (items) => {
        setNotes(items);
        markSettled();
      },
      handleSubError,
    );
    const unsubSessions = subscribeStudySessions(
      user.uid,
      (items) => {
        setSessions(items);
        markSettled();
      },
      handleSubError,
    );
    const unsubQuizzes = subscribeQuizResults(
      user.uid,
      (items) => {
        setQuizResults(items);
        markSettled();
      },
      handleSubError,
    );
    const unsubFlashcards = subscribeFlashcardSets(
      user.uid,
      (items) => {
        setFlashcardSets(items);
        markSettled();
      },
      handleSubError,
    );

    return () => {
      unsubNotes();
      unsubSessions();
      unsubQuizzes();
      unsubFlashcards();
    };
  }, [authReady, user]);

  const signInWithGoogle = async () => {
    if (!firebaseServices.auth) {
      setAuthError('Firebase Authentication is not configured in this environment.');
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithPopup(firebaseServices.auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const signOutUser = async () => {
    if (!firebaseServices.auth) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOut(firebaseServices.auth);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-out failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    void persistPreferencesIfSignedIn({ theme: next });
  };

  const setModePreference = (mode: ExecutionModePreference) => {
    setModePreferenceState(mode);
    void persistPreferencesIfSignedIn({ modePreference: mode });
  };

  const setPreferredSubject = (subject: string) => {
    setPreferredSubjectState(subject);
    void persistPreferencesIfSignedIn({ preferredSubject: subject });
  };

  const setExplanationStyle = (style: ExplanationStyle) => {
    setExplanationStyleState(style);
    void persistPreferencesIfSignedIn({ explanationStyle: style });
  };

  const setCloudConsentGiven = (val: boolean) => {
    setCloudConsentGivenState(val);
    void persistPreferencesIfSignedIn({ cloudConsentGiven: val });
  };

  const prepareLocalModel = async () => {
    if (preparingLocalModel) return;
    setPreparingLocalModel(true);
    setLocalDownloadProgress(0);
    setLocalModelMessage(null);
    try {
      const res = await initializeLocalNanoModel((pct) => setLocalDownloadProgress(pct));
      setLocalModelMessage(res.message);
      await refreshCapability();
    } finally {
      setPreparingLocalModel(false);
    }
  };

  const requestCloudConsent = (message: string, onConfirm: () => void) => {
    setPendingCloudConsent({ message, onConfirm });
  };

  const approveCloudConsent = (remember: boolean) => {
    const action = pendingCloudConsent?.onConfirm;
    setPendingCloudConsent(null);
    if (remember) {
      setCloudConsentGiven(true);
    }
    action?.();
  };

  const cancelCloudConsent = () => {
    setPendingCloudConsent(null);
  };

  const logSessionActivity: StudyMateContextValue['logSessionActivity'] = async ({
    feature,
    subject,
    title,
    metadata,
  }) => {
    if (!user || !user.emailVerified || !firebaseServices.db || metadata.isSimulated) {
      return;
    }
    try {
      await recordStudySession(user.uid, {
        feature,
        subject,
        title,
        inferenceSource: metadata.executionMode,
        fallbackOccurred: metadata.fallbackOccurred,
        fallbackReason: metadata.fallbackReason,
        modelId: metadata.modelId,
      });
    } catch {
      // Non-blocking activity log
    }
  };

  const saveNote: StudyMateContextValue['saveNote'] = async (input) => {
    if (!user || !user.emailVerified || !firebaseServices.db) return null;
    try {
      return await saveNoteRecord(user.uid, input);
    } catch {
      setFirestoreError('Failed to save note summary to Firestore.');
      return null;
    }
  };

  const saveQuizScore: StudyMateContextValue['saveQuizScore'] = async (input) => {
    if (!user || !user.emailVerified || !firebaseServices.db) return null;
    try {
      return await saveQuizResultRecord(user.uid, input);
    } catch {
      setFirestoreError('Failed to save quiz score to Firestore.');
      return null;
    }
  };

  const saveFlashcardDeck: StudyMateContextValue['saveFlashcardDeck'] = async (input) => {
    if (!user || !user.emailVerified || !firebaseServices.db) return null;
    try {
      return await saveFlashcardSetRecord(user.uid, input);
    } catch {
      setFirestoreError('Failed to save flashcard deck to Firestore.');
      return null;
    }
  };

  const removeNote = async (id: string) => {
    if (!user) return;
    await deleteNoteRecord(user.uid, id);
  };

  const removeQuizResult = async (id: string) => {
    if (!user) return;
    await deleteQuizResultRecord(user.uid, id);
  };

  const removeFlashcardDeck = async (id: string) => {
    if (!user) return;
    await deleteFlashcardSetRecord(user.uid, id);
  };

  const removeSession = async (id: string) => {
    if (!user) return;
    await deleteStudySession(user.uid, id);
  };

  return (
    <StudyMateContext.Provider
      value={{
        route,
        setRoute,
        user,
        authReady,
        authBusy,
        authError,
        signInWithGoogle,
        signOutUser,
        theme,
        toggleTheme,
        capability,
        refreshCapability,
        preparingLocalModel,
        localDownloadProgress,
        localModelMessage,
        prepareLocalModel,
        modePreference,
        setModePreference,
        preferredSubject,
        setPreferredSubject,
        explanationStyle,
        setExplanationStyle,
        cloudConsentGiven,
        setCloudConsentGiven,
        pendingCloudConsent,
        requestCloudConsent,
        approveCloudConsent,
        cancelCloudConsent,
        remoteConfig,
        notes,
        sessions,
        quizResults,
        flashcardSets,
        dataLoading,
        firestoreError,
        firestoreOffline,
        activeStudySource,
        setActiveStudySource,
        logSessionActivity,
        saveNote,
        saveQuizScore,
        saveFlashcardDeck,
        removeNote,
        removeQuizResult,
        removeFlashcardDeck,
        removeSession,
        demoModeAllowed: firebaseServices.isDemoModeAllowed,
        demoModeActive: firebaseServices.isDemoModeAllowed && demoModeActive,
        setDemoModeActive,
      }}
    >
      {children}
    </StudyMateContext.Provider>
  );
}

export function useStudyMate(): StudyMateContextValue {
  const ctx = useContext(StudyMateContext);
  if (!ctx) {
    throw new Error('useStudyMate must be used within a StudyMateProvider.');
  }
  return ctx;
}
