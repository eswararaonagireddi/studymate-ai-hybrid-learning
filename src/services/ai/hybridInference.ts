import {
  AIError,
  AIErrorCode,
  getGenerativeModel,
  InferenceMode,
  InferenceSource,
  type HybridParams,
} from 'firebase/ai';
import type {
  AIExecutionStatus,
  AIResponseMetadata,
  DeviceModelAvailability,
  ExecutionModePreference,
} from '@/src/types/study';
import { firebaseServices } from '@/src/services/firebase/firebaseClient';
import { checkDeviceModelAvailability } from './inferenceStatus';

export interface RoutingEvaluationInput {
  modePreference: ExecutionModePreference;
  deviceAvailability: DeviceModelAvailability;
  hasLanguageModelApi: boolean;
  isOnline: boolean;
  firebaseConfigured: boolean;
  requiresCloudConsent?: boolean;
  cloudConsentGiven?: boolean;
}

export interface RoutingDecision {
  allowed: boolean;
  blockStatus?: AIExecutionStatus;
  reason?: string;
  willFallbackToCloud: boolean;
}

export function evaluateRoutingDecision(input: RoutingEvaluationInput): RoutingDecision {
  const localReady = input.hasLanguageModelApi && input.deviceAvailability === 'available';

  if (input.modePreference === 'only_on_device') {
    if (!localReady) {
      return {
        allowed: false,
        blockStatus: 'local_unavailable',
        reason: input.hasLanguageModelApi
          ? `On-device Gemini Nano status is "${input.deviceAvailability}". Cloud fallback is disabled by your "Local AI Only" setting.`
          : 'Chrome Prompt API (LanguageModel) is unavailable in this browser. Cloud fallback is disabled by your "Local AI Only" setting.',
        willFallbackToCloud: false,
      };
    }
    return { allowed: true, willFallbackToCloud: false };
  }

  if (!input.firebaseConfigured && !localReady) {
    return {
      allowed: false,
      blockStatus: 'error',
      reason: 'Firebase is not configured and local Gemini Nano is unavailable.',
      willFallbackToCloud: false,
    };
  }

  const needsCloudImmediately =
    input.modePreference === 'only_in_cloud' ||
    input.modePreference === 'prefer_in_cloud' ||
    (input.modePreference === 'prefer_on_device' && !localReady);

  if (needsCloudImmediately) {
    if (!input.isOnline) {
      return {
        allowed: false,
        blockStatus: 'offline',
        reason: 'You are currently offline and local Gemini Nano is not available for this request.',
        willFallbackToCloud: true,
      };
    }

    if (input.requiresCloudConsent && !input.cloudConsentGiven) {
      return {
        allowed: false,
        blockStatus: 'consent_required',
        reason: !localReady
          ? 'Local on-device inference is unavailable in this browser. Allow sending this study excerpt to Firebase AI Logic cloud models?'
          : 'Confirm sending this request to Firebase AI Logic cloud models?',
        willFallbackToCloud: true,
      };
    }
  }

  return {
    allowed: true,
    willFallbackToCloud: input.modePreference === 'prefer_on_device' && !localReady,
    reason:
      input.modePreference === 'prefer_on_device' && !localReady
        ? input.hasLanguageModelApi
          ? `On-device Gemini Nano status is "${input.deviceAvailability}"; routed to Firebase AI Logic cloud model.`
          : 'Browser does not expose Chrome Prompt API (LanguageModel); routed to Firebase AI Logic cloud model.'
        : undefined,
  };
}

