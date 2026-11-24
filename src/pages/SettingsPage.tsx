import { Download, Moon, RefreshCw, Shield, Sun } from 'lucide-react';
import { useStudyMate } from '@/src/context/StudyMateContext';
import type { ExecutionModePreference } from '@/src/types/study';

const MODE_OPTIONS: Array<{
  value: ExecutionModePreference;
  label: string;
  description: string;
}> = [
  {
    value: 'prefer_on_device',
    label: 'Prefer Local AI (Recommended Hybrid)',
    description:
      'Uses InferenceMode.PREFER_ON_DEVICE: runs locally on Chrome Gemini Nano when ready and falls back to Firebase AI Logic cloud models when unavailable.',
  },
  {
    value: 'only_on_device',
    label: 'Local AI Only',
    description:
      'Uses InferenceMode.ONLY_ON_DEVICE with an explicit browser guard: never transmits study material to cloud models; fails cleanly if local Gemini Nano is unavailable.',
  },
  {
    value: 'prefer_in_cloud',
    label: 'Prefer Cloud AI',
    description:
      'Uses InferenceMode.PREFER_IN_CLOUD: uses Firebase AI Logic cloud models first and attempts on-device fallback if cloud errors occur and Gemini Nano is available.',
  },
  {
    value: 'only_in_cloud',
    label: 'Cloud AI Only',
    description:
      'Uses InferenceMode.ONLY_IN_CLOUD: always routes through Firebase AI Logic cloud Gemini models.',
  },
];

export function SettingsPage() {
  const {
    modePreference,
    setModePreference,
    cloudConsentGiven,
    setCloudConsentGiven,
    theme,
    toggleTheme,
    capability,
    refreshCapability,
    preparingLocalModel,
    localDownloadProgress,
    localModelMessage,
    prepareLocalModel,
    remoteConfig,
    demoModeAllowed,
    demoModeActive,
    setDemoModeActive,
  } = useStudyMate();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Settings & Privacy
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Configure hybrid inference routing, cloud processing consent, appearance, and diagnostics.
        </p>
      </div>

      {/* Hybrid Inference Policy */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Hybrid Inference Routing Mode
        </h2>
        <div className="space-y-2.5">
          {MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                modePreference === opt.value
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="inference-mode"
                checked={modePreference === opt.value}
                onChange={() => setModePreference(opt.value)}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {opt.label}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Privacy & Cloud Consent */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Privacy Notice & Cloud Consent
          </h2>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          PDF files are parsed locally in your browser using pdfjs-dist and are never uploaded
          automatically. When local Gemini Nano is unavailable and cloud fallback is enabled, only
          the text excerpt or question you submit is sent to Firebase AI Logic. StudyMate AI does
          not persist conversation transcripts unless you explicitly save notes, quiz scores, or
          flashcard decks while signed in.
        </p>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-800 p-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Allow Cloud AI Fallback Processing
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When off, StudyMate AI asks before transmitting your notes to cloud Gemini models.
            </p>
          </div>
          <input
            type="checkbox"
            checked={cloudConsentGiven}
            onChange={(e) => setCloudConsentGiven(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
        </label>
      </section>

      {/* Appearance & Diagnostics */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Appearance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch between crisp academic light mode and dark slate mode.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" aria-hidden="true" />
                <span>Switch to Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" aria-hidden="true" />
                <span>Switch to Dark</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              SDK & Runtime Diagnostics
            </h3>
            <button
              type="button"
              onClick={refreshCapability}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">Browser Environment</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                {capability.browserName}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">Chrome Prompt API</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                {capability.hasLanguageModelApi ? capability.deviceAvailability : 'Not exposed'}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">Remote Config Cloud Model</dt>
              <dd className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                {remoteConfig.cloudModelName}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">Remote Config Max Excerpt</dt>
              <dd className="tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                {remoteConfig.maxNoteChars.toLocaleString()} chars
              </dd>
            </div>
          </dl>

          {(capability.deviceAvailability === 'downloadable' ||
            capability.deviceAvailability === 'downloading') && (
            <button
              type="button"
              onClick={prepareLocalModel}
              disabled={preparingLocalModel}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>
                {preparingLocalModel
                  ? `Initializing local Gemini Nano (${localDownloadProgress ?? 0}%)...`
                  : 'Prepare Local Gemini Nano Model'}
              </span>
            </button>
          )}
          {localModelMessage && (
            <p className="text-xs text-slate-600 dark:text-slate-300">{localModelMessage}</p>
          )}
        </div>

        {demoModeAllowed && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Development-Only Simulated Demo Mode
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Returns clearly labeled simulated UI responses without calling local or cloud AI.
                  Disabled in production builds.
                </p>
              </div>
              <input
                type="checkbox"
                checked={demoModeActive}
                onChange={(e) => setDemoModeActive(e.target.checked)}
              />
            </label>
          </div>
        )}
      </section>
    </div>
  );
}
