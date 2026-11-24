import type {
  DeviceModelAvailability,
  ExecutionModePreference,
  InferenceCapabilityState,
} from '@/src/types/study';
import { firebaseServices } from '@/src/services/firebase/firebaseClient';

interface ChromeLanguageModelGlobal {
  availability?: (options?: Record<string, unknown>) => Promise<string>;
}

export function detectBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Node / Test Environment';
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) {
    const match = ua.match(/Chrome\/(\d+)/);
    const ver = match?.[1] ? ` v${match[1]}` : '';
    return `Google Chrome${ver}`;
  }
  if (/Firefox\//.test(ua)) return 'Mozilla Firefox';
  if (/Safari\//.test(ua)) return 'Apple Safari';
  return 'Web Browser';
}

export function getChromeLanguageModelApi(): ChromeLanguageModelGlobal | null {
  const candidate = (globalThis as Record<string, unknown>).LanguageModel as
    | ChromeLanguageModelGlobal
    | undefined;
  if (candidate && typeof candidate.availability === 'function') {
    return candidate;
  }
  return null;
}

export async function checkDeviceModelAvailability(): Promise<{
  hasLanguageModelApi: boolean;
  availability: DeviceModelAvailability;
  rawStatus?: string;
}> {
  const api = getChromeLanguageModelApi();
  if (!api || !api.availability) {
    return {
      hasLanguageModelApi: false,
      availability: 'unsupported_browser',
    };
  }

  try {
    const status = await api.availability();
    if (status === 'available' || status === 'readily') {
      return { hasLanguageModelApi: true, availability: 'available', rawStatus: status };
    }
    if (status === 'downloadable' || status === 'after-download') {
      return { hasLanguageModelApi: true, availability: 'downloadable', rawStatus: status };
    }
    if (status === 'downloading') {
      return { hasLanguageModelApi: true, availability: 'downloading', rawStatus: status };
    }
    return { hasLanguageModelApi: true, availability: 'unavailable', rawStatus: status };
  } catch {
    return {
      hasLanguageModelApi: true,
      availability: 'unavailable',
    };
  }
}

export async function inspectHybridCapabilities(
  cloudModelOverride?: string,
): Promise<InferenceCapabilityState> {
  const browserName = detectBrowserName();
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const deviceCheck = await checkDeviceModelAvailability();
  const cloudModel = cloudModelOverride || firebaseServices.cloudModelName;

  let details = '';
  if (deviceCheck.availability === 'available') {
    details =
      'Chrome Prompt API (Gemini Nano) is ready on this device. Supported prompts execute locally without leaving your browser.';
  } else if (deviceCheck.availability === 'downloadable') {
    details =
      'Chrome Prompt API is detected and Gemini Nano is downloadable. Click "Prepare Local Gemini Nano Model" to initialize on-device inference.';
  } else if (deviceCheck.availability === 'downloading') {
    details =
      'Gemini Nano weights are currently downloading in Chrome. Cloud fallback remains available in the meantime.';
  } else if (!deviceCheck.hasLanguageModelApi) {
    details =
      'This browser does not expose the Chrome Prompt API (LanguageModel). Local Gemini Nano requires Desktop Chrome 139+ with Prompt API enabled; requests use Firebase AI Logic cloud fallback when permitted.';
  } else {
    details =
      'Chrome Prompt API is present, but the on-device Gemini Nano model is currently unavailable on this device/hardware. Firebase AI Logic cloud fallback will be used when permitted.';
  }

  return {
    browserName,
    hasLanguageModelApi: deviceCheck.hasLanguageModelApi,
    deviceAvailability: deviceCheck.availability,
    isOnline,
    firebaseConfigured: firebaseServices.isConfigured,
    appCheckConfigured: firebaseServices.appCheckConfigured,
    cloudModel,
    details,
  };
}

export function formatModePreferenceLabel(mode: ExecutionModePreference): string {
  switch (mode) {
    case 'prefer_on_device':
      return 'Prefer Local AI';
    case 'only_on_device':
      return 'Local AI Only';
    case 'prefer_in_cloud':
      return 'Prefer Cloud AI';
    case 'only_in_cloud':
      return 'Cloud AI Only';
  }
}
