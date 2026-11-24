import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIError, AIErrorCode, InferenceSource } from 'firebase/ai';
import {
  classifySdkError,
  evaluateRoutingDecision,
  runHybridInference,
} from '@/src/services/ai/hybridInference';
import { validateQuestionCount, validateStudyPrompt } from '@/src/utils/validation';

const mockGenerateContent = vi.fn();

vi.mock('firebase/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/ai')>();
  return {
    ...actual,
    getGenerativeModel: vi.fn(() => ({
      generateContent: mockGenerateContent,
      initializeDeviceModel: vi.fn(),
    })),
  };
});

vi.mock('@/src/services/firebase/firebaseClient', () => ({
  firebaseServices: {
    ai: { mockAi: true },
    isConfigured: true,
    cloudModelName: 'gemini-2.5-flash',
    isDemoModeEnabled: false,
  },
}));

describe('Inference routing decisions (mocked SDK)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as Record<string, unknown>).LanguageModel;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).LanguageModel;
  });

  it('blocks ONLY_ON_DEVICE when Chrome LanguageModel API is unavailable', async () => {
    const decision = evaluateRoutingDecision({
      modePreference: 'only_on_device',
      deviceAvailability: 'unsupported_browser',
      hasLanguageModelApi: false,
      isOnline: true,
      firebaseConfigured: true,
      requiresCloudConsent: true,
      cloudConsentGiven: true,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.blockStatus).toBe('local_unavailable');

    const result = await runHybridInference({
      prompt: 'Explain recursion',
      systemInstruction: 'Be helpful',
      modePreference: 'only_on_device',
      cloudConsentGiven: true,
    });

    expect(result.data).toBeNull();
    expect(result.metadata.status).toBe('local_unavailable');
    expect(result.metadata.executionMode).toBe('unavailable');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('requires informed consent before cloud fallback when local model is unavailable', () => {
    const decision = evaluateRoutingDecision({
      modePreference: 'prefer_on_device',
      deviceAvailability: 'unavailable',
      hasLanguageModelApi: false,
      isOnline: true,
      firebaseConfigured: true,
      requiresCloudConsent: true,
      cloudConsentGiven: false,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.blockStatus).toBe('consent_required');
  });

  it('reports Cloud AI and fallbackReason when PREFER_ON_DEVICE falls back to cloud', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'Cloud explanation of Big-O notation.',
        inferenceSource: InferenceSource.IN_CLOUD,
      },
    });

    const result = await runHybridInference({
      prompt: 'Explain Big-O notation',
      systemInstruction: 'Be helpful',
      modePreference: 'prefer_on_device',
      requiresCloudConsent: true,
      cloudConsentGiven: true,
    });

    expect(result.data).toBe('Cloud explanation of Big-O notation.');
    expect(result.metadata.status).toBe('success');
    expect(result.metadata.executionMode).toBe('in_cloud');
    expect(result.metadata.fallbackOccurred).toBe(true);
    expect(result.metadata.fallbackReason).toContain('LanguageModel');
  });

  it('reports Local AI only when SDK returns InferenceSource.ON_DEVICE', async () => {
    (globalThis as Record<string, unknown>).LanguageModel = {
      availability: vi.fn().mockResolvedValue('available'),
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'On-device explanation of eigenvalues.',
        inferenceSource: InferenceSource.ON_DEVICE,
      },
    });

    const result = await runHybridInference({
      prompt: 'Explain eigenvalues',
      systemInstruction: 'Be helpful',
      modePreference: 'prefer_on_device',
      requiresCloudConsent: true,
      cloudConsentGiven: false,
    });

    expect(result.data).toBe('On-device explanation of eigenvalues.');
    expect(result.metadata.executionMode).toBe('on_device');
    expect(result.metadata.fallbackOccurred).toBe(false);
    expect(result.metadata.modelId).toContain('gemini-nano');
  });

  it('handles cloud quota exhaustion and API_NOT_ENABLED errors gracefully', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED quota exceeded'));

    const quotaRes = await runHybridInference({
      prompt: 'Explain entropy',
      systemInstruction: 'Be helpful',
      modePreference: 'only_in_cloud',
      cloudConsentGiven: true,
    });

    expect(quotaRes.data).toBeNull();
    expect(quotaRes.metadata.executionMode).toBe('failed');
    expect(quotaRes.metadata.errorMessage?.toLowerCase()).toContain('quota');

    const apiNotEnabledErr = new AIError(
      AIErrorCode.API_NOT_ENABLED,
      'Firebase AI Logic API disabled',
    );
    const classified = classifySdkError(apiNotEnabledErr);
    expect(classified.status).toBe('error');
    expect(classified.message).toContain('Firebase AI Logic API');
    expect(classified.retryable).toBe(false);
  });

  it('handles request cancellation without retrying', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
    mockGenerateContent.mockRejectedValueOnce(abortErr);

    const res = await runHybridInference({
      prompt: 'Explain mitosis',
      systemInstruction: 'Be helpful',
      modePreference: 'only_in_cloud',
      cloudConsentGiven: true,
    });

    expect(res.metadata.status).toBe('cancelled');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});

describe('Input validation helpers', () => {
  it('rejects empty or oversized study prompts', () => {
    expect(validateStudyPrompt('   ').valid).toBe(false);
    expect(validateStudyPrompt('a'.repeat(200), 100).valid).toBe(false);
    expect(validateStudyPrompt('Valid study text', 100).valid).toBe(true);
  });

  it('clamps quiz question count within valid bounds', () => {
    expect(validateQuestionCount(0, 1, 15)).toBe(1);
    expect(validateQuestionCount(50, 1, 15)).toBe(15);
    expect(validateQuestionCount(Number.NaN, 1, 15)).toBe(5);
  });
});
