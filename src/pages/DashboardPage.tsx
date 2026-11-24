import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Cloud,
  Cpu,
  Download,
  FileText,
  HelpCircle,
  Layers,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { InferenceStatusBadge } from '@/src/components/InferenceStatusBadge';
import { useStudyMate } from '@/src/context/StudyMateContext';

const HERO_IMAGE_SRC = '/src/assets/images/study_workspace_cover_1795463587506.jpg';

export function DashboardPage() {
  const {
    user,
    signInWithGoogle,
    setRoute,
    notes,
    sessions,
    quizResults,
    flashcardSets,
    capability,
    refreshCapability,
    preparingLocalModel,
    localDownloadProgress,
    localModelMessage,
    prepareLocalModel,
    modePreference,
    dataLoading,
  } = useStudyMate();

  const [imgFailed, setImgFailed] = useState(false);

  const avgScore =
    quizResults.length > 0
      ? Math.round(
          (quizResults.reduce((sum, r) => sum + r.scorePercent, 0) / quizResults.length) * 10,
        ) / 10
      : null;

  const localSessionCount = sessions.filter((s) => s.inferenceSource === 'on_device').length;
  const cloudSessionCount = sessions.filter((s) => s.inferenceSource === 'in_cloud').length;

  return (
    <div className="space-y-8">
      {/* Welcome Hero Split */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Hybrid Learning Workspace</span>
                <span aria-hidden="true">·</span>
                <span>Firebase AI Logic</span>
                <span aria-hidden="true">·</span>
                <span>
                  {capability.deviceAvailability === 'available'
                    ? 'On-device Gemini Nano ready'
                    : 'Cloud fallback active'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 [text-wrap:balance]">
                {user?.displayName
                  ? `Welcome back, ${user.displayName.split(' ')[0]}.`
                  : 'Study smarter with transparent hybrid AI.'}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                StudyMate AI runs supported tasks locally on your device with Chrome Gemini Nano
                when available and routes to cloud Gemini models through Firebase AI Logic when
                needed—always reporting the real execution mode.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setRoute('assistant')}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap"
              >
                <span>Start studying</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setRoute('notes')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>Open PDF or notes</span>
              </button>
              {!user && (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:underline whitespace-nowrap"
                >
                  <span>Sign in to save progress</span>
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 min-h-[200px] bg-slate-100 dark:bg-slate-800 relative">
            {!imgFailed ? (
              <img
                src={HERO_IMAGE_SRC}
                alt="Academic study desk with hardcover textbooks and brass compass"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover lg:h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
                <BookOpen className="h-10 w-10 text-indigo-600 dark:text-indigo-400 mb-2" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  StudyMate AI Academic Workspace
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Real Activity Progress Metrics */}
      <section aria-labelledby="progress-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="progress-heading"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Your Study Progress
          </h2>
          {!user && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Sign in with Google to persist study records to Firestore
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Recorded Sessions</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {dataLoading ? '—' : sessions.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {localSessionCount} local · {cloudSessionCount} cloud
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Saved Note Summaries</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {dataLoading ? '—' : notes.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Saved by your explicit choice
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Quiz Average</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {dataLoading ? '—' : avgScore !== null ? `${avgScore}%` : 'No quizzes yet'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {quizResults.length} completed {quizResults.length === 1 ? 'attempt' : 'attempts'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Saved Flashcard Decks</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {dataLoading ? '—' : flashcardSets.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {flashcardSets.reduce((sum, s) => sum + s.cardCount, 0)} total cards
            </p>
          </div>
        </div>
      </section>

      {/* Two-Column Operational Split: Quick Actions + Inference Capability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Actions & Recent Activity */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Quick Study Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRoute('notes')}
                className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-4 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600"
              >
                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Summarize Notes
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Extract PDF pages locally & build key takeaways
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRoute('quiz')}
                className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-4 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600"
              >
                <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Generate Quiz
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  MCQ, true/false & short answers with scoring
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRoute('flashcards')}
                className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-4 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600"
              >
                <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Practice Flashcards
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Interactive flip cards generated from your notes
                </span>
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Recent Study Sessions
              </h2>
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRoute('history')}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                >
                  View all history
                </button>
              )}
            </div>

            {dataLoading ? (
              <div className="space-y-3" aria-label="Loading sessions">
                <div className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center space-y-2">
                <MessageSquare
                  className="h-6 w-6 text-slate-400 mx-auto"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  No saved study sessions yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {user
                    ? 'Ask a question in Study Assistant, summarize a PDF, or finish a quiz to see your real activity here.'
                    : 'Sign in with Google to save your study sessions, quiz scores, and flashcard decks.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {sessions.slice(0, 5).map((session) => (
                  <li key={session.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="capitalize">{session.feature}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{session.subject}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <InferenceStatusBadge executionMode={session.inferenceSource} compact />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Live Hybrid Inference Capability Status */}
        <aside className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 h-fit">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Hybrid Inference Status
            </h2>
            <button
              type="button"
              onClick={refreshCapability}
              aria-label="Refresh capability status"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Re-check</span>
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Active Policy</span>
              <span className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                {modePreference}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Detected Browser</span>
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                {capability.browserName}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">On-Device Gemini Nano</span>
              {capability.deviceAvailability === 'available' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Available</span>
                </span>
              ) : capability.deviceAvailability === 'downloadable' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Downloadable</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{capability.deviceAvailability.replace('_', ' ')}</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Cloud Fallback Model</span>
              {capability.isOnline ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 font-mono">
                  <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{capability.cloudModel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Offline</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500 dark:text-slate-400">Firebase App Check</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {capability.appCheckConfigured
                    ? 'Active (reCAPTCHA Enterprise)'
                    : 'Not configured (dev optional)'}
                </span>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">
            {capability.details}
          </p>

          {(capability.deviceAvailability === 'downloadable' ||
            capability.deviceAvailability === 'downloading') && (
            <button
              type="button"
              onClick={prepareLocalModel}
              disabled={preparingLocalModel}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>
                {preparingLocalModel
                  ? `Initializing Gemini Nano (${localDownloadProgress ?? 0}%)...`
                  : 'Prepare Local Gemini Nano Model'}
              </span>
            </button>
          )}

          {localModelMessage && (
            <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{localModelMessage}</span>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
