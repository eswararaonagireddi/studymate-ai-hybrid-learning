import { useState } from 'react';
import { Cloud, ShieldAlert } from 'lucide-react';
import { useStudyMate } from '@/src/context/StudyMateContext';

export function CloudConsentModal() {
  const { pendingCloudConsent, approveCloudConsent, cancelCloudConsent } = useStudyMate();
  const [remember, setRemember] = useState(true);

  if (!pendingCloudConsent) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-consent-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400">
            <Cloud className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2
              id="cloud-consent-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Cloud AI Fallback Consent
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {pendingCloudConsent.message}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-3 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Only the selected text excerpt or question is transmitted to Firebase AI Logic cloud
            Gemini models. Full PDF files stay in your browser.
          </span>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600"
          />
          <span>Remember my cloud fallback permission for future study requests</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={cancelCloudConsent}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Keep Local Only
          </button>
          <button
            type="button"
            onClick={() => approveCloudConsent(remember)}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Continue with Cloud AI
          </button>
        </div>
      </div>
    </div>
  );
}
