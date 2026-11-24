export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const LIMITS = {
  ID_MAX: 128,
  TITLE_MAX: 160,
  SUBJECT_MAX: 80,
  EXCERPT_PREVIEW_MAX: 1000,
  SUMMARY_MAX: 12000,
  KEY_POINTS_MAX: 30,
  KEY_POINT_MAX: 400,
  FALLBACK_REASON_MAX: 300,
  MODEL_ID_MAX: 120,
  PROMPT_INPUT_MAX: 4000,
  NOTE_EXCERPT_MAX: 16000,
  PAGE_COUNT_MAX: 2000,
  CHAR_COUNT_MAX: 500000,
  QUIZ_QUESTIONS_MIN: 1,
  QUIZ_QUESTIONS_MAX: 15,
  FLASHCARDS_MAX: 60,
} as const;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, LIMITS.ID_MAX);
  if (!cleaned || !ID_PATTERN.test(cleaned)) {
    throw new Error('Invalid identifier format.');
  }
  return cleaned;
}

export function createRecordId(prefix: string): string {
  const safePrefix = sanitizeId(prefix);
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return sanitizeId(`${safePrefix}_${randomPart}`);
}

export function clampText(value: string, maxLength: number, fallback = ''): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

export function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function validateStudyPrompt(
  raw: string,
  maxLength: number = LIMITS.PROMPT_INPUT_MAX,
): { valid: boolean; value: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      value: '',
      error: 'Please enter a study question or notes before continuing.',
    };
  }
  if (trimmed.length > maxLength) {
    return {
      valid: false,
      value: trimmed,
      error: `Input exceeds the ${maxLength.toLocaleString()}-character limit (${trimmed.length.toLocaleString()} entered).`,
    };
  }
  return { valid: true, value: trimmed };
}

export function validateQuestionCount(value: number, min = 1, max = 15): number {
  return clampInt(value, min, max, 5);
}