export function classifySdkError(error: unknown): {
  status: AIExecutionStatus;
  message: string;
  retryable: boolean;
} {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { status: 'cancelled', message: 'Request cancelled by user.', retryable: false };
  }
  const errName =
    error && typeof error === 'object' && 'name' in error ? String((error as { name: unknown }).name) : '';
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (errName === 'AbortError' || rawMessage.toLowerCase().includes('aborted')) {
    return { status: 'cancelled', message: 'Request cancelled by user.', retryable: false };
  }

  if (error instanceof AIError) {
    if (error.code === AIErrorCode.API_NOT_ENABLED) {
      return {
        status: 'error',
        message:
          'Firebase AI Logic API is not enabled in this Firebase project. Enable Firebase AI Logic in the Firebase Console.',
        retryable: false,
      };
    }
    if (error.code === AIErrorCode.UNSUPPORTED) {
      return {
        status: 'local_unavailable',
        message: `Unsupported feature in current inference environment: ${error.message}`,
        retryable: false,
      };
    }
    if (error.code === AIErrorCode.FETCH_ERROR) {
      return {
        status: 'error',
        message: 'Network error communicating with Firebase AI Logic. Check your connection and try again.',
        retryable: true,
      };
    }
  }

  const lower = rawMessage.toLowerCase();
  if (lower.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return {
      status: 'error',
      message: 'Cloud AI quota exceeded (429 RESOURCE_EXHAUSTED). Please wait and try again later.',
      retryable: false,
    };
  }
  if (lower.includes('app check') || lower.includes('403') || lower.includes('permission')) {
    return {
      status: 'error',
      message: 'Access blocked by Firebase AI Logic or App Check configuration.',
      retryable: false,
    };
  }
  if (lower.includes('timeout')) {
    return {
      status: 'error',
      message: 'The AI request timed out before finishing.',
      retryable: true,
    };
  }

  return {
    status: 'error',
    message: rawMessage || 'An unexpected error occurred while running hybrid AI inference.',
    retryable: false,
  };
}

function mapInferenceMode(pref: ExecutionModePreference): InferenceMode {
  switch (pref) {
    case 'prefer_on_device':
      return InferenceMode.PREFER_ON_DEVICE;
    case 'only_on_device':
      return InferenceMode.ONLY_ON_DEVICE;
    case 'only_in_cloud':
      return InferenceMode.ONLY_IN_CLOUD;
    case 'prefer_in_cloud':
      return InferenceMode.PREFER_IN_CLOUD;
  }
}

export interface HybridInferenceRequest {
  prompt: string;
  systemInstruction: string;
  modePreference: ExecutionModePreference;
  requiresCloudConsent?: boolean;
  cloudConsentGiven?: boolean;
  cloudModelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  simulateDemoMode?: boolean;
  simulatedText?: string;
}

export interface HybridInferenceResult {
  data: string | null;
  metadata: AIResponseMetadata;
}

