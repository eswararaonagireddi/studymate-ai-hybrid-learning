import { describe, expect, it } from 'vitest';
import {
  parseFlashcardsResponse,
  parseQuizResponse,
  scoreQuizAttempt,
} from '@/src/services/ai/aiSchemas';

describe('Quiz schema validation and client-side scoring', () => {
  it('parses fenced JSON containing MCQ, True/False, and Short Answer questions', () => {
    const raw = `\`\`\`json
    {
      "title": "Algorithms Check",
      "questions": [
        {
          "type": "mcq",
          "prompt": "What is the worst-case time complexity of binary search?",
          "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
          "correctAnswer": "O(log n)",
          "explanation": "Binary search halves the search space each step."
        },
        {
          "type": "true_false",
          "prompt": "Merge sort requires O(n) auxiliary space in standard array implementations.",
          "options": ["True", "False"],
          "correctAnswer": "True",
          "explanation": "Merging subarrays uses a temporary buffer."
        },
        {
          "type": "short_answer",
          "prompt": "Which data structure operates in FIFO order?",
          "correctAnswer": "Queue",
          "acceptableAnswers": ["Queue", "FIFO queue"],
          "explanation": "First-in, first-out is the defining property of a queue."
        }
      ]
    }
    \`\`\``;

    const parsed = parseQuizResponse(raw, {
      subject: 'Computer Science',
      topic: 'Searching & Sorting',
      difficulty: 'intermediate',
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.quiz.questions).toHaveLength(3);

    const evaluation = scoreQuizAttempt(parsed.quiz.questions, {
      q_1: 'O(log n)',
      q_2: 'False',
      q_3: 'a fifo queue',
    });

    expect(evaluation.totalQuestions).toBe(3);
    expect(evaluation.correctCount).toBe(2);
    expect(evaluation.scorePercent).toBe(66.7);
  });

  it('rejects malformed quiz JSON and ambiguous MCQ options without matching correctAnswer', () => {
    const malformed = parseQuizResponse('not json at all', {
      subject: 'Math',
      topic: 'Calculus',
      difficulty: 'beginner',
    });
    expect(malformed.ok).toBe(false);

    const ambiguous = parseQuizResponse(
      JSON.stringify({
        questions: [
          {
            type: 'mcq',
            prompt: 'Bad question',
            options: ['Alpha', 'Beta'],
            correctAnswer: 'Gamma',
          },
        ],
      }),
      { subject: 'Math', topic: 'Calculus', difficulty: 'beginner' },
    );
    expect(ambiguous.ok).toBe(false);
  });
});

describe('Flashcard schema parsing', () => {
  it('parses valid flashcard payloads and strips invalid entries', () => {
    const raw = JSON.stringify({
      cards: [
        {
          term: 'ATP Synthase',
          definition: 'Enzyme that synthesizes ATP using a proton gradient.',
          example: 'Inner mitochondrial membrane',
          sourceReference: 'Page 4',
        },
        {
          term: '',
          definition: 'Invalid empty term',
        },
      ],
    });

    const parsed = parseFlashcardsResponse(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].term).toBe('ATP Synthase');
    expect(parsed.cards[0].sourceReference).toBe('Page 4');
  });

  it('returns ok: false on malformed flashcard output', () => {
    const parsed = parseFlashcardsResponse('{"cards": []}');
    expect(parsed.ok).toBe(false);
  });
});
