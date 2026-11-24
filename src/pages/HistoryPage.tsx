import { useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { InferenceStatusBadge } from '@/src/components/InferenceStatusBadge';
import { useStudyMate } from '@/src/context/StudyMateContext';

type HistoryTab = 'sessions' | 'notes' | 'quizzes' | 'flashcards';

export function HistoryPage() {
  const {
    user,
    signInWithGoogle,
    notes,
    sessions,
    quizResults,
    flashcardSets,
    removeNote,
    removeQuizResult,
    removeFlashcardDeck,
    removeSession,
    setRoute,
  } = useStudyMate();

  const [tab, setTab] = useState<HistoryTab>('sessions');
  const [confirmTarget, setConfirmTarget] = useState<{
    type: HistoryTab;
    id: string;
    label: string;
  } | null>(null);

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setConfirmTarget(null);
    if (target.type === 'sessions') await removeSession(target.id);
    if (target.type === 'notes') await removeNote(target.id);
    if (target.type === 'quizzes') await removeQuizResult(target.id);
    if (target.type === 'flashcards') await removeFlashcardDeck(target.id);
  };

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4">
        <History className="h-8 w-8 text-slate-400 mx-auto" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Sign in to view your saved Study History
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          StudyMate AI stores saved note summaries, quiz results, flashcard decks, and session logs
          privately under your verified Google account in Cloud Firestore.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Study History</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Review or delete your saved notes, quiz scores, flashcard decks, and study sessions.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
          {(
            [
              ['sessions', `Sessions (${sessions.length})`],
              ['notes', `Notes (${notes.length})`],
              ['quizzes', `Quizzes (${quizResults.length})`],
              ['flashcards', `Flashcards (${flashcardSets.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap tabular-nums ${
                tab === key
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        {tab === 'sessions' &&
          (sessions.length === 0 ? (
            <EmptyHistory message="No recorded study sessions yet." onAction={() => setRoute('assistant')} actionLabel="Open Study Assistant" />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {sessions.map((s) => (
                <li key={s.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {s.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      <span className="capitalize">{s.feature}</span> · {s.subject} ·{' '}
                      {new Date(s.createdAt).toLocaleString()}
                    </p>
                    {s.fallbackReason && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {s.fallbackReason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <InferenceStatusBadge executionMode={s.inferenceSource} compact />
                    <button
                      type="button"
                      aria-label={`Delete session ${s.title}`}
                      onClick={() =>
                        setConfirmTarget({ type: 'sessions', id: s.id, label: s.title })
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'notes' &&
          (notes.length === 0 ? (
            <EmptyHistory message="No saved note summaries yet." onAction={() => setRoute('notes')} actionLabel="Open Notes & PDF Reader" />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {notes.map((n) => (
                <li key={n.id} className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {n.subject} · {n.sourceType.toUpperCase()} · {n.pageCount} pages ·{' '}
                        {new Date(n.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {n.inferenceSource && (
                        <InferenceStatusBadge executionMode={n.inferenceSource} compact />
                      )}
                      <button
                        type="button"
                        aria-label={`Delete note ${n.title}`}
                        onClick={() => setConfirmTarget({ type: 'notes', id: n.id, label: n.title })}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {n.summary && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {n.summary}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ))}

        {tab === 'quizzes' &&
          (quizResults.length === 0 ? (
            <EmptyHistory message="No saved quiz results yet." onAction={() => setRoute('quiz')} actionLabel="Open Quiz Generator" />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {quizResults.map((q) => (
                <li key={q.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {q.topic}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {q.subject} · <span className="capitalize">{q.difficulty}</span> ·{' '}
                      {q.correctCount}/{q.totalQuestions} ({q.scorePercent}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <InferenceStatusBadge executionMode={q.inferenceSource} compact />
                    <button
                      type="button"
                      aria-label={`Delete quiz result ${q.topic}`}
                      onClick={() =>
                        setConfirmTarget({ type: 'quizzes', id: q.id, label: q.topic })
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'flashcards' &&
          (flashcardSets.length === 0 ? (
            <EmptyHistory message="No saved flashcard decks yet." onAction={() => setRoute('flashcards')} actionLabel="Open Flashcards" />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {flashcardSets.map((set) => (
                <li key={set.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {set.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {set.subject} · {set.cardCount} cards ·{' '}
                      {new Date(set.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <InferenceStatusBadge executionMode={set.inferenceSource} compact />
                    <button
                      type="button"
                      aria-label={`Delete flashcard deck ${set.title}`}
                      onClick={() =>
                        setConfirmTarget({ type: 'flashcards', id: set.id, label: set.title })
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </section>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="Delete saved item?"
        description={`Are you sure you want to permanently remove "${confirmTarget?.label ?? ''}" from your Firestore library?`}
        confirmLabel="Delete permanently"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}

function EmptyHistory({
  message,
  onAction,
  actionLabel,
}: {
  message: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className="py-10 text-center space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
      >
        {actionLabel}
      </button>
    </div>
  );
}
