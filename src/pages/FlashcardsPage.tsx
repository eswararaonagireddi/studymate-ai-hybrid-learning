import { useEffect, useState } from 'react';
import {
  BookmarkPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  RotateCw,
  Shuffle,
} from 'lucide-react';
import { InferenceStatusBadge } from '@/src/components/InferenceStatusBadge';
import { useStudyMate } from '@/src/context/StudyMateContext';
import { generateStudyFlashcards } from '@/src/services/ai/flashcardGenerator';
import type { AIResponseMetadata, FlashcardItem } from '@/src/types/study';
import { validateQuestionCount, validateStudyPrompt } from '@/src/utils/validation';

export function FlashcardsPage() {
  const {
    user,
    preferredSubject,
    modePreference,
    cloudConsentGiven,
    remoteConfig,
    requestCloudConsent,
    activeStudySource,
    flashcardSets,
    logSessionActivity,
    saveFlashcardDeck,
    demoModeActive,
  } = useStudyMate();

  const [subject, setSubject] = useState(activeStudySource?.subject ?? preferredSubject);
  const [topic, setTopic] = useState(activeStudySource?.title ?? '');
  const [sourceText, setSourceText] = useState(activeStudySource?.text ?? '');
  const [cardCount, setCardCount] = useState(6);

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [metadata, setMetadata] = useState<AIResponseMetadata | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeStudySource) {
      setSubject(activeStudySource.subject);
      setTopic(activeStudySource.title);
      setSourceText(activeStudySource.text);
    }
  }, [activeStudySource]);

  const handleGenerate = async (consentOverride?: boolean) => {
    if (generating) return;
    const validation = validateStudyPrompt(sourceText, remoteConfig.maxNoteChars);
    if (!validation.valid) {
      setErrorMsg(validation.error ?? 'Provide study notes to generate flashcards.');
      return;
    }

    setErrorMsg(null);
    setSaveMessage(null);
    setGenerating(true);

    try {
      const resolvedTopic = topic.trim() || `${subject} Key Concepts`;
      const count = validateQuestionCount(cardCount, 2, 20);
      const result = await generateStudyFlashcards({
        sourceText: validation.value,
        subject: subject.trim() || 'General',
        topic: resolvedTopic,
        cardCount: count,
        modePreference,
        cloudConsentGiven: consentOverride ?? cloudConsentGiven,
        cloudModelName: remoteConfig.cloudModelName,
        simulateDemoMode: demoModeActive,
      });

      if (result.metadata.status === 'consent_required') {
        requestCloudConsent(
          result.metadata.fallbackReason ||
            'On-device inference is unavailable. Allow sending this excerpt to Firebase AI Logic to build flashcards?',
          () => handleGenerate(true),
        );
        return;
      }

      setMetadata(result.metadata);
      if (!result.data || result.metadata.status !== 'success') {
        setErrorMsg(result.metadata.errorMessage ?? 'Could not generate flashcards.');
        return;
      }

      setCards(result.data);
      setCurrentIndex(0);
      setFlipped(false);
      setReviewedIds(new Set([result.data[0]?.id ?? '']));
      setCompleted(false);

      await logSessionActivity({
        feature: 'flashcards',
        subject: subject.trim() || 'General',
        title: `Flashcards: ${resolvedTopic}`,
        metadata: result.metadata,
      });
    } finally {
      setGenerating(false);
    }
  };

  const currentCard = cards[currentIndex] ?? null;

  const goToIndex = (nextIdx: number) => {
    if (cards.length === 0) return;
    if (nextIdx >= cards.length) {
      setCompleted(true);
      return;
    }
    const clamped = Math.max(0, Math.min(cards.length - 1, nextIdx));
    setCurrentIndex(clamped);
    setFlipped(false);
    setCompleted(false);
    const id = cards[clamped]?.id;
    if (id) {
      setReviewedIds((prev) => new Set(prev).add(id));
    }
  };

  const handleShuffle = () => {
    if (cards.length < 2) return;
    const copy = [...cards];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setCards(copy);
    setCurrentIndex(0);
    setFlipped(false);
    setCompleted(false);
  };

  const handleSaveDeck = async () => {
    if (!user || cards.length === 0 || !metadata || metadata.isSimulated) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const id = await saveFlashcardDeck({
        title: topic.trim() || `${subject} Flashcards`,
        subject: subject.trim() || 'General',
        cards,
        inferenceSource: metadata.executionMode,
      });
      if (id) {
        setSaveMessage('Flashcard deck saved to your Firestore library.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Flashcards</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Generate active-recall cards from your notes, flip and shuffle to revise, and save decks
          only when you choose.
        </p>
      </div>

      {/* Generator Panel */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="fc-subject"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Subject
            </label>
            <input
              id="fc-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="fc-topic"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Deck Title / Topic
            </label>
            <input
              id="fc-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Linear Algebra Eigenvalues"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="fc-count"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Cards (2–20)
            </label>
            <input
              id="fc-count"
              type="number"
              min={2}
              max={20}
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="fc-notes"
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Study Notes
          </label>
          <textarea
            id="fc-notes"
            rows={4}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste study notes or load from Notes & PDF Reader..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {flashcardSets.length > 0 ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Load saved deck:</span>
              <select
                aria-label="Load saved flashcard deck"
                defaultValue=""
                onChange={(e) => {
                  const chosen = flashcardSets.find((s) => s.id === e.target.value);
                  if (!chosen) return;
                  setCards(chosen.cards);
                  setTopic(chosen.title);
                  setSubject(chosen.subject);
                  setCurrentIndex(0);
                  setFlipped(false);
                  setCompleted(false);
                  setReviewedIds(new Set([chosen.cards[0]?.id ?? '']));
                  setMetadata({
                    executionMode: chosen.inferenceSource,
                    requestedMode: modePreference,
                    fallbackOccurred: false,
                    status: 'success',
                    latencyMs: 0,
                  });
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="" disabled>
                  Select deck...
                </option>
                {flashcardSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.title} ({set.cardCount} cards)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span />
          )}

          <button
            type="button"
            disabled={generating || !sourceText.trim()}
            onClick={() => handleGenerate()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>{generating ? 'Generating cards...' : 'Generate Flashcards'}</span>
          </button>
        </div>
      </section>

      {/* Interactive Study Deck */}
      {cards.length > 0 && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Card {Math.min(currentIndex + 1, cards.length)} of {cards.length}
              </span>
              <span aria-hidden="true">·</span>
              <span>{reviewedIds.size} reviewed</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {metadata && (
                <InferenceStatusBadge executionMode={metadata.executionMode} metadata={metadata} />
              )}
              <button
                type="button"
                onClick={handleShuffle}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Shuffle</span>
              </button>
              {user && metadata && !metadata.isSimulated && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDeck}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:hover:bg-indigo-700 whitespace-nowrap"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{saving ? 'Saving...' : 'Save Deck'}</span>
                </button>
              )}
            </div>
          </div>

          {saveMessage && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>{saveMessage}</span>
            </p>
          )}

          {/* Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-200"
              style={{
                width: `${Math.round(((currentIndex + 1) / cards.length) * 100)}%`,
              }}
            />
          </div>

          {completed ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-8 text-center space-y-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" aria-hidden="true" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Deck Review Complete
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                  You reviewed {reviewedIds.size} of {cards.length} flashcards.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => goToIndex(0)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Restart Deck
                </button>
                <button
                  type="button"
                  onClick={handleShuffle}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                >
                  Shuffle & Study Again
                </button>
              </div>
            </div>
          ) : (
            currentCard && (
              <div className="space-y-4">
                <div className="perspective-1000">
                  <button
                    type="button"
                    onClick={() => setFlipped((f) => !f)}
                    aria-pressed={flipped}
                    aria-label={flipped ? 'Show term side' : 'Flip card to reveal answer'}
                    className="w-full min-h-[240px] relative preserve-3d transition-transform duration-300 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 rounded-xl"
                    style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                  >
                    {/* Front */}
                    <div className="backface-hidden absolute inset-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{currentCard.topic || subject}</span>
                        <span className="inline-flex items-center gap-1">
                          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Click to flip</span>
                        </span>
                      </div>
                      <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-50 text-center px-2">
                        {currentCard.term}
                      </p>
                      <div className="text-xs text-slate-400 text-center">
                        {currentCard.sourceReference || 'Term / Prompt'}
                      </div>
                    </div>

                    {/* Back */}
                    <div className="backface-hidden rotate-y-180 absolute inset-0 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-slate-800 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
                      <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300">
                        <span>Answer / Definition</span>
                        <span className="inline-flex items-center gap-1">
                          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Click to flip back</span>
                        </span>
                      </div>
                      <div className="space-y-3 text-center my-auto px-2">
                        <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-50 leading-relaxed">
                          {currentCard.definition}
                        </p>
                        {currentCard.example && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Example: {currentCard.example}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        {currentCard.sourceReference || 'Active recall check'}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => goToIndex(currentIndex - 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => goToIndex(currentIndex + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    <span>
                      {currentIndex === cards.length - 1 ? 'Finish Deck' : 'Next Card'}
                    </span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
}
