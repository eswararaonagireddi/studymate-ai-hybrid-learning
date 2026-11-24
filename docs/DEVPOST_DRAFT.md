# Devpost Submission Draft — StudyMate AI

- **Project Name:** StudyMate AI — Your Hybrid Learning Assistant
- **Tagline:** Transparent hybrid-AI study workspace running on-device Gemini Nano via Chrome Prompt API with explicit Firebase AI Logic cloud fallback.
- **Public GitHub Repository URL:** `<ADD_GITHUB_REPO_URL>`
- **Live Hosted Demo URL:** `<ADD_FIREBASE_HOSTING_URL>`
- **Demo Video URL (YouTube):** `<ADD_YOUTUBE_VIDEO_URL>`
- **License:** Apache-2.0

---

## Inspiration
College students frequently paste sensitive lecture notes, lab handouts, and exam prep into cloud AI tools without knowing what leaves their device or whether it works offline. With Firebase AI Logic's hybrid inference SDK and Chrome's built-in Gemini Nano Prompt API, students can keep routine study tasks on-device while transparently falling back to cloud Gemini models only when needed and consented.

## What It Does
- **AI Study Assistant**: Subject-aware academic tutor with five explanation styles (`Balanced academic`, `Simpler English`, `Exam-oriented`, `Worked example`, `Short revision summary`) and truthful per-message `Local AI` / `Cloud AI` badges.
- **Notes & PDF Reader**: Parses `.pdf` files locally in the browser (`pdfjs-dist`) with page selection, scanned-PDF detection, summaries, key points, revision notes, and grounded Q&A.
- **Quiz Generator**: Produces MCQ, True/False, and Short Answer questions validated against a strict TypeScript schema and scored deterministically on the client.
- **Flashcards**: Generates flip-card decks with shuffle, progress tracking, and explicit Firestore saving.
- **Study History & Settings**: Verified Google Sign-In persistence, explicit cloud consent controls, routing mode selector, theme toggle, and capability diagnostics.

## How We Built It
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, `pdfjs-dist`, `react-markdown`.
- **Hybrid AI**: `firebase/ai` (`getAI`, `GoogleAIBackend`, `getGenerativeModel`, `InferenceMode`, `InferenceSource`, `initializeDeviceModel`) paired with a pre-flight Chrome `LanguageModel` availability guard so `ONLY_ON_DEVICE` never falls back silently.
- **Backend Services (Serverless Firebase)**: Firebase Authentication (Google Sign-In), Cloud Firestore with verified-owner security rules (`@firebase/eslint-plugin-security-rules`), Firebase App Check (`ReCaptchaEnterpriseProvider`), and Firebase Remote Config.

## Challenges We Ran Into
During SDK verification against `@firebase/ai` (`firebase@13.4.0`), we discovered that when `globalThis.LanguageModel` is unavailable, `callCloudOrDevice()` can route to `inCloudCall()` even when `InferenceMode.ONLY_ON_DEVICE` is configured. We added a dedicated pre-flight routing evaluator (`evaluateRoutingDecision`) so strict local-only mode never transmits data to the cloud.

## Accomplishments That We're Proud Of
- Zero fake stats or fabricated "Local AI" labels—every badge reflects `result.response.inferenceSource`.
- Local-first PDF parsing with explicit cloud transmission consent before sending excerpts.
- 21 automated Vitest & React Testing Library unit/component/rule-invariant tests.

## What's Next for StudyMate AI
- Live Firestore Emulator integration tests in CI.
- Spaced-repetition scheduling across saved flashcard decks.
- Optional multimodal diagram understanding when on-device image inputs expand across browsers.
