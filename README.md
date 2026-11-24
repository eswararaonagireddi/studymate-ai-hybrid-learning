# StudyMate AI — Your Hybrid Learning Assistant

Built for the **Google #BuildHybridAI 2026 Hackathon**, StudyMate AI is a React + TypeScript + Firebase web application that helps college students understand difficult concepts, extract and summarize PDF lecture notes locally, practice with schema-validated quizzes, review 3D interactive flashcards, and track real study progress.

Its core engineering focus is **transparent hybrid AI inference**:

- **On-device inference** via Chrome's built-in Prompt API (`globalThis.LanguageModel` / Gemini Nano) orchestrated through **Firebase AI Logic** (`firebase/ai`).
- **Cloud fallback** via Firebase AI Logic (`GoogleAIBackend`, defaulting to `gemini-2.5-flash`) when local execution is unavailable or a user selects cloud mode.
- **Truthful execution reporting**: Every AI response inspects `result.response.inferenceSource` (`InferenceSource.ON_DEVICE` vs `InferenceSource.IN_CLOUD`) and displays a clear badge (`Local AI`, `Cloud AI`, `Local unavailable`, or `Request failed`) along with fallback explanations. It never claims local inference when cloud fallback ran.

---

## Core Features

1. **Dashboard**: Live hybrid capability diagnostics (browser check, Gemini Nano availability, online/offline status, App Check status), quick study actions, and real Firestore-backed metrics (zero fabricated stats).
2. **AI Study Assistant**: Concept tutoring with subject and explanation-style controls (`Balanced academic`, `Simpler English`, `Exam-oriented`, `Worked example`, `Short revision summary`), Markdown rendering, copy action, follow-up rewrites, and request cancellation.
3. **Notes & PDF Reader**: Local PDF parsing via `pdfjs-dist` (never auto-uploaded), page selection, scanned-PDF OCR warning, summary/key-points/revision notes, grounded Q&A, explicit cloud consent before transmitting excerpts, and optional Firestore saving.
4. **Quiz Generator**: Configurable MCQ, True/False, and Short Answer quizzes validated against a strict TypeScript schema with deterministic client-side scoring, incorrect-only retry, and optional Firestore score logging.
5. **Flashcards**: Generate active-recall decks from notes, 3D card flip, shuffle, progress tracking, completion view, and optional Firestore deck saving.
6. **Study History**: Private user-scoped sessions, saved notes, quiz scores, and flashcard decks under verified Google Sign-In with confirmation dialogs before deletion.
7. **Settings & Privacy**: Routing policy (`prefer_on_device`, `only_on_device`, `prefer_in_cloud`, `only_in_cloud`), cloud consent toggle, light/dark theme switcher, Remote Config diagnostics, and a development-only simulated demo toggle (disabled in production builds).

---

## Architecture & Firebase Services Used

- **Firebase AI Logic (`firebase/ai`)**: `getAI`, `GoogleAIBackend`, `getGenerativeModel`, `InferenceMode`, `InferenceSource`, `initializeDeviceModel`
- **Firebase Authentication**: Google Sign-In (`signInWithPopup`) with `email_verified` rule enforcement
- **Cloud Firestore**: User-scoped collections (`/users/{uid}/notes`, `studySessions`, `quizResults`, `flashcardSets`, `preferences`) guarded by hardened `firestore.rules`
- **Firebase App Check**: `ReCaptchaEnterpriseProvider` (safely enabled only when a site key is configured)
- **Firebase Remote Config**: Configurable `cloud_gemini_model`, `max_note_chars`, `default_question_count`, and feature flags

See `docs/ARCHITECTURE.md` and `docs/TECHNICAL_FEASIBILITY.md` for full technical details.

---

## Beginner-Friendly Step-by-Step Setup Guide (VS Code / Antigravity)

Follow these 20 steps to run, test, and deploy StudyMate AI on your own machine:

