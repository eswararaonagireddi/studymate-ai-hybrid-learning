# StudyMate AI — Security & Firestore Rules Specification

## 1. Security Model Overview

StudyMate AI stores user-owned study records in Cloud Firestore under strictly isolated user subcollections:

- `/users/{uid}/notes/{noteId}`
- `/users/{uid}/studySessions/{sessionId}`
- `/users/{uid}/quizResults/{resultId}`
- `/users/{uid}/flashcardSets/{setId}`
- `/users/{uid}/preferences/{documentId}`

All access requires Firebase Authentication with a verified email (`request.auth != null && request.auth.uid == uid && request.auth.token.email_verified == true`), and a global catch-all rule denies all other reads and writes (`allow read, write: if false;`).

## 2. Data Invariants & Dirty Dozen Protections

1. **Identity & Ownership Binding**:
   - Every document must store `ownerId == request.auth.uid`.
   - `ownerId` and `createdAt` are immutable on updates.
2. **Path Variable Hardening**:
   - All path IDs (`uid`, `noteId`, `sessionId`, `resultId`, `setId`, `documentId`) must match `^[a-zA-Z0-9_-]+$` and length `1..128`, blocking path traversal (`../admin`) and ID poisoning.
   - Client-side `sanitizeId()` and `createRecordId()` enforce the identical pattern before calling Firestore.
3. **Strict Field Whitelisting (`hasOnly` & `affectedKeys().hasOnly`)**:
   - Unknown or shadow fields (e.g., `isAdmin`, `role`, `plan`) are rejected at creation and update.
4. **Server-Authoritative Timestamps**:
   - `createdAt == request.time` on creation; `updatedAt == request.time` on creation/update.
5. **Immutable Audit & Score Records**:
   - `studySessions` and `quizResults` disallow client updates (`allow update: if false;`).
   - `quizResults` enforces `0 <= correctCount <= totalQuestions`, `1 <= totalQuestions <= 30`, and `0 <= scorePercent <= 100`.
6. **Inference Truthfulness & Bounds**:
   - `inferenceSource` is restricted to `['on_device', 'in_cloud', 'unavailable', 'failed']`. Simulated demo mode never writes records to Firestore.
   - String lengths and array bounds mirror `firebase-blueprint.json` and `src/utils/validation.ts` (`LIMITS`).

## 3. Verification Status

- `@firebase/eslint-plugin-security-rules` static check: run `npx eslint firestore.rules`.
- Structural invariant checks: `tests/firestore.rules.test.ts` (runs offline in Vitest).
- Live Emulator evaluation: requires local Firebase Emulator Suite with Java installed (`firebase emulators:exec --only firestore`).
