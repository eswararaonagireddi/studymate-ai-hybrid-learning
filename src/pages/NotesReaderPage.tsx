import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookmarkPlus,
  CheckCircle2,
  FileText,
  HelpCircle,
  Layers,
  Send,
  Upload,
} from 'lucide-react';
import { InferenceStatusBadge } from '@/src/components/InferenceStatusBadge';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';
import { useStudyMate } from '@/src/context/StudyMateContext';
import { processStudyNotes, type NotesTaskType } from '@/src/services/ai/summarizer';
import type { AIResponseMetadata, PdfExtractionResult } from '@/src/types/study';
import { buildExcerptFromPages, extractTextFromPdfFile } from '@/src/utils/pdfExtractor';
import { LIMITS } from '@/src/utils/validation';

export function NotesReaderPage() {
  const {
    user,
    preferredSubject,
    modePreference,
    cloudConsentGiven,
    remoteConfig,
    requestCloudConsent,
    logSessionActivity,
    saveNote,
    setActiveStudySource,
    setRoute,
    demoModeActive,
  } = useStudyMate();

  const [sourceMode, setSourceMode] = useState<'pdf' | 'text'>('pdf');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(preferredSubject);
  const [pastedText, setPastedText] = useState('');

  const [pdfResult, setPdfResult] = useState<PdfExtractionResult | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [qaQuestion, setQaQuestion] = useState('');
  const [runningTask, setRunningTask] = useState<NotesTaskType | null>(null);
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [aiMetadata, setAiMetadata] = useState<AIResponseMetadata | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const selectedExcerptInfo = useMemo(() => {
    if (sourceMode === 'text') {
      const cleaned = pastedText.trim();
      return {
        excerpt: cleaned.slice(0, remoteConfig.maxNoteChars),
        includedPages: [] as number[],
        truncated: cleaned.length > remoteConfig.maxNoteChars,
        totalChars: cleaned.length,
      };
    }
    if (!pdfResult) {
      return { excerpt: '', includedPages: [], truncated: false, totalChars: 0 };
    }
    const built = buildExcerptFromPages(
      pdfResult.pages,
      selectedPages,
      remoteConfig.maxNoteChars,
    );
    return { ...built, totalChars: built.excerpt.length };
  }, [sourceMode, pastedText, pdfResult, selectedPages, remoteConfig.maxNoteChars]);

  const handlePdfUpload = async (file: File | undefined) => {
    if (!file) return;
    setExtracting(true);
    setExtractError(null);
    setPdfResult(null);
    setAiOutput(null);
    setAiMetadata(null);
    setSaveSuccess(null);

    try {
      const extracted = await extractTextFromPdfFile(file);
      setPdfResult(extracted);
      setTitle(extracted.title);
      const initialPages = extracted.pages
        .filter((p) => p.text.length > 0)
        .slice(0, 5)
        .map((p) => p.pageNumber);
      setSelectedPages(initialPages);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Failed to extract PDF text.');
    } finally {
      setExtracting(false);
    }
  };

  const togglePageSelection = (pageNumber: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNumber)
        ? prev.filter((p) => p !== pageNumber)
        : [...prev, pageNumber].sort((a, b) => a - b),
    );
  };

  const runNotesAi = async (task: NotesTaskType, consentOverride?: boolean) => {
    if (runningTask) return;
    if (!selectedExcerptInfo.excerpt.trim()) {
      setExtractError('Select at least one non-empty PDF page or paste study notes first.');
      return;
    }
    if (task === 'document_qa' && !qaQuestion.trim()) {
      setExtractError('Enter a question about your selected excerpt first.');
      return;
    }

    setExtractError(null);
    setSaveSuccess(null);
    setRunningTask(task);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const docTitle = title.trim() || pdfResult?.title || 'Study Notes';
      const result = await processStudyNotes({
        task,
        documentTitle: docTitle,
        subject: subject.trim() || 'General',
        excerpt: selectedExcerptInfo.excerpt,
        question: qaQuestion.trim(),
        pageNumbers: selectedExcerptInfo.includedPages,
        modePreference,
        cloudConsentGiven: consentOverride ?? cloudConsentGiven,
        cloudModelName: remoteConfig.cloudModelName,
        signal: controller.signal,
        simulateDemoMode: demoModeActive,
      });

      if (result.metadata.status === 'consent_required') {
        requestCloudConsent(
          result.metadata.fallbackReason ||
            'On-device inference is unavailable. Allow sending only the selected excerpt to Firebase AI Logic?',
          () => runNotesAi(task, true),
        );
        return;
      }

      setAiMetadata(result.metadata);
      setAiOutput(
        result.data ?? result.metadata.errorMessage ?? 'Could not process the selected notes.',
      );

      if (result.metadata.status === 'success') {
        await logSessionActivity({
          feature: 'notes',
          subject: subject.trim() || 'General',
          title: `${docTitle} (${task.replace('_', ' ')})`,
          metadata: result.metadata,
        });
      }
    } finally {
      abortRef.current = null;
      setRunningTask(null);
    }
  };

  const handleSaveSummaryToFirestore = async () => {
    if (!user || !aiOutput || !aiMetadata || aiMetadata.isSimulated) return;
    setSaving(true);
    setSaveSuccess(null);
    try {
      const id = await saveNote({
        title: title.trim() || pdfResult?.title || 'Study Notes',
        subject: subject.trim() || 'General',
        sourceType: sourceMode,
        pageCount: sourceMode === 'pdf' ? pdfResult?.pageCount ?? 1 : 1,
        charCount: selectedExcerptInfo.excerpt.length,
        excerptPreview: selectedExcerptInfo.excerpt.slice(0, LIMITS.EXCERPT_PREVIEW_MAX),
        summary: aiOutput,
        inferenceSource: aiMetadata.executionMode,
      });
      if (id) {
        setSaveSuccess('Saved summary metadata to your Firestore library.');
      }
    } finally {
      setSaving(false);
    }
  };

  const sendToFeature = (target: 'quiz' | 'flashcards') => {
    if (!selectedExcerptInfo.excerpt.trim()) return;
    setActiveStudySource({
      title: title.trim() || pdfResult?.title || 'Selected Study Notes',
      subject: subject.trim() || 'General',
      text: selectedExcerptInfo.excerpt,
      pageReferences: selectedExcerptInfo.includedPages,
    });
    setRoute(target);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Notes & PDF Reader
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Extract PDF text locally in your browser, select specific pages, and summarize only what
            you choose.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setSourceMode('pdf')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              sourceMode === 'pdf'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            PDF Upload (Local)
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('text')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              sourceMode === 'text'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Paste Study Notes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Source Input & Page Selector */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="note-title"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                >
                  Document / Note Title
                </label>
                <input
                  id="note-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Operating Systems Ch. 4"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="note-subject"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                >
                  Subject
                </label>
                <input
                  id="note-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Computer Science"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {sourceMode === 'pdf' ? (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-6 cursor-pointer hover:border-indigo-400 transition-colors">
                  <Upload className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {extracting ? 'Extracting PDF text locally...' : 'Choose a PDF file from your device'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Parsed locally in your browser · Max 20 MB · Never auto-uploaded
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(e) => handlePdfUpload(e.target.files?.[0])}
                  />
                </label>

                {pdfResult && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {pdfResult.fileName}
                      </span>
                      <span className="tabular-nums">
                        {pdfResult.pageCount} pages · {pdfResult.totalChars.toLocaleString()} chars
                      </span>
                    </div>

                    {pdfResult.warnings.map((w, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2"
                        role="alert"
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{w}</span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Select pages to include ({selectedPages.length} selected)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPages(
                              pdfResult.pages
                                .filter((p) => p.text.length > 0)
                                .slice(0, 5)
                                .map((p) => p.pageNumber),
                            )
                          }
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          First 5 pages
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPages([])}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
                      {pdfResult.pages.map((page) => {
                        const checked = selectedPages.includes(page.pageNumber);
                        return (
                          <label
                            key={page.pageNumber}
                            className="flex items-start gap-3 p-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={page.charCount === 0}
                              onChange={() => togglePageSelection(page.pageNumber)}
                              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                                  Page {page.pageNumber}
                                </span>
                                <span className="text-slate-400 tabular-nums">
                                  {page.charCount} chars
                                </span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {page.text || 'No selectable text on this page'}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="pasted-notes"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                >
                  Study Notes Excerpt
                </label>
                <textarea
                  id="pasted-notes"
                  rows={11}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lecture notes, textbook paragraphs, or definitions here..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {pastedText.trim().length.toLocaleString()} chars (max excerpt sent:{' '}
                  {remoteConfig.maxNoteChars.toLocaleString()})
                </p>
              </div>
            )}

            {extractError && (
              <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
                {extractError}
              </p>
            )}

            {selectedExcerptInfo.truncated && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Selected excerpt was trimmed to {remoteConfig.maxNoteChars.toLocaleString()} chars to
                keep inference fast and within safe limits.
              </p>
            )}
          </div>
        </div>

        {/* AI Processing & Output */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Actions on Selected Excerpt
            </h2>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(runningTask) || !selectedExcerptInfo.excerpt}
                onClick={() => runNotesAi('summary')}
                className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
              >
                {runningTask === 'summary' ? 'Summarizing...' : 'Summarize Excerpt'}
              </button>
              <button
                type="button"
                disabled={Boolean(runningTask) || !selectedExcerptInfo.excerpt}
                onClick={() => runNotesAi('key_points')}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                {runningTask === 'key_points' ? 'Extracting...' : 'Key Points & Definitions'}
              </button>
              <button
                type="button"
                disabled={Boolean(runningTask) || !selectedExcerptInfo.excerpt}
                onClick={() => runNotesAi('revision_notes')}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                {runningTask === 'revision_notes' ? 'Generating...' : 'Revision Notes'}
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runNotesAi('document_qa');
              }}
              className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
            >
              <label htmlFor="doc-qa-input" className="sr-only">
                Ask a question about the selected excerpt
              </label>
              <input
                id="doc-qa-input"
                type="text"
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                placeholder="Ask a question grounded in the selected pages..."
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={Boolean(runningTask) || !selectedExcerptInfo.excerpt || !qaQuestion.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ask</span>
              </button>
            </form>

            {selectedExcerptInfo.excerpt && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Reuse excerpt:</span>
                <button
                  type="button"
                  onClick={() => sendToFeature('quiz')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                >
                  <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Create Quiz</span>
                </button>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => sendToFeature('flashcards')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Create Flashcards</span>
                </button>
              </div>
            )}
          </div>

          {/* Output Panel */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 min-h-[260px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Study Output
              </h2>
              {aiMetadata && (
                <InferenceStatusBadge
                  executionMode={aiMetadata.executionMode}
                  metadata={aiMetadata}
                />
              )}
            </div>

            {runningTask ? (
              <div className="space-y-2.5">
                <div className="h-4 w-44 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : aiOutput ? (
              <div className="space-y-4">
                <MarkdownRenderer content={aiOutput} />
                {user && aiMetadata?.status === 'success' && !aiMetadata.isSimulated && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveSummaryToFirestore}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{saving ? 'Saving...' : 'Save Summary to Library'}</span>
                    </button>
                    {saveSuccess && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{saveSuccess}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center space-y-2">
                <FileText className="h-6 w-6 text-slate-400 mx-auto" aria-hidden="true" />
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Upload a PDF or paste notes on the left, then choose Summarize, Key Points,
                  Revision Notes, or ask a grounded question.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
