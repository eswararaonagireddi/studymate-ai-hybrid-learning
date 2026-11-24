import type {
  AIResponseMetadata,
  ExecutionModePreference,
  QuizDifficulty,
  QuizQuestionType,
  QuizSet,
} from '@/src/types/study';
import { parseQuizResponse } from './aiSchemas';
import { runHybridInference } from './hybridInference';

const QUIZ_SYSTEM_PROMPT = `You are StudyMate AI Quiz Engine.
Return ONLY valid JSON matching this exact structure (no extra prose outside JSON):
{
  "title": "Short quiz title",
  "questions": [
    {
      "id": "q_1",
      "type": "mcq" | "true_false" | "short_answer",
      "prompt": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Must match one option verbatim for mcq, 'True'/'False' for true_false, or concise text for short_answer",
      "acceptableAnswers": ["concise answer", "synonym if short_answer"],
      "explanation": "Brief academic explanation grounded in the notes"
    }
  ]
}`;

export async function generateStudyQuiz(params: {
  sourceText: string;
  subject: string;
  topic: string;
  difficulty: QuizDifficulty;
  questionCount: number;
  questionTypes: QuizQuestionType[];
  modePreference: ExecutionModePreference;
  cloudConsentGiven: boolean;
  cloudModelName?: string;
  signal?: AbortSignal;
  simulateDemoMode?: boolean;
}): Promise<{ data: QuizSet | null; metadata: AIResponseMetadata }> {
  const prompt = [
    `Subject: ${params.subject}`,
    `Topic: ${params.topic}`,
    `Difficulty: ${params.difficulty}`,
    `Number of questions: ${params.questionCount}`,
    `Allowed question types: ${params.questionTypes.join(', ')}`,
    `Generate strictly ${params.questionCount} questions grounded in the notes below. Ensure every MCQ correctAnswer matches one entry of options verbatim.`,
    `Study notes:\n${params.sourceText}`,
  ].join('\n\n');

  const simulatedPayload = JSON.stringify({
    title: `${params.topic} (Dev Demo Quiz)`,
    questions: [
      {
        id: 'q_1',
        type: 'mcq',
        prompt: `[Dev Demo] Which subject is configured for this practice quiz?`,
        options: [params.subject, 'Astronomy', 'Linguistics', 'Geology'],
        correctAnswer: params.subject,
        explanation: 'This simulated question confirms UI scoring without calling AI.',
      },
      {
        id: 'q_2',
        type: 'true_false',
        prompt: '[Dev Demo] Simulated mode does not call Firebase AI Logic models.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Simulated Dev Demo Mode only runs local placeholder logic.',
      },
    ],
  });

  const firstAttempt = await runHybridInference({
    prompt,
    systemInstruction: QUIZ_SYSTEM_PROMPT,
    modePreference: params.modePreference,
    requiresCloudConsent: true,
    cloudConsentGiven: params.cloudConsentGiven,
    cloudModelName: params.cloudModelName,
    temperature: 0.25,
    signal: params.signal,
    simulateDemoMode: params.simulateDemoMode,
    simulatedText: simulatedPayload,
  });

  if (firstAttempt.metadata.status !== 'success' || !firstAttempt.data) {
    return { data: null, metadata: firstAttempt.metadata };
  }

  const parsedFirst = parseQuizResponse(firstAttempt.data, {
    subject: params.subject,
    topic: params.topic,
    difficulty: params.difficulty,
  });

  if (parsedFirst.ok) {
    return { data: parsedFirst.quiz, metadata: firstAttempt.metadata };
  }

  // Bounded 1-time JSON repair attempt
  const repairPrompt = [
    `Your previous output failed JSON validation with error: ${parsedFirst.error}`,
    `Return ONLY valid JSON matching the quiz schema with ${params.questionCount} questions.`,
    `Previous output:\n${firstAttempt.data.slice(0, 3500)}`,
  ].join('\n\n');

  const repairAttempt = await runHybridInference({
    prompt: repairPrompt,
    systemInstruction: QUIZ_SYSTEM_PROMPT,
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
        errorMessage: `Quiz output could not be validated (${parsedFirst.error}).`,
      },
    };
  }

  const parsedRepair = parseQuizResponse(repairAttempt.data, {
    subject: params.subject,
    topic: params.topic,
    difficulty: params.difficulty,
  });

  if (!parsedRepair.ok) {
    return {
      data: null,
      metadata: {
        ...repairAttempt.metadata,
        executionMode: 'failed',
        status: 'error',
        errorMessage: `Generated quiz did not match schema: ${parsedRepair.error}`,
      },
    };
  }

  return { data: parsedRepair.quiz, metadata: repairAttempt.metadata };
}