export async function runHybridInference(
  req: HybridInferenceRequest,
): Promise<HybridInferenceResult> {
  const startedAt = Date.now();
  const cloudModel = req.cloudModelName || firebaseServices.cloudModelName;

  if (req.simulateDemoMode && import.meta.env.DEV) {
    return {
      data:
        req.simulatedText ??
        '[Simulated Dev Demo Output] This response is locally simulated for UI testing and does not represent real on-device or cloud AI inference.',
      metadata: {
        executionMode: 'unavailable',
        requestedMode: req.modePreference,
        modelId: 'simulated-dev-demo',
        fallbackOccurred: false,
        fallbackReason: 'Development-only simulated demo mode active.',
        status: 'success',
        isSimulated: true,
        latencyMs: Date.now() - startedAt,
      },
    };
  }

  const deviceCheck = await checkDeviceModelAvailability();
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  const decision = evaluateRoutingDecision({
    modePreference: req.modePreference,
    deviceAvailability: deviceCheck.availability,
    hasLanguageModelApi: deviceCheck.hasLanguageModelApi,
    isOnline,
    firebaseConfigured: firebaseServices.isConfigured,
    requiresCloudConsent: req.requiresCloudConsent ?? true,
    cloudConsentGiven: req.cloudConsentGiven ?? false,
  });

  if (!decision.allowed) {
    const blockStatus = decision.blockStatus ?? 'error';
    return {
      data: null,
      metadata: {
        executionMode: blockStatus === 'local_unavailable' ? 'unavailable' : 'failed',
        requestedMode: req.modePreference,
        fallbackOccurred: false,
        fallbackReason: decision.reason,
        status: blockStatus,
        errorMessage: decision.reason,
        latencyMs: Date.now() - startedAt,
      },
    };
  }

  const ai = firebaseServices.ai;
  if (!ai) {
    return {
      data: null,
      metadata: {
        executionMode: 'failed',
        requestedMode: req.modePreference,
        fallbackOccurred: false,
        status: 'error',
        errorMessage: 'Firebase AI Logic SDK is not initialized.',
        latencyMs: Date.now() - startedAt,
      },
    };
  }

  const hybridParams: HybridParams = {
    mode: mapInferenceMode(req.modePreference),
    inCloudParams: {
      model: cloudModel,
      systemInstruction: req.systemInstruction,
      generationConfig: {
        temperature: req.temperature ?? 0.4,
        maxOutputTokens: req.maxOutputTokens ?? 2048,
      },
    },
    onDeviceParams: {
      createOptions: {
        ...(req.signal ? { signal: req.signal } : {}),
        initialPrompts: [
          {
            role: 'system',
            content: [{ type: 'text', value: req.systemInstruction }],
          },
        ],
      },
    },
  };

  const model = getGenerativeModel(ai, hybridParams);

  let attempt = 0;
  while (attempt < 2) {
    attempt += 1;
    try {
      const result = await model.generateContent(req.prompt, {
        signal: req.signal,
      });
      const text = result.response.text();
      const source = result.response.inferenceSource;

      if (source === InferenceSource.ON_DEVICE) {
        return {
          data: text,
          metadata: {
            executionMode: 'on_device',
            requestedMode: req.modePreference,
            modelId: 'gemini-nano (on-device)',
            fallbackOccurred: false,
            status: 'success',
            latencyMs: Date.now() - startedAt,
          },
        };
      }

      const fallbackOccurred =
        req.modePreference === 'prefer_on_device' || decision.willFallbackToCloud;

      return {
        data: text,
        metadata: {
          executionMode: 'in_cloud',
          requestedMode: req.modePreference,
          modelId: cloudModel,
          fallbackOccurred,
          fallbackReason: fallbackOccurred
            ? decision.reason ??
              'On-device Gemini Nano could not execute this prompt; Firebase AI Logic used cloud fallback.'
            : undefined,
          status: 'success',
          latencyMs: Date.now() - startedAt,
        },
      };
    } catch (error) {
      const classified = classifySdkError(error);
      if (classified.retryable && attempt < 2 && !req.signal?.aborted) {
        continue;
      }
      return {
        data: null,
        metadata: {
          executionMode: classified.status === 'local_unavailable' ? 'unavailable' : 'failed',
          requestedMode: req.modePreference,
          fallbackOccurred: false,
          status: classified.status,
          errorMessage: classified.message,
          latencyMs: Date.now() - startedAt,
        },
      };
    }
  }

  return {
    data: null,
    metadata: {
      executionMode: 'failed',
      requestedMode: req.modePreference,
      fallbackOccurred: false,
      status: 'error',
      errorMessage: 'Inference failed after retry.',
      latencyMs: Date.now() - startedAt,
    },
  };
}

export async function initializeLocalNanoModel(
  onProgress?: (percent: number) => void,
): Promise<{ ok: boolean; message: string }> {
  const ai = firebaseServices.ai;
  if (!ai) {
    return {
      ok: false,
      message: 'Firebase AI Logic SDK must be initialized before preparing the local model.',
    };
  }

  const deviceCheck = await checkDeviceModelAvailability();
  if (!deviceCheck.hasLanguageModelApi) {
    return {
      ok: false,
      message: 'Chrome Prompt API (LanguageModel) is not exposed in this browser.',
    };
  }

  try {
    const model = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
    });
    await model.initializeDeviceModel((progress) => {
      if (onProgress) {
        const pct = progress <= 1 ? Math.round(progress * 100) : Math.round(progress);
        onProgress(Math.max(0, Math.min(100, pct)));
      }
    });
    return {
      ok: true,
      message: 'On-device Gemini Nano model initialized and ready for local inference.',
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : 'Failed to initialize Chrome Gemini Nano on this device.',
    };
  }
}
