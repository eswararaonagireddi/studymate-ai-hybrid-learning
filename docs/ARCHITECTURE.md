# StudyMate AI — System Architecture

## 1. High-Level Architecture

StudyMate AI is a pure client-side single-page application (React 19 + TypeScript + Vite + Tailwind CSS v4) communicating directly with Firebase client SDKs—no intermediate Node/Express proxy server is used for Gemini requests.

```
[ React UI Pages ]
   ├── Dashboard / Assistant / Notes & PDF Reader / Quiz / Flashcards / History / Settings
   └── StudyMateContext (Auth state, Theme, Consent Modal, Capability diagnostics, Firestore sync)
          │
          ├──► [ Local Utilities ]
          │       ├── pdfExtractor.ts (pdfjs-dist local PDF text extraction)
          │       └── validation.ts (blueprint-synced ID & string bounds)
          │
          ├──► [ Hybrid AI Service Layer ] (src/services/ai/*)
          │       ├── inferenceStatus.ts (LanguageModel.availability & browser checks)
          │       ├── hybridInference.ts (pre-flight guard -> Firebase AI Logic getGenerativeModel)
          │       │      ├── Local Path: Chrome Gemini Nano (InferenceSource.ON_DEVICE)
          │       │      └── Cloud Path: GoogleAIBackend gemini-2.5-flash (InferenceSource.IN_CLOUD)
          │       └── aiSchemas.ts (strict JSON parsing + deterministic quiz scoring)
          │
          └──► [ Firebase Client Layer ] (src/services/firebase/*)
                  ├── Auth (Google Sign-In via signInWithPopup)
                  ├── Cloud Firestore (named database + hardened firestore.rules)
                  ├── App Check (ReCaptchaEnterpriseProvider when site key present)
                  └── Remote Config (cloud_gemini_model, max_note_chars, feature flags)
```

## 2. Privacy & Consent Boundaries

1. **Local PDF Parsing**: `extractTextFromPdfFile()` runs inside a local Web Worker (`pdfjs-dist`). Binary PDFs never leave the browser.
2. **Pre-Cloud Consent Gate**: `evaluateRoutingDecision()` checks `cloudConsentGiven` before allowing fallback to `in_cloud`. Users see `CloudConsentModal` explaining what excerpt is sent.
3. **Ephemeral vs. Persistent Data**: Assistant chat transcripts remain in React state only. Saved notes, study sessions, quiz scores, and flashcard decks are persisted to Firestore only for signed-in users with verified emails.

## 3. Firestore Data Model

All collections live under `/users/{uid}` and match `firebase-blueprint.json`:
- `notes/{noteId}` (`NoteRecord`)
- `studySessions/{sessionId}` (`StudySessionRecord` — immutable after creation)
- `quizResults/{resultId}` (`QuizResultRecord` — immutable after creation)
- `flashcardSets/{setId}` (`FlashcardSetRecord`)
- `preferences/{documentId}` (`UserPreferencesRecord`)
