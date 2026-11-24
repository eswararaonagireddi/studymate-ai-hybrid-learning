import { useState } from 'react';
import { AlertCircle, Cloud, Cpu, FlaskConical, Info } from 'lucide-react';
import type { ActualExecutionMode, AIResponseMetadata } from '@/src/types/study';

interface InferenceStatusBadgeProps {
  executionMode: ActualExecutionMode;
  metadata?: AIResponseMetadata;
  compact?: boolean;
}

export function InferenceStatusBadge({
  executionMode,
  metadata,
  compact = false,
}: InferenceStatusBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const isSimulated = Boolean(metadata?.isSimulated);
  const showFallbackDetails =
    !compact &&
    Boolean(
      metadata?.fallbackOccurred && (metadata?.fallbackReason || metadata?.modelId),
    );

  let label = 'Request failed';
  let toneClass =
    'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-900';
  let Icon = AlertCircle;

  if (isSimulated) {
    label = 'Simulated (Dev Demo)';
    toneClass =
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900';
    Icon = FlaskConical;
  } else if (executionMode === 'on_device') {
    label = 'Local AI';
    toneClass =
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-900';
    Icon = Cpu;
  } else if (executionMode === 'in_cloud') {
    label = 'Cloud AI';
    toneClass =
      'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-900';
    Icon = Cloud;
  } else if (executionMode === 'unavailable') {
    label = 'Local unavailable';
    toneClass =
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900';
    Icon = AlertCircle;
  }

  return (
    <div className="inline-flex flex-col items-end gap-1.5">
      <div className="inline-flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${toneClass}`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>

        {!compact && metadata?.modelId && !isSimulated && (
          <span className="hidden sm:inline text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {metadata.modelId}
          </span>
        )}

        {showFallbackDetails && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
          >
            <Info className="h-3 w-3" aria-hidden="true" />
            <span>Fallback details</span>
          </button>
        )}
      </div>

      {expanded && showFallbackDetails && metadata && (
        <div className="max-w-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 text-left space-y-1">
          {metadata.fallbackReason && <p>{metadata.fallbackReason}</p>}
          <p className="text-slate-500 dark:text-slate-400 tabular-nums">
            Requested: {metadata.requestedMode} · Model: {metadata.modelId || 'cloud'} ·{' '}
            {metadata.latencyMs}ms
          </p>
        </div>
      )}
    </div>
  );
}
