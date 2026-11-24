import { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Eraser,
  Send,
  Square,
} from 'lucide-react';
import { InferenceStatusBadge } from '@/src/components/InferenceStatusBadge';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';
import { useStudyMate } from '@/src/context/StudyMateContext';
import {
  askStudyAssistant,
  transformAssistantAnswer,
} from '@/src/services/ai/studyAssistant';
import type { AssistantMessage, ExplanationStyle } from '@/src/types/study';
import { LIMITS, validateStudyPrompt } from '@/src/utils/validation';

const SUBJECT_OPTIONS = [
  'Computer Science',
  'Mathematics',
  'Biology',
  'Chemistry',
  'Physics',
  'Economics',
  'Psychology',
  'History',
  'General Studies',
];

const STYLE_LABELS: Record<ExplanationStyle, string> = {
  clear: 'Balanced academic',
  simple: 'Simpler English',
  exam: 'Exam-oriented',
  worked_example: 'Worked example',
  revision: 'Short revision summary',
};

const EXAMPLE_PROMPTS = [
  'Explain dynamic programming vs. greedy algorithms with a simple college-level example.',
  'How does the Bohr effect change hemoglobin oxygen affinity during exercise?',
  'Walk through Bayes theorem step by step using a diagnostic test example.',
  'Compare fiscal policy and monetary policy for an introductory macroeconomics exam.',
];

export function AssistantPage() {
  const {
    preferredSubject,
    setPreferredSubject,
    explanationStyle,
    setExplanationStyle,
    modePreference,
    cloudConsentGiven,
    remoteConfig,
    requestCloudConsent,
    logSessionActivity,
    demoModeActive,
  } = useStudyMate();

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runPrompt = async (questionText: string, consentOverride?: boolean) => {
    if (loading) return;
    const validation = validateStudyPrompt(questionText, LIMITS.PROMPT_INPUT_MAX);
    if (!validation.valid) {
      setInputError(validation.error ?? 'Invalid input.');
      return;
    }

    setInputError(null);
    const userMessage: AssistantMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: validation.value,
      subject: preferredSubject,
      style: explanationStyle,
      createdAt: Date.now(),
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await askStudyAssistant({
        question: validation.value,
        subject: preferredSubject,
        style: explanationStyle,
        history: messages,
        modePreference,
        cloudConsentGiven: consentOverride ?? cloudConsentGiven,
        cloudModelName: remoteConfig.cloudModelName,
        signal: controller.signal,
        simulateDemoMode: demoModeActive,
      });

      if (result.metadata.status === 'consent_required') {
        // Revert optimistic message so user can approve and re-send cleanly
        setMessages(messages);
        setInput(validation.value);
        requestCloudConsent(
          result.metadata.fallbackReason ||
            'Local inference is unavailable. Allow sending this question to Firebase AI Logic cloud models?',
          () => {
            runPrompt(validation.value, true);
          },
        );
        return;
      }

      const assistantMsg: AssistantMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content:
          result.data ??
          result.metadata.errorMessage ??
          'Unable to generate a response for this request.',
        subject: preferredSubject,
        style: explanationStyle,
        createdAt: Date.now(),
        metadata: result.metadata,
      };

      setMessages([...nextHistory, assistantMsg]);

      if (result.metadata.status === 'success') {
        await logSessionActivity({
          feature: 'assistant',
          subject: preferredSubject,
          title: validation.value.slice(0, 120),
          metadata: result.metadata,
        });
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  const handleTransform = async (
    targetMsg: AssistantMessage,
    targetStyle: ExplanationStyle,
    consentOverride?: boolean,
  ) => {
    if (loading) return;
    const msgIdx = messages.findIndex((m) => m.id === targetMsg.id);
    const precedingUser =
      msgIdx > 0 && messages[msgIdx - 1]?.role === 'user'
        ? messages[msgIdx - 1].content
        : targetMsg.content.slice(0, 300);

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await transformAssistantAnswer({
        originalQuestion: precedingUser,
        previousAnswer: targetMsg.content,
        subject: targetMsg.subject,
        targetStyle,
        modePreference,
        cloudConsentGiven: consentOverride ?? cloudConsentGiven,
        cloudModelName: remoteConfig.cloudModelName,
        signal: controller.signal,
        simulateDemoMode: demoModeActive,
      });

      if (result.metadata.status === 'consent_required') {
        requestCloudConsent(
          result.metadata.fallbackReason || 'Confirm cloud processing for this follow-up explanation.',
          () => {
            handleTransform(targetMsg, targetStyle, true);
          },
        );
        return;
      }

      const followUp: AssistantMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content:
          result.data ??
          result.metadata.errorMessage ??
          'Unable to generate follow-up explanation.',
        subject: targetMsg.subject,
        style: targetStyle,
        createdAt: Date.now(),
        metadata: result.metadata,
      };
      setMessages((prev) => [...prev, followUp]);
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000);
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            AI Study Assistant
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ask concept questions, request worked examples, or convert answers for exam revision.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            abortRef.current?.abort();
            setMessages([]);
            setInputError(null);
          }}
          disabled={messages.length === 0 && !loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Clear conversation</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="assistant-subject"
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Subject
          </label>
          <select
            id="assistant-subject"
            value={preferredSubject}
            onChange={(e) => setPreferredSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            {SUBJECT_OPTIONS.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="assistant-style"
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Explanation style
          </label>
          <select
            id="assistant-style"
            value={explanationStyle}
            onChange={(e) => setExplanationStyle(e.target.value as ExplanationStyle)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            {(Object.keys(STYLE_LABELS) as ExplanationStyle[]).map((styleKey) => (
              <option key={styleKey} value={styleKey}>
                {STYLE_LABELS[styleKey]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conversation Area */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 min-h-[340px]">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Try an example prompt
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Every response shows whether it ran locally via Gemini Nano or via Firebase AI Logic
                cloud fallback.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setInput(ex)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors leading-relaxed"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={
                  msg.role === 'user'
                    ? 'rounded-lg bg-slate-100 dark:bg-slate-800/70 p-4'
                    : 'border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {msg.role === 'user' ? 'You' : 'StudyMate AI'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{msg.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{STYLE_LABELS[msg.style]}</span>
                  </div>
                  {msg.role === 'assistant' && msg.metadata && (
                    <InferenceStatusBadge
                      executionMode={msg.metadata.executionMode}
                      metadata={msg.metadata}
                    />
                  )}
                </div>

                {msg.role === 'user' ? (
                  <p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                ) : (
                  <>
                    <MarkdownRenderer content={msg.content} />
                    {msg.metadata?.status === 'success' && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Copy answer</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleTransform(msg, 'simple')}
                          className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          Simpler explanation
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleTransform(msg, 'exam')}
                          className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          Exam-oriented
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleTransform(msg, 'worked_example')}
                          className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          Worked example
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleTransform(msg, 'revision')}
                          className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          Revision summary
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}

            {loading && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-2.5">
                <div className="h-4 w-36 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runPrompt(input);
        }}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
      >
        <label htmlFor="assistant-prompt-input" className="sr-only">
          Ask a study question
        </label>
        <textarea
          id="assistant-prompt-input"
          rows={3}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (inputError) setInputError(null);
          }}
          placeholder="Ask a question about your course material, paste a concept, or request a worked example..."
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-indigo-600"
        />

        {inputError && (
          <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
            {inputError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {input.trim().length.toLocaleString()} / {LIMITS.PROMPT_INPUT_MAX.toLocaleString()} chars
          </span>

          <div className="flex items-center gap-2">
            {loading && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cancel</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{loading ? 'Generating...' : 'Ask StudyMate'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
