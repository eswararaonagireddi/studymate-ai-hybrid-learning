import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  FlashcardSetRecord,
  NoteRecord,
  QuizResultRecord,
  StudySessionRecord,
  UserPreferencesRecord,
} from '@/src/types/study';
import { clampInt, clampText, createRecordId, LIMITS, sanitizeId } from '@/src/utils/validation';
import { firebaseServices } from './firebaseClient';
import { handleFirestoreError, OperationType } from './firestoreErrors';

function toMillis(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const fn = (value as { toMillis?: () => number }).toMillis;
    if (typeof fn === 'function') return fn();
  }
  return Date.now();
}

export function subscribeNotes(
  uid: string,
  onData: (items: NoteRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = firebaseServices.db;
  if (!db) return () => {};
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}/notes`;
  const q = query(collection(db, path), orderBy('updatedAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const items: NoteRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? safeUid),
          title: String(data.title ?? ''),
          subject: String(data.subject ?? 'General'),
          sourceType: data.sourceType === 'pdf' ? 'pdf' : 'text',
          pageCount: Number(data.pageCount ?? 1),
          charCount: Number(data.charCount ?? 0),
          excerptPreview: typeof data.excerptPreview === 'string' ? data.excerptPreview : undefined,
          summary: typeof data.summary === 'string' ? data.summary : undefined,
          keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints.map(String) : undefined,
          inferenceSource: data.inferenceSource,
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path, firebaseServices.auth);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function saveNoteRecord(
  uid: string,
  input: Omit<NoteRecord, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const db = firebaseServices.db;
  if (!db) throw new Error('Firestore is not configured.');
  const safeUid = sanitizeId(uid);
  const noteId = createRecordId('note');
  const path = `users/${safeUid}/notes/${noteId}`;

  const payload: Record<string, unknown> = {
    ownerId: safeUid,
    title: clampText(input.title, LIMITS.TITLE_MAX, 'Study Notes'),
    subject: clampText(input.subject, LIMITS.SUBJECT_MAX, 'General'),
    sourceType: input.sourceType === 'pdf' ? 'pdf' : 'text',
    pageCount: clampInt(input.pageCount, 0, LIMITS.PAGE_COUNT_MAX, 1),
    charCount: clampInt(input.charCount, 0, LIMITS.CHAR_COUNT_MAX, 0),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.excerptPreview) {
    payload.excerptPreview = clampText(input.excerptPreview, LIMITS.EXCERPT_PREVIEW_MAX);
  }
  if (input.summary) {
    payload.summary = clampText(input.summary, LIMITS.SUMMARY_MAX);
  }
  if (input.keyPoints && input.keyPoints.length > 0) {
    payload.keyPoints = input.keyPoints
      .slice(0, LIMITS.KEY_POINTS_MAX)
      .map((p) => clampText(p, LIMITS.KEY_POINT_MAX));
  }
  if (input.inferenceSource) {
    payload.inferenceSource = input.inferenceSource;
  }

  try {
    await setDoc(doc(db, path), payload);
    return noteId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, firebaseServices.auth);
  }
}

export async function deleteNoteRecord(uid: string, noteId: string): Promise<void> {
  const db = firebaseServices.db;
  if (!db) return;
  const path = `users/${sanitizeId(uid)}/notes/${sanitizeId(noteId)}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path, firebaseServices.auth);
  }
}

export function subscribeStudySessions(
  uid: string,
  onData: (items: StudySessionRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = firebaseServices.db;
  if (!db) return () => {};
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}/studySessions`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const items: StudySessionRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? safeUid),
          feature: data.feature,
          subject: String(data.subject ?? 'General'),
          title: String(data.title ?? ''),
          inferenceSource: data.inferenceSource,
          fallbackOccurred: Boolean(data.fallbackOccurred),
          fallbackReason:
            typeof data.fallbackReason === 'string' ? data.fallbackReason : undefined,
          modelId: typeof data.modelId === 'string' ? data.modelId : undefined,
          createdAt: toMillis(data.createdAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path, firebaseServices.auth);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function recordStudySession(
  uid: string,
  input: Omit<StudySessionRecord, 'id' | 'ownerId' | 'createdAt'>,
): Promise<string> {
  const db = firebaseServices.db;
  if (!db) throw new Error('Firestore is not configured.');
  const safeUid = sanitizeId(uid);
  const sessionId = createRecordId('sess');
  const path = `users/${safeUid}/studySessions/${sessionId}`;

  const payload: Record<string, unknown> = {
    ownerId: safeUid,
    feature: input.feature,
    subject: clampText(input.subject, LIMITS.SUBJECT_MAX, 'General'),
    title: clampText(input.title, LIMITS.TITLE_MAX, 'Study Session'),
    inferenceSource: input.inferenceSource,
    fallbackOccurred: Boolean(input.fallbackOccurred),
    createdAt: serverTimestamp(),
  };

  if (input.fallbackReason) {
    payload.fallbackReason = clampText(input.fallbackReason, LIMITS.FALLBACK_REASON_MAX);
  }
  if (input.modelId) {
    payload.modelId = clampText(input.modelId, LIMITS.MODEL_ID_MAX);
  }

  try {
    await setDoc(doc(db, path), payload);
    return sessionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, firebaseServices.auth);
  }
}

export async function deleteStudySession(uid: string, sessionId: string): Promise<void> {
  const db = firebaseServices.db;
  if (!db) return;
  const path = `users/${sanitizeId(uid)}/studySessions/${sanitizeId(sessionId)}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path, firebaseServices.auth);
  }
}

