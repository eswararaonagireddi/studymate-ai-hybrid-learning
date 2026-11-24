# StudyMate AI — Development Summary

## What Was Built

StudyMate AI is a complete hybrid-AI academic learning assistant built with React 19, TypeScript, Vite, Tailwind CSS v4, `pdfjs-dist`, and the Firebase Web SDK (`firebase@13.4.0`):

1. **Verified Hybrid Inference Pipeline (`src/services/ai/*`)**:
   - Integrates `getAI(app, { backend: new GoogleAIBackend() })`, `getGenerativeModel`, `InferenceMode`, `InferenceSource`, and `initializeDeviceModel`.
   - Adds a pre-flight Chrome Prompt API guard (`evaluateRoutingDecision`) so `only_on_device` never silently falls back to cloud models even when `globalThis.LanguageModel` is absent.
   - Surfaces truthful badges (`Local AI`, `Cloud AI`, `Local unavailable`, `Request failed`, or dev-only `Simulated (Dev Demo)`) and expandable fallback details on every response.
2. **Five Interactive Study Workflows**:
   - **Dashboard**: Real Firestore-derived progress metrics and live hybrid capability diagnostics.
   - **AI Study Assistant**: Concept tutoring with subject/style controls, Markdown rendering, copy, and follow-up style transforms.
   - **Notes & PDF Reader**: Local PDF text extraction via `pdfjs-dist`, page selection, scanned-PDF warning, summary/key-points/revision notes, and grounded Q&A.
   - **Quiz Generator**: Schema-validated MCQ, True/False, and Short Answer quizzes with deterministic client-side scoring and incorrect-only retry.
   - **Flashcards**: Active-recall 3D flip deck with shuffle, progress tracking, and explicit Firestore save.
3. **Security, Auth, & Remote Config (`src/services/firebase/*`, `firestore.rules`, `firebase-blueprint.json`)**:
   - Google Sign-In (`signInWithPopup`) + verified-email user-scoped Firestore rules deployed and linted with `@firebase/eslint-plugin-security-rules`.
   - Safe App Check (`ReCaptchaEnterpriseProvider`) and Remote Config support.
   - Explicit user consent modal (`CloudConsentModal`) before transmitting excerpts to cloud Gemini models.
