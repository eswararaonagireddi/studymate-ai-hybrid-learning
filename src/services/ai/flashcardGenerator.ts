import type {
  AIResponseMetadata,
  ExecutionModePreference,
  FlashcardItem,
} from '@/src/types/study';
import { parseFlashcardsResponse } from './aiSchemas';
import { runHybridInference } from './hybridInference';

const FLASHCARD_SYSTEM_PROMPT = `You are StudyMate AI Flashcard Builder.
Return ONLY valid JSON matching this exact structure (no extra prose outside JSON):
{
  "cards": [
    {
      "id": "fc_1",
      "term": "Concise concept, term, or prompt",
      "definition": "Accurate, clear answer or explanation",
      "example": "Optional short example or application",
      "topic": "Short topic label",
      "sourceReference": "Optional page or section reference from the notes"
    }
  ]
}`;

export async function generateStudyFlashcards(params: {
  sourceText: string;
  subject: string;
  topic: string;
  cardCount: number;
  modePreference: ExecutionModePreference;
  cloudConsentGiven: boolean;
  cloudModelName?: string;
  signal?: AbortSignal;
  simulateDemoMode?: boolean;
}): Promise<{ data: FlashcardItem[] | null; metadata: AIResponseMetadata }> {
  const prompt = [
    `Subject: ${params.subject}`,
    `Topic: ${params.topic}`,
    `Number of flashcards: ${params.cardCount}`,
    `Create ${params.cardCount} active-recall flashcards grounded strictly in these study notes:`,
    params.sourceText,
  ].join('\n\n');

  const simulatedPayload = JSON.stringify({
    cards: [
      {
        id: 'fc_1',
        term: `[Dev Demo] ${params.topic}`,
        definition: 'Simulated flashcard created in Dev Demo Mode without AI inference.',
        example: 'Switch off Dev Demo Mode in Settings for real hybrid inference.',
        topic: params.subject,
      },
      {
        id: 'fc_2',
        term: '[Dev Demo] Hybrid Inference',
        definition: 'Routes supported tasks to Chrome Gemini Nano and falls back to Firebase AI Logic cloud models.',
        topic: params.subject,
      },
    ],
  });

  const firstAttempt = await runHybridInference({
    prompt,
    systemInstruction: FLASHCARD_SYSTEM_PROMPT,
    modePreference: params.modePreference,
    requiresCloudConsent: true,
    cloudConsentGiven: params.cloudConsentGiven,
    cloudModelName: params.cloudModelName,
    temperature: 0.3,
    signal: params.signal,
    simulateDemoMode: params.simulateDemoMode,
    simulatedText: simulatedPayload,
  });

  if (firstAttempt.metadata.status !== 'success' || !firstAttempt.data) {
    return { data: null, metadata: firstAttempt.metadata };
  }

  const parsedFirst = parseFlashcardsResponse(firstAttempt.data);
  if (parsedFirst.ok) {
    return { data: parsedFirst.cards, metadata: firstAttempt.metadata };
  }

  const repairAttempt = await runHybridInference({
    prompt: `Previous output failed JSON validation (${parsedFirst.error}). Return ONLY valid JSON with a "cards" array containing "term" and "definition".\n\n${firstAttempt.data.slice(0, 3500)}`,
    systemInstruction: FLASHCARD_SYSTEM_PROMPT,
    modePreference: params.modePreference,
    requiresCloudConsent: true,
    cloudConsentGiven: params.cloudConsentGiven,
    cloudModelName: params.cloudModelName,
    temperature: 0.1,
    signal: params.signal,
    simulateDemoMode: false,
  });

  if (repairAttempt.metadata.status !== 'success' || !repairAttempt.data) {
    return {
      data: null,
      metadata: {
        ...repairAttempt.metadata,
        executionMode: 'failed',
        status: 'error',
        errorMessage: `Flashcards could not be validated (${parsedFirst.error}).`,
      },
    };
  }

  const parsedRepair = parseFlashcardsResponse(repairAttempt.data);
  if (!parsedRepair.ok) {
    return {
      data: null,
      metadata: {
        ...repairAttempt.metadata,
        executionMode: 'failed',
        status: 'error',
        errorMessage: `Generated flashcards failed validation: ${parsedRepair.error}`,
      },
    };
  }

  return { data: parsedRepair.cards, metadata: repairAttempt.metadata };
}
