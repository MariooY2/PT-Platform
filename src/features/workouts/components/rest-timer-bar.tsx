'use client';

import { Minus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function mmss(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * The rest countdown. An IN-FLOW flex item at the bottom of the player (never `sticky bottom-0`), so
 * it never paints over a mid-scroll set row — the WCAG target-size trap the bottom nav avoided (D-028).
 * −15 / +15 adjust the end time; Skip dismisses. "Rest done" shows at zero.
 */
export function RestTimerBar({
  remainingMs,
  done,
  onAdjust,
  onSkip,
}: {
  remainingMs: number;
  done: boolean;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}) {
  return (
    <div
      role="timer"
      aria-live="off"
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2 shadow-lg',
        done ? 'border-success bg-success-soft text-success-soft-foreground' : 'bg-card',
      )}
    >
      <span className="text-sm font-medium">{done ? 'Rest done' : 'Rest'}</span>
      {!done && <span className="min-w-16 num-lg tabular-nums">{mmss(remainingMs)}</span>}
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => onAdjust(-15)}
          aria-label="Subtract 15 seconds"
          className="inline-flex size-12 items-center justify-center rounded-md border hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Minus className="size-5" aria-hidden />
          <span className="text-xs num">15</span>
        </button>
        <button
          type="button"
          onClick={() => onAdjust(15)}
          aria-label="Add 15 seconds"
          className="inline-flex size-12 items-center justify-center rounded-md border hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Plus className="size-5" aria-hidden />
          <span className="text-xs num">15</span>
        </button>
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip rest"
          className="inline-flex h-12 items-center gap-1 rounded-md border px-3 text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" aria-hidden />
          Skip
        </button>
      </div>
    </div>
  );
}
