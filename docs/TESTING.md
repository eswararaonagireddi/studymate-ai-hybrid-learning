# StudyMate AI — Testing & Verification Guide

## 1. Automated Verification (Verified in This Environment)

The following automated checks run offline using Vitest, React Testing Library, ESLint, and TypeScript (`tsc --noEmit`):

1. **Unit & Component Tests (`npm test`)** — **21 tests across 4 files**:
   - `tests/hybridInference.test.ts` (mocked `firebase/ai`):
     - Pre-flight block of `only_on_device` when Chrome `LanguageModel` is unavailable (`local_unavailable`, zero SDK calls).
     - Cloud consent gating (`consent_required`) when local inference is unavailable and `cloudConsentGiven === false`.
     - Cloud fallback attribution (`Cloud AI`, `fallbackOccurred: true`, `fallbackReason`) when `prefer_on_device` runs in cloud.
     - Local attribution (`Local AI`) only when `InferenceSource.ON_DEVICE` is returned.
     - Graceful classification of `429 RESOURCE_EXHAUSTED`, `AIErrorCode.API_NOT_ENABLED`, and `AbortError` cancellation without retries.
     - Prompt length and quiz count validation bounds.
   - `tests/aiSchemas.test.ts`:
     - Parsing fenced JSON containing `mcq`, `true_false`, and `short_answer` questions.
     - Deterministic client-side scoring (`scoreQuizAttempt`), including short-answer normalization.
     - Rejecting malformed JSON and ambiguous MCQ options without matching `correctAnswer`.
     - Flashcard JSON parsing and invalid-card filtering.
   - `tests/authAndUi.test.tsx`:
     - Truthful `InferenceStatusBadge` rendering (`Local AI`, `Cloud AI` + `Fallback details`, `Simulated (Dev Demo)`, `Local unavailable`, `Request failed`).
     - Auth-gated `HistoryPage` sign-in prompt vs. authenticated session list.
   - `tests/firestore.rules.test.ts`:
     - Structural verification of `firestore.rules` (rules v2, default deny, verified email ownership, immutable `ownerId`/`createdAt`, `request.time` timestamps, score bounds, path ID regex blocking `../admin`).
2. **Firestore Security Rules Static Analysis**:
   - `npx eslint firestore.rules` using `@firebase/eslint-plugin-security-rules`.
3. **TypeScript & Production Bundle Verification**:
   - `npm run lint` (`tsc --noEmit`)
   - `npm run build` (`vite build`)

---

## 2. Manual & Live Environment Checks (Requires Desktop Chrome 139+ & Firebase Console)

The following live integrations cannot execute in an offline CI/headless sandbox and **must be verified manually** before submitting to #BuildHybridAI 2026:

1. **Live On-Device Gemini Nano Execution**:
   - Open StudyMate AI in **Desktop Chrome 139+** with `chrome://flags/#prompt-api-for-gemini-nano` enabled.
   - Click **Prepare Local Gemini Nano Model** on the Dashboard, then send a prompt in **AI Study Assistant** and confirm the **`Local AI`** badge appears.
2. **Live Firebase AI Logic Cloud Fallback**:
   - Switch to **Cloud AI Only** (or open in a browser without `LanguageModel`), accept the Cloud Consent modal, and confirm the **`Cloud AI`** badge + model ID (`gemini-2.5-flash`) + fallback explanation appear.
3. **Live Google Sign-In & Firestore Persistence**:
   - Sign in with a verified Google account, save a PDF summary, quiz score, and flashcard deck, and confirm they persist across page reloads and delete cleanly via **Study History**.
4. **Optional Live Firestore Emulator Rules Evaluation**:
   - With Java and Firebase CLI installed:
     ```bash
     firebase emulators:start --only firestore
     ```
     Verify authenticated vs. cross-user reads/writes against the running emulator.
