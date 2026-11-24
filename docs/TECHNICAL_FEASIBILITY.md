# Technical Feasibility Report — Firebase AI Logic Hybrid Inference

**Project:** StudyMate AI — Your Hybrid Learning Assistant  
**Target SDK:** `firebase@13.4.0` (`firebase/ai` / `@firebase/ai`)  
**Target Platform:** Desktop Google Chrome (primary), responsive mobile web browsers (cloud fallback)

---

## 1. Verified Official API Surface (`firebase/ai`)

Inspection of `@firebase/ai` (`firebase@13.4.0`) confirms the official Web Hybrid Inference API:

- **Initialization**:
  ```ts
  import { getAI, GoogleAIBackend } from 'firebase/ai';
  const ai = getAI(app, {
    backend: new GoogleAIBackend(),
    useLimitedUseAppCheckTokens: appCheckConfigured,
  });
  ```
- **Model Construction with `HybridParams`**:
  ```ts
  import { getGenerativeModel, InferenceMode } from 'firebase/ai';
  const model = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { model: 'gemini-2.5-flash', systemInstruction, generationConfig },
    onDeviceParams: { createOptions, promptOptions },
  });
  ```
- **Supported `InferenceMode` Values**:
  - `InferenceMode.PREFER_ON_DEVICE` (`"prefer_on_device"`)
  - `InferenceMode.ONLY_ON_DEVICE` (`"only_on_device"`)
  - `InferenceMode.ONLY_IN_CLOUD` (`"only_in_cloud"`)
  - `InferenceMode.PREFER_IN_CLOUD` (`"prefer_in_cloud"`)
- **Explicit Local Model Preparation**:
  - `await model.initializeDeviceModel(onDownloadProgress)` triggers `LanguageModel.create()` and reports download progress; Chrome requires this to be initiated from a user gesture.
- **Actual Execution Source Reporting**:
  - `result.response.inferenceSource` returns `InferenceSource.ON_DEVICE` (`"on_device"`) or `InferenceSource.IN_CLOUD` (`"in_cloud"`).

---

## 2. Browser, Hardware, & SDK Constraints Identified

1. **Desktop Chrome Requirement**:
   - On-device Gemini Nano execution relies on Chrome's built-in Prompt API exposing `globalThis.LanguageModel` (`LanguageModel.availability()`), available on **Desktop Chrome v139+** on supported hardware (sufficient disk space and RAM/VRAM).
   - Firefox, Safari, and mobile browsers do not currently expose the Chrome Prompt API and therefore fall back to cloud inference when permitted.
2. **SDK Edge Case in `InferenceMode.ONLY_ON_DEVICE`**:
   - Direct inspection of `@firebase/ai/dist/index.cjs.js` showed that `chromeAdapterFactory()` returns `undefined` when `globalThis.LanguageModel` is absent, and `callCloudOrDevice()` routes to `inCloudCall()` when `!chromeAdapter` is encountered—even under `ONLY_ON_DEVICE`.
   - **Mitigation in StudyMate AI**: `src/services/ai/hybridInference.ts` runs an explicit pre-flight `checkDeviceModelAvailability()` check and `evaluateRoutingDecision()` gate *before* invoking `getGenerativeModel()`. If the user selects `only_on_device` and `LanguageModel` is not `'available'`, the request is blocked locally with `status: 'local_unavailable'` and zero network calls.
3. **On-Device Feature Differences**:
   - On-device Chrome Prompt API does not support `countTokens()`, `functionResponse`, or non-JPEG/PNG inline media.
   - Passing a `Schema` class instance directly to `onDeviceParams.promptOptions.responseConstraint` can fail serialization if not a plain JSON schema object. StudyMate AI avoids this by prompting for strict JSON and validating/repairing output via `src/services/ai/aiSchemas.ts`.
4. **Network & Cloud Fallback Requirements**:
   - Cloud fallback requires internet connectivity, Firebase AI Logic enabled in the Firebase Console, and optional App Check (`ReCaptchaEnterpriseProvider`) when enforced.

---

## 3. Feasibility Conclusion

Implementing genuine Firebase AI Logic hybrid inference in a React + TypeScript + Vite SPA is **feasible and production-ready** with the following safeguards:

- Pre-flight browser capability detection (`inspectHybridCapabilities`) so unsupported browsers fail gracefully or request explicit consent before cloud fallback.
- Strict runtime truthfulness: UI badges reflect `result.response.inferenceSource` verbatim (`Local AI` vs `Cloud AI`), never faking local execution.
- Optional development-only demo simulation clearly marked `Simulated (Dev Demo)` and excluded from production builds (`import.meta.env.DEV`).
