import type {
  AssistantMessage,
  ExecutionModePreference,
  ExplanationStyle,
} from '@/src/types/study';
import { runHybridInference, type HybridInferenceResult } from './hybridInference';

export const STUDYMATE_SYSTEM_PROMPT = `You are StudyMate AI, a supportive and accurate college-level academic tutor.
Explain concepts clearly, organize answers with helpful headings or concise bullet points, and adapt to the student's chosen subject and explanation style.
Never fabricate facts, quotes, or citations; if information is missing or uncertain, state that clearly.`;

const STYLE_INSTRUCTIONS: Record<ExplanationStyle, string> = {
  clear: 'Give a clear, well-structured college-level explanation with intuition and key takeaways.',
  simple: 'Explain in plain, jargon-free English using everyday analogies while staying accurate.',
  exam: 'Focus on high-yield exam points, definitions, common pitfalls, and concise memory hooks.',
  worked_example: 'Teach primarily through a step-by-step worked example with clear reasoning.',
  revision: 'Provide a compact, high-density revision summary suitable for quick pre-exam review.',
};

export async function askStudyAssistant(params: {
  question: string;
  subject: string;
  style: ExplanationStyle;
  history: AssistantMessage[];
  modePreference: ExecutionModePreference;
  cloudConsentGiven: boolean;
  cloudModelName?: string;
  signal?: AbortSignal;
  simulateDemoMode?: boolean;
}): Promise<HybridInferenceResult> {
  const recentHistory = params.history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'Student' : 'StudyMate AI'}: ${m.content.slice(0, 600)}`)
    .join('\n\n');

  const prompt = [
    `Subject: ${params.subject}`,
    `Requested style: ${STYLE_INSTRUCTIONS[params.style]}`,
    recentHistory ? `Recent context:\n${recentHistory}` : '',
    `Student question:\n${params.question}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return runHybridInference({
    prompt,
    systemInstruction: STUDYMATE_SYSTEM_PROMPT,
    modePreference: params.modePreference,
    requiresCloudConsent: true,
    cloudConsentGiven: params.cloudConsentGiven,
    cloudModelName: params.cloudModelName,
    signal: params.signal,
    simulateDemoMode: params.simulateDemoMode,
    simulatedText: `### ${params.subject} (${params.style.replace('_', ' ')})\n\nThis is a **simulated dev demo response** for: "${params.question.slice(0, 120)}". Turn off Dev Demo Mode in Settings to run real Firebase AI Logic inference.`,
  });
}

export async function transformAssistantAnswer(params: {
  originalQuestion: string;
  previousAnswer: string;
  subject: string;
  targetStyle: ExplanationStyle;
  modePreference: ExecutionModePreference;
  cloudConsentGiven: boolean;
  cloudModelName?: string;
  signal?: AbortSignal;
  simulateDemoMode?: boolean;
}): Promise<HybridInferenceResult> {
  const prompt = [
    `Subject: ${params.subject}`,
    `Original question: ${params.originalQuestion}`,
    `Previous explanation:\n${params.previousAnswer.slice(0, 1800)}`,
    `Task: Rewrite this explanation using the following style: ${STYLE_INSTRUCTIONS[params.targetStyle]}`,
  ].join('\n\n');

  return runHybridInference({
    prompt,
    systemInstruction: STUDYMATE_SYSTEM_PROMPT,
    modePreference: params.modePreference,
    requiresCloudConsent: true,
    cloudConsentGiven: params.cloudConsentGiven,
    cloudModelName: params.cloudModelName,
    signal: params.signal,
    simulateDemoMode: params.simulateDemoMode,
    simulatedText: `### Transformed (${params.targetStyle.replace('_', ' ')})\n\nSimulated follow-up rewrite for **${params.subject}**.`,
  });
}
