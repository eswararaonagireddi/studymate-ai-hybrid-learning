import type {
  FlashcardItem,
  QuizDifficulty,
  QuizEvaluation,
  QuizQuestion,
  QuizQuestionType,
  QuizSet,
} from '@/src/types/study';

function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function normalizeAnswerText(val: string): string {
  return val
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(a|an|the)\s+/i, '');
}

function normalizeQuestionType(rawType: unknown): QuizQuestionType | null {
  if (rawType === 'mcq' || rawType === 'true_false' || rawType === 'short_answer') {
    return rawType;
  }
  if (typeof rawType === 'string') {
    const lower = rawType.toLowerCase().trim();
    if (lower === 'multiple_choice' || lower === 'multiple-choice') return 'mcq';
    if (lower === 'true-false' || lower === 'boolean') return 'true_false';
    if (lower === 'short-answer' || lower === 'short') return 'short_answer';
  }
  return null;
}

export function parseQuizResponse(
  raw: string,
  meta: { subject: string; topic: string; difficulty: QuizDifficulty },
): { ok: true; quiz: QuizSet } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonString(raw));
  } catch {
    return { ok: false, error: 'Model output was not valid JSON.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Quiz response must be a JSON object.' };
  }

  const obj = parsed as Record<string, unknown>;
  const rawQuestions = Array.isArray(obj.questions) ? obj.questions : null;
  if (!rawQuestions || rawQuestions.length === 0) {
    return { ok: false, error: 'Quiz JSON did not include any questions.' };
  }

  const questions: QuizQuestion[] = [];

  for (let idx = 0; idx < rawQuestions.length; idx++) {
    const item = rawQuestions[idx];
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `Question ${idx + 1} is malformed.` };
    }
    const q = item as Record<string, unknown>;
    const type = normalizeQuestionType(q.type);
    const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : '';
    const correctAnswer = typeof q.correctAnswer === 'string' ? q.correctAnswer.trim() : '';
    const explanation =
      typeof q.explanation === 'string' && q.explanation.trim()
        ? q.explanation.trim()
        : `Correct answer: ${correctAnswer}`;

    if (!type || !prompt || !correctAnswer) {
      return { ok: false, error: `Question ${idx + 1} is missing required fields.` };
    }

    const id =
      typeof q.id === 'string' && q.id.trim() ? q.id.trim() : `q_${questions.length + 1}`;

    if (type === 'mcq') {
      const options = Array.isArray(q.options)
        ? q.options.map((o) => String(o).trim()).filter(Boolean)
        : [];
      if (options.length < 2) {
        return { ok: false, error: `MCQ question ${idx + 1} has fewer than 2 options.` };
      }
      const matchedOption = options.find(
        (opt) => opt.toLowerCase() === correctAnswer.toLowerCase(),
      );
      if (!matchedOption) {
        return {
          ok: false,
          error: `MCQ question ${idx + 1} correctAnswer does not match any option.`,
        };
      }
      questions.push({
        id,
        type,
        prompt,
        options,
        correctAnswer: matchedOption,
        explanation,
      });
    } else if (type === 'true_false') {
      const normalized = correctAnswer.toLowerCase() === 'true' ? 'True' : 'False';
      if (correctAnswer.toLowerCase() !== 'true' && correctAnswer.toLowerCase() !== 'false') {
        return {
          ok: false,
          error: `True/False question ${idx + 1} must have "True" or "False" as correctAnswer.`,
        };
      }
      questions.push({
        id,
        type,
        prompt,
        options: ['True', 'False'],
        correctAnswer: normalized,
        explanation,
      });
    } else {
      const acceptableAnswers = Array.isArray(q.acceptableAnswers)
        ? q.acceptableAnswers.map((a) => String(a).trim()).filter(Boolean)
        : [correctAnswer];
      if (!acceptableAnswers.some((a) => a.toLowerCase() === correctAnswer.toLowerCase())) {
        acceptableAnswers.unshift(correctAnswer);
      }
      questions.push({
        id,
        type,
        prompt,
        correctAnswer,
        acceptableAnswers,
        explanation,
      });
    }
  }

  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : `${meta.topic} Quiz`;

  return {
    ok: true,
    quiz: {
      title,
      subject: meta.subject,
      topic: meta.topic,
      difficulty: meta.difficulty,
      questions,
    },
  };
}

export function scoreQuizAttempt(
  questions: QuizQuestion[],
  answers: Record<string, string>,
): QuizEvaluation {
  const results = questions.map((q) => {
    const userAnswer = (answers[q.id] ?? '').trim();
    let isCorrect = false;

    if (q.type === 'short_answer') {
      const normalizedUser = normalizeAnswerText(userAnswer);
      const candidates = [q.correctAnswer, ...(q.acceptableAnswers ?? [])];
      isCorrect =
        normalizedUser.length > 0 &&
        candidates.some((cand) => normalizeAnswerText(cand) === normalizedUser);
    } else {
      isCorrect =
        userAnswer.length > 0 &&
        userAnswer.toLowerCase() === q.correctAnswer.trim().toLowerCase();
    }

    return {
      questionId: q.id,
      userAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const totalQuestions = questions.length;
  const correctCount = results.filter((r) => r.isCorrect).length;
  const scorePercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0;

  return {
    totalQuestions,
    correctCount,
    scorePercent,
    results,
  };
}

export function parseFlashcardsResponse(
  raw: string,
): { ok: true; cards: FlashcardItem[] } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonString(raw));
  } catch {
    return { ok: false, error: 'Flashcard response was not valid JSON.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Flashcard payload must be a JSON object.' };
  }

  const rawCards = (parsed as Record<string, unknown>).cards;
  if (!Array.isArray(rawCards)) {
    return { ok: false, error: 'Flashcard JSON is missing a cards array.' };
  }

  const cards: FlashcardItem[] = [];
  for (let i = 0; i < rawCards.length; i++) {
    const entry = rawCards[i];
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const term = typeof rec.term === 'string' ? rec.term.trim() : '';
    const definition = typeof rec.definition === 'string' ? rec.definition.trim() : '';
    if (!term || !definition) continue;

    cards.push({
      id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `fc_${cards.length + 1}`,
      term,
      definition,
      example: typeof rec.example === 'string' && rec.example.trim() ? rec.example.trim() : undefined,
      topic: typeof rec.topic === 'string' && rec.topic.trim() ? rec.topic.trim() : undefined,
      sourceReference:
        typeof rec.sourceReference === 'string' && rec.sourceReference.trim()
          ? rec.sourceReference.trim()
          : undefined,
    });
  }

  if (cards.length === 0) {
    return { ok: false, error: 'No valid flashcards were returned by the model.' };
  }

  return { ok: true, cards };
}
