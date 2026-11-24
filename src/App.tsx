import { useState } from 'react';
import {
  BookOpen,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  WifiOff,
  X,
} from 'lucide-react';
import { CloudConsentModal } from '@/src/components/CloudConsentModal';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { StudyMateProvider, useStudyMate } from '@/src/context/StudyMateContext';
import { AssistantPage } from '@/src/pages/AssistantPage';
import { DashboardPage } from '@/src/pages/DashboardPage';
import { FlashcardsPage } from '@/src/pages/FlashcardsPage';
import { HistoryPage } from '@/src/pages/HistoryPage';
import { NotesReaderPage } from '@/src/pages/NotesReaderPage';
import { QuizPage } from '@/src/pages/QuizPage';
import { SettingsPage } from '@/src/pages/SettingsPage';
import type { AppRoute } from '@/src/types/study';

const NAV_ITEMS: Array<{ id: AppRoute; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assistant', label: 'AI Study Assistant', icon: MessageSquare },
  { id: 'notes', label: 'Notes & PDF Reader', icon: FileText },
  { id: 'quiz', label: 'Quiz Generator', icon: HelpCircle },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'history', label: 'Study History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function AppShell() {
  const {
    route,
    setRoute,
    user,
    authReady,
    authBusy,
    authError,
    signInWithGoogle,
    signOutUser,
    theme,
    toggleTheme,
    capability,
    firestoreError,
    firestoreOffline,
  } = useStudyMate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (nextRoute: AppRoute) => {
    setRoute(nextRoute);
    setMobileMenuOpen(false);
  };

  const activeNav = NAV_ITEMS.find((n) => n.id === route) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800">
          <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap">
            StudyMate AI
          </span>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
            <BookOpen className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <span>Privacy Notice</span>
          </div>
          <p className="leading-relaxed">
            PDFs are extracted locally in your browser. Cloud fallback is disclosed before sending
            notes.
          </p>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span className="text-base font-semibold">StudyMate AI</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Mobile navigation" className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = route === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {activeNav.label}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {authReady &&
              (user ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-xs text-slate-600 dark:text-slate-300 max-w-[160px] truncate">
                    {user.displayName || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={signOutUser}
                    disabled={authBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={authBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
                >
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{authBusy ? 'Signing in...' : 'Sign in'}</span>
                </button>
              ))}
          </div>
        </header>

        {/* System Notices */}
        {(!capability.isOnline || firestoreOffline) && (
          <div
            role="status"
            className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 px-4 sm:px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2"
          >
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              You appear to be offline. Cloud fallback and Firestore sync are unavailable; local
              on-device Gemini Nano remains usable if already available in Chrome.
            </span>
          </div>
        )}

        {(authError || firestoreError) && (
          <div
            role="alert"
            className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900 px-4 sm:px-6 py-2.5 text-xs text-rose-800 dark:text-rose-200"
          >
            {authError || firestoreError}
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {route === 'dashboard' && <DashboardPage />}
          {route === 'assistant' && <AssistantPage />}
          {route === 'notes' && <NotesReaderPage />}
          {route === 'quiz' && <QuizPage />}
          {route === 'flashcards' && <FlashcardsPage />}
          {route === 'history' && <HistoryPage />}
          {route === 'settings' && <SettingsPage />}
        </main>
      </div>

      <CloudConsentModal />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StudyMateProvider>
        <AppShell />
      </StudyMateProvider>
    </ErrorBoundary>
  );
}