export function subscribeQuizResults(
  uid: string,
  onData: (items: QuizResultRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = firebaseServices.db;
  if (!db) return () => {};
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}/quizResults`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const items: QuizResultRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? safeUid),
          topic: String(data.topic ?? ''),
          subject: String(data.subject ?? 'General'),
          difficulty: data.difficulty,
          totalQuestions: Number(data.totalQuestions ?? 0),
          correctCount: Number(data.correctCount ?? 0),
          scorePercent: Number(data.scorePercent ?? 0),
          inferenceSource: data.inferenceSource,
          createdAt: toMillis(data.createdAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path, firebaseServices.auth);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function saveQuizResultRecord(
  uid: string,
  input: Omit<QuizResultRecord, 'id' | 'ownerId' | 'createdAt'>,
): Promise<string> {
  const db = firebaseServices.db;
  if (!db) throw new Error('Firestore is not configured.');
  const safeUid = sanitizeId(uid);
  const resultId = createRecordId('quiz');
  const path = `users/${safeUid}/quizResults/${resultId}`;

  const totalQuestions = clampInt(input.totalQuestions, 1, 30, 1);
  const correctCount = clampInt(input.correctCount, 0, totalQuestions, 0);
  const scorePercent = Math.max(0, Math.min(100, Number(input.scorePercent) || 0));

  try {
    await setDoc(doc(db, path), {
      ownerId: safeUid,
      topic: clampText(input.topic, LIMITS.TITLE_MAX, 'Study Quiz'),
      subject: clampText(input.subject, LIMITS.SUBJECT_MAX, 'General'),
      difficulty: input.difficulty,
      totalQuestions,
      correctCount,
      scorePercent,
      inferenceSource: input.inferenceSource,
      createdAt: serverTimestamp(),
    });
    return resultId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, firebaseServices.auth);
  }
}

export async function deleteQuizResultRecord(uid: string, resultId: string): Promise<void> {
  const db = firebaseServices.db;
  if (!db) return;
  const path = `users/${sanitizeId(uid)}/quizResults/${sanitizeId(resultId)}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path, firebaseServices.auth);
  }
}

export function subscribeFlashcardSets(
  uid: string,
  onData: (items: FlashcardSetRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = firebaseServices.db;
  if (!db) return () => {};
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}/flashcardSets`;
  const q = query(collection(db, path), orderBy('updatedAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const items: FlashcardSetRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? safeUid),
          title: String(data.title ?? ''),
          subject: String(data.subject ?? 'General'),
          cardCount: Number(data.cardCount ?? 0),
          cards: Array.isArray(data.cards) ? data.cards : [],
          inferenceSource: data.inferenceSource,
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path, firebaseServices.auth);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function saveFlashcardSetRecord(
  uid: string,
  input: Omit<FlashcardSetRecord, 'id' | 'ownerId' | 'cardCount' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const db = firebaseServices.db;
  if (!db) throw new Error('Firestore is not configured.');
  const safeUid = sanitizeId(uid);
  const setId = createRecordId('deck');
  const path = `users/${safeUid}/flashcardSets/${setId}`;

  const boundedCards = input.cards.slice(0, LIMITS.FLASHCARDS_MAX).map((c, idx) => ({
    id: clampText(c.id || `card_${idx + 1}`, 64, `card_${idx + 1}`),
    term: clampText(c.term, 300, 'Term'),
    definition: clampText(c.definition, 1200, 'Definition'),
    ...(c.example ? { example: clampText(c.example, 600) } : {}),
    ...(c.topic ? { topic: clampText(c.topic, 80) } : {}),
    ...(c.sourceReference ? { sourceReference: clampText(c.sourceReference, 120) } : {}),
  }));

  if (boundedCards.length === 0) {
    throw new Error('Cannot save an empty flashcard deck.');
  }

  try {
    await setDoc(doc(db, path), {
      ownerId: safeUid,
      title: clampText(input.title, LIMITS.TITLE_MAX, 'Study Flashcards'),
      subject: clampText(input.subject, LIMITS.SUBJECT_MAX, 'General'),
      cardCount: boundedCards.length,
      cards: boundedCards,
      inferenceSource: input.inferenceSource,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return setId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, firebaseServices.auth);
  }
}

export async function deleteFlashcardSetRecord(uid: string, setId: string): Promise<void> {
  const db = firebaseServices.db;
  if (!db) return;
  const path = `users/${sanitizeId(uid)}/flashcardSets/${sanitizeId(setId)}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path, firebaseServices.auth);
  }
}

export async function loadUserPreferences(
  uid: string,
): Promise<UserPreferencesRecord | null> {
  const db = firebaseServices.db;
  if (!db) return null;
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}/preferences/default`;
  try {
    const snap = await getDoc(doc(db, path));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      ownerId: String(data.ownerId ?? safeUid),
      preferredInferenceMode: data.preferredInferenceMode,
      preferredSubject: String(data.preferredSubject ?? 'Computer Science'),
      explanationStyle: data.explanationStyle,
      theme: data.theme === 'dark' ? 'dark' : 'light',
      cloudConsentGiven: Boolean(data.cloudConsentGiven),
      updatedAt: toMillis(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path, firebaseServices.auth);
  }
}

export async function saveUserPreferences(
  uid: string,
  prefs: Omit<UserPreferencesRecord, 'ownerId' | 'updatedAt'>,
): Promise<void> {
  const db = firebaseServices.db;
  if (!db) return;
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}/preferences/default`;
  try {
    await setDoc(doc(db, path), {
      ownerId: safeUid,
      preferredInferenceMode: prefs.preferredInferenceMode,
      preferredSubject: clampText(prefs.preferredSubject, LIMITS.SUBJECT_MAX, 'Computer Science'),
      explanationStyle: prefs.explanationStyle,
      theme: prefs.theme === 'dark' ? 'dark' : 'light',
      cloudConsentGiven: Boolean(prefs.cloudConsentGiven),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, firebaseServices.auth);
  }
}
