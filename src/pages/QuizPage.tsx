import { useEffect, useState } from 'react';
import {
  BookmarkPlus,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { InferenceStatusBadge } from '@/src/components/InferenceStatusBadge';
import { useStudyMate } from '@/src/context/StudyMateContext';
import { scoreQuizAttempt } from '@/src/services/ai/aiSchemas';
import { generateStudyQuiz } from '@/src/services/ai/quizGenerator';
import type {
  AIResponseMetadata,
  QuizDifficulty,
  QuizEvaluation,
  QuizQuestion,
  QuizQuestionType,
  QuizSet,
} from '@/src/types/study';
import { validateQuestionCount, validateStudyPrompt } from '@/src/utils/validation';

export function QuizPage() {
  const {
    user,
    preferredSubject,
    modePreference,
    cloudConsentGiven,
    remoteConfig,
    requestCloudConsent,
    activeStudySource,
    logSessionActivity,
    saveQuizScore,
    demoModeActive,
  } = useStudyMate();

  const [subject, setSubject] = useState(activeStudySource?.subject ?? preferredSubject);
  const [topic, setTopic] = useState(activeStudySource?.title ?? '');
  const [sourceText, setSourceText] = useState(activeStudySource?.text ?? '');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('intermediate');
  const [questionCount, setQuestionCount] = useState(remoteConfig.defaultQuestionCount);
  const [selectedTypes, setSelectedTypes] = useState<QuizQuestionType[]>([
    'mcq',
    'true_false',
    'short_answer',
  ]);

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [metadata, setMetadata] = useState<AIResponseMetadata | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (activeStudySource) {
      setSubject(activeStudySource.subject);
      setTopic(activeStudySource.title);
      setSourceText(activeStudySource.text);
    }
  }, [activeStudySource]);

  const toggleType = (type: QuizQuestionType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.length > 1 ? prev.filter((t) => t !== type) : prev;
      }
      return [...prev, type];
    });
  };

  const handleGenerate = async (consentOverride?: boolean) => {
    if (generating) return;
    const validation = validateStudyPrompt(sourceText, remoteConfig.maxNoteChars);
    if (!validation.valid) {
      setErrorMsg(validation.error ?? 'Provide study notes to generate a quiz.');
      return;
    }

    setErrorMsg(null);
    setEvaluation(null);
    setSavedNotice(null);
    setAnswers({});
    setGenerating(true);

    try {
      const resolvedTopic = topic.trim() || `${subject} Study Check`;
      const count = validateQuestionCount(questionCount, 1, 15);
      const result = await generateStudyQuiz({
        sourceText: validation.value,
        subject: subject.trim() || 'General',
        topic: resolvedTopic,
        difficulty,
        questionCount: count,
        questionTypes: selectedTypes,
        modePreference,
        cloudConsentGiven: consentOverride ?? cloudConsentGiven,
        cloudModelName: remoteConfig.cloudModelName,
        simulateDemoMode: demoModeActive,
      });

      if (result.metadata.status === 'consent_required') {
        requestCloudConsent(
          result.metadata.fallbackReason ||
            'Local inference is unavailable. Allow sending your notes excerpt to Firebase AI Logic to generate this quiz?',
          () => handleGenerate(true),
        );
        return;
      }

      setMetadata(result.metadata);
      if (!result.data || result.metadata.status !== 'success') {
        setErrorMsg(result.metadata.errorMessage ?? 'Could not generate quiz.');
        return;
      }

      setQuiz(result.data);
      setActiveQuestions(result.data.questions);

      await logSessionActivity({
        feature: 'quiz',
        subject: subject.trim() || 'General',
        title: `Quiz: ${resolvedTopic}`,
        metadata: result.metadata,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitQuiz = () => {
    if (activeQuestions.length === 0) return;
    const scored = scoreQuizAttempt(activeQuestions, answers);
    setEvaluation(scored);
    setSavedNotice(null);
  };

  const handleRetryIncorrect = () => {
    if (!evaluation || !quiz) return;
    const incorrectIds = new Set(
      evaluation.results.filter((r) => !r.isCorrect).map((r) => r.questionId),
    );
    const filtered = quiz.questions.filter((q) => incorrectIds.has(q.id));
    if (filtered.length === 0) return;
    setActiveQuestions(filtered);
    setAnswers({});
    setEvaluation(null);
    setSavedNotice(null);
  };

  const handleSaveScore = async () => {
    if (!user || !evaluation || !quiz || !metadata || metadata.isSimulated) return;
    await saveQuizScore({
      topic: quiz.topic,
      subject: quiz.subject,
      difficulty: quiz.difficulty,
      totalQuestions: evaluation.totalQuestions,
      correctCount: evaluation.correctCount,
      scorePercent: evaluation.scorePercent,
      inferenceSource: metadata.executionMode,
    });
    setSavedNotice('Quiz score saved to your study history.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Quiz Generator</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Generate multiple-choice, true/false, and short-answer questions validated against a
          strict TypeScript schema and scored deterministically on your device.
        </p>
      </div>

      {/* Configuration Card */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="quiz-subject"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Subject
            </label>
            <input
              id="quiz-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="quiz-topic"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Topic
            </label>
            <input
              id="quiz-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Cellular Respiration"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="quiz-difficulty"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Difficulty
            </label>
            <select
              id="quiz-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="quiz-count"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Questions (1–15)
            </label>
            <input
              id="quiz-count"
              type="number"
              min={1}
              max={15}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-medium">Question types:</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.includes('mcq')}
              onChange={() => toggleType('mcq')}
            />
            <span>Multiple choice</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.includes('true_false')}
              onChange={() => toggleType('true_false')}
            />
            <span>True / False</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.includes('short_answer')}
              onChange={() => toggleType('short_answer')}
            />
            <span>Short answer</span>
          </label>
        </div>

        <div>
          <label
            htmlFor="quiz-notes"
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Source Notes or Study Text
          </label>
          <textarea
            id="quiz-notes"
            rows={5}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste lecture notes or send an excerpt from Notes & PDF Reader..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {sourceText.trim().length.toLocaleString()} /{' '}
            {remoteConfig.maxNoteChars.toLocaleString()} chars
          </span>
          <button
            type="button"
            disabled={generating || !sourceText.trim()}
            onClick={() => handleGenerate()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span>{generating ? 'Generating quiz...' : 'Generate Quiz'}</span>
          </button>
        </div>
      </section>

      {/* Active Quiz Runner */}
      {quiz && activeQuestions.length > 0 && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {quiz.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {quiz.subject} · <span className="capitalize">{quiz.difficulty}</span> ·{' '}
                {activeQuestions.length} questions
              </p>
            </div>
            {metadata && (
              <InferenceStatusBadge executionMode={metadata.executionMode} metadata={metadata} />
            )}
          </div>

          {evaluation && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Quiz Score</p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {evaluation.correctCount} / {evaluation.totalQuestions} ({evaluation.scorePercent}%)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {evaluation.correctCount < evaluation.totalQuestions && (
                  <button
                    type="button"
                    onClick={handleRetryIncorrect}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Retry incorrect</span>
                  </button>
                )}
                {user && metadata && !metadata.isSimulated && (
                  <button
                    type="button"
                    onClick={handleSaveScore}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 whitespace-nowrap"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Save Score</span>
                  </button>
                )}
              </div>
              {savedNotice && (
                <p className="w-full text-xs text-emerald-700 dark:text-emerald-400">
                  {savedNotice}
                </p>
              )}
            </div>
          )}

          <ol className="space-y-6">
            {activeQuestions.map((q, idx) => {
              const evalResult = evaluation?.results.find((r) => r.questionId === q.id);
              return (
                <li
                  key={q.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      <span className="tabular-nums mr-1.5">{idx + 1}.</span>
                      {q.prompt}
                    </p>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap uppercase">
                      {q.type.replace('_', ' ')}
                    </span>
                  </div>

                  {q.type === 'short_answer' ? (
                    <input
                      type="text"
                      disabled={Boolean(evaluation)}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Type your short answer..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    />
                  ) : (
                    <div className="space-y-2">
                      {(q.options ?? []).map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <input
                            type="radio"
                            name={q.id}
                            disabled={Boolean(evaluation)}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          />
                          <span className="text-slate-800 dark:text-slate-200">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {evalResult && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        {evalResult.isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            <span>Correct</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            <span>Incorrect · Correct answer: {evalResult.correctAnswer}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {evalResult.explanation}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {!evaluation && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmitQuiz}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 whitespace-nowrap"
              >
                Submit Answers
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
