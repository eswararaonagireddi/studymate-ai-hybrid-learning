export type AppRoute =
  | 'dashboard'
  | 'assistant'
  | 'notes'
  | 'quiz'
  | 'flashcards'
  | 'history'
  | 'settings';

export type ExecutionModePreference =
  | 'prefer_on_device'
  | 'only_on_device'
  | 'only_in_cloud'
  | 'prefer_in_cloud';

export type ActualExecutionMode = 'on_device' | 'in_cloud' | 'unavailable' | 'failed';

export type ExplanationStyle =
  | 'clear'
  | 'simple'
  | 'exam'
  | 'worked_example'
  | 'revision';

export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type QuizQuestionType = 'mcq' | 'true_false' | 'short_answer';

export type DeviceModelAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'unsupported_browser';

export type AIExecutionStatus =
  | 'success'
  | 'local_unavailable'
  | 'consent_required'
  | 'offline'
  | 'cancelled'
  | 'error';

export interface AIResponseMetadata {
  executionMode: ActualExecutionMode;
  requestedMode: ExecutionModePreference;
  modelId?: string;
  fallbackOccurred: boolean;
  fallbackReason?: string;
  status: AIExecutionStatus;
  errorMessage?: string;
  isSimulated?: boolean;
  latencyMs: number;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  subject: string;
  style: ExplanationStyle;
  createdAt: number;
  metadata?: AIResponseMetadata;
}

export interface PdfPageContent {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface PdfExtractionResult {
  fileName: string;
  title: string;
  pageCount: number;
  totalChars: number;
  pages: PdfPageContent[];
  isLikelyScanned: boolean;
  warnings: string[];
}

export interface ActiveStudySource {
  title: string;
  subject: string;
  text: string;
  pageReferences: number[];
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  explanation: string;
}

export interface QuizSet {
  title: string;
  subject: string;
  topic: string;
  difficulty: QuizDifficulty;
  questions: QuizQuestion[];
}

export interface QuizQuestionEvaluation {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizEvaluation {
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  results: QuizQuestionEvaluation[];
}

export interface FlashcardItem {
  id: string;
  term: string;
  definition: string;
  example?: string;
  topic?: string;
  sourceReference?: string;
}

export interface NoteRecord {
  id: string;
  ownerId: string;
  title: string;
  subject: string;
  sourceType: 'pdf' | 'text';
  pageCount: number;
  charCount: number;
  excerptPreview?: string;
  summary?: string;
  keyPoints?: string[];
  inferenceSource?: ActualExecutionMode;
  createdAt: number;
  updatedAt: number;
}

export interface StudySessionRecord {
  id: string;
  ownerId: string;
  feature: 'assistant' | 'notes' | 'quiz' | 'flashcards';
  subject: string;
  title: string;
  inferenceSource: ActualExecutionMode;
  fallbackOccurred: boolean;
  fallbackReason?: string;
  modelId?: string;
  createdAt: number;
}

export interface QuizResultRecord {
  id: string;
  ownerId: string;
  topic: string;
  subject: string;
  difficulty: QuizDifficulty;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  inferenceSource: ActualExecutionMode;
  createdAt: number;
}

export interface FlashcardSetRecord {
  id: string;
  ownerId: string;
  title: string;
  subject: string;
  cardCount: number;
  cards: FlashcardItem[];
  inferenceSource: ActualExecutionMode;
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferencesRecord {
  ownerId: string;
  preferredInferenceMode: ExecutionModePreference;
  preferredSubject: string;
  explanationStyle: ExplanationStyle;
  theme: 'light' | 'dark';
  cloudConsentGiven: boolean;
  updatedAt: number;
}

export interface InferenceCapabilityState {
  browserName: string;
  hasLanguageModelApi: boolean;
  deviceAvailability: DeviceModelAvailability;
  isOnline: boolean;
  firebaseConfigured: boolean;
  appCheckConfigured: boolean;
  cloudModel: string;
  details: string;
}

export interface RemoteConfigSettings {
  cloudModelName: string;
  maxNoteChars: number;
  defaultQuestionCount: number;
  enableQuizFeature: boolean;
  enableFlashcardsFeature: boolean;
}
