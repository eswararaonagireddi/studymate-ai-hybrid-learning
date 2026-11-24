import type { ExecutionModePreference } from '@/src/types/study';
import { runHybridInference, type HybridInferenceResult } from './hybridInference';

export type NotesTaskType = 'summary' | 'key_points' | 'revision_notes' | 'document_qa';

const NOTES_SYSTEM_PROMPT = `You are StudyMate AI, an academic study assistant.
Base your response strictly on the provided student notes excerpt. Do not invent facts or cite pages not present in the excerpt.
If the excerpt does not contain enough information to answer a question, clearly state what is missing.`;

export async function processStudyNotes(params: {
  task: NotesTaskType;
  documentTitle: string;
  subject: string;
  excerpt: string;
  question?: string;
  pageNumbers: number[];
  modePreference: ExecutionModePreference;
  cloudConsentGiven: boolean;
  cloudModelName?: string;
  signal?: AbortSignal;
  simulateDemoMode?: boolean;
}): Promise<HybridInferenceResult> {
  const pageInfo =
    params.pageNumbers.length > 0 ? `Selected pages: ${params.pageNumbers.join(', ')}` : 'Pasted text';

  let instruction = '';
  switch (params.task) {
    case 'summary':
      instruction = 'Write a clear, structured summary of the key ideas in these study notes.';
      break;
    case 'key_points':
      instruction =
        'Extract the core concepts, formulas/principles, and key definitions as clean bullet points.';
      break;
    case 'revision_notes':
      instruction =
        'Create compact exam-ready revision notes organized by theme, highlighting pitfalls and must-know terms.';
      break;
    case 'document_qa':
      instruction = `Answer the student's question grounded strictly in the excerpt below.\nQuestion: ${params.question ?? ''}`;
      break;
  }

  const prompt = [
    `Document: ${params.documentTitle}`,
    `Subject: ${params.subject}`,
    pageInfo,
    instruction,
    `Study excerpt:\n${params.excerpt}`,
  ].join('\n\n');

  return runHybridInference({
    prompt,
    systemInstruction: NOTES_SYSTEM_PROMPT,
    modePreference: params.modePreference,
    requiresCloudConsent: true,
    cloudConsentGiven: params.cloudConsentGiven,
    cloudModelName: params.cloudModelName,
    signal: params.signal,
    simulateDemoMode: params.simulateDemoMode,
    simulatedText: `### Simulated ${params.task.replace('_', ' ')} for ${params.documentTitle}\n\n- Demo summary generated locally without calling Gemini.\n- Excerpt length: ${params.excerpt.length} characters.`,
  });
}
