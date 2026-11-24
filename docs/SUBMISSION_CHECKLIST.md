# #BuildHybridAI 2026 Hackathon — Submission Checklist

**Deadline:** November 30, 2026 at 2:00 PM PT (December 1, 2026 at 3:30 AM IST)  
**Contest Page:** https://firebasehybridaihackathon.devpost.com/

---

## Pre-Submission Technical Checklist

- [x] **Open-Source License**: `LICENSE` (Apache-2.0) present at repository root.
- [x] **Firebase AI Logic Hybrid SDK**: Uses `firebase/ai` (`InferenceMode`, `InferenceSource`, `GoogleAIBackend`, `initializeDeviceModel`).
- [x] **Truthful Inference UI**: Displays `Local AI` vs `Cloud AI` vs `Local unavailable` with fallback reasons.
- [x] **Hardened Firestore Rules**: `firestore.rules` linted with `@firebase/eslint-plugin-security-rules` and synced with `firebase-blueprint.json`.
- [x] **No Secrets in Repo**: `.env.example` contains placeholders only; no `.env.local`, service accounts, or debug tokens committed.
- [ ] **Enable Firebase AI Logic in Console**: Confirm **Build -> AI Logic** is enabled on your Firebase project (`voltaic-battery-l4cnq` or your own project).
- [ ] **Enable Google Auth & Authorized Domains**: Add `localhost` and your hosted Firebase Hosting URL in **Authentication -> Settings -> Authorized domains**.
- [ ] **Configure App Check**: Create a reCAPTCHA Enterprise site key, add it to `.env.local` / build config, and register it in Firebase App Check.
- [ ] **Manual Desktop Chrome 139+ Verification**: Record and confirm both `Local AI` (Gemini Nano) and `Cloud AI` (fallback) end-to-end.
- [ ] **Deploy Public Demo**: Run `npm run build && firebase deploy --only hosting,firestore:rules`.
- [ ] **Record Demo Video (~2m40s)**: Upload unlisted/public YouTube demo using `docs/DEMO_SCRIPT.md`.
- [ ] **Submit on Devpost**: Push code to public GitHub repo, verify live URL, and submit via `docs/DEVPOST_DRAFT.md`.