### Part A — Prerequisites & Local Project Setup
1. **Install Node.js 20 LTS or newer**: Verify in terminal with `node -v` and `npm -v`.
2. **Install Desktop Google Chrome 139+** (for local Gemini Nano support). Note that Safari, Firefox, and mobile browsers will automatically use cloud fallback when consented.
3. **Clone or open the repository** in **VS Code** or **Antigravity**:
   ```bash
   git clone <YOUR_REPO_URL>
   cd studymate-ai
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Copy the environment template**:
   ```bash
   cp .env.example .env.local
   ```
   *(Never commit `.env.local` or any real keys/tokens to Git.)*

### Part B — Firebase Console Configuration
6. **Create or select a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com/).
7. **Register a Web App** in **Project Settings -> General -> Your apps**, then copy `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId` into `.env.local`.
8. **Enable Firebase AI Logic**: In the Firebase Console sidebar, go to **Build -> AI Logic** (Gemini Developer API / `GoogleAIBackend`) and click **Enable**.
9. **Enable Google Sign-In**: Go to **Authentication -> Sign-in method**, enable **Google**, and add `localhost` (plus your deployed domain) to **Authorized domains**.
10. **Create a Cloud Firestore database**: Go to **Firestore Database -> Create database** (Standard or Enterprise edition). If using a named database other than `(default)`, set `VITE_FIREBASE_FIRESTORE_DATABASE_ID` in `.env.local`.
11. **Configure Firebase App Check (Recommended before public launch)**:
    - Create a reCAPTCHA Enterprise site key in Google Cloud / reCAPTCHA Console.
    - Register it under **App Check -> Apps** in Firebase Console.
    - Set `VITE_FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY` in `.env.local`.
    - For local development with App Check enforcement enabled, set `VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN="true"` in `.env.local` and register the debug token printed in the Chrome console inside Firebase Console (**do not enable debug mode in production**).
12. **Configure Firebase Remote Config (Optional)**: Add parameters `cloud_gemini_model` (`gemini-2.5-flash`), `max_note_chars` (`16000`), and `default_question_count` (`5`) in **Engage -> Remote Config** and publish.

### Part C — Deploy Firestore Rules & Enable Local Gemini Nano
13. **Install Firebase CLI and log in**:
    ```bash
    npm install -g firebase-tools
    firebase login
    firebase use <YOUR_FIREBASE_PROJECT_ID>
    ```
14. **Lint and deploy security rules**:
    ```bash
    npx eslint firestore.rules
    firebase deploy --only firestore:rules
    ```
15. **Enable Chrome On-Device Gemini Nano (Desktop Chrome 139+)**:
    - Open `chrome://flags/#optimization-guide-on-device-model` -> set to **Enabled BypassPerfRequirement** (or **Enabled**).
    - Open `chrome://flags/#prompt-api-for-gemini-nano` -> set to **Enabled**.
    - Relaunch Chrome. Check `chrome://on-device-internals` or click **Prepare Local Gemini Nano Model** on the StudyMate AI Dashboard.

### Part D — Run, Test & Build
16. **Run the automated unit & component test suite**:
    ```bash
    npm test
    ```
17. **Run TypeScript type-checking**:
    ```bash
    npm run lint
    ```
18. **Start the local development server**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000`.
19. **Verify both inference paths**:
    - Test **Local AI** on Desktop Chrome 139+ with Gemini Nano initialized (`Local AI` badge).
    - Switch to **Cloud AI Only** (or test on another browser) to confirm `Cloud AI` badge and fallback explanation.
20. **Build and deploy to Firebase Hosting**:
    ```bash
    npm run build
    firebase deploy --only hosting
    ```

---

## Privacy & Data Handling

- **PDF Extraction**: `.pdf` files are parsed locally in the browser using `pdfjs-dist`; raw PDF binaries are never uploaded.
- **Explicit Cloud Consent**: When local Gemini Nano is unavailable and cloud fallback is needed, StudyMate AI opens a consent dialog before sending your excerpt or question to Firebase AI Logic.
- **Opt-In Persistence**: Chat transcripts are kept ephemeral in browser memory. Note summaries, quiz scores, and flashcard decks are saved to Firestore only when signed in and explicitly triggered by you.

## Known Limitations

- Chrome's Prompt API (`LanguageModel`) and Gemini Nano are supported only on **Desktop Chrome 139+** with sufficient hardware/storage; mobile browsers, Firefox, and Safari fall back to cloud Gemini models when consented.
- Scanned or image-only PDFs without embedded text trigger a warning and are not OCR-processed automatically.
- Live Gemini Nano weights and Firebase AI Logic API calls cannot be verified in headless offline environments without Chrome 139+ and an enabled Firebase project (see `docs/TESTING.md`).

## License

Licensed under the **Apache License 2.0**. See `LICENSE`.
