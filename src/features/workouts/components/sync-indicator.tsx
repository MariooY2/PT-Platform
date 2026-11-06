import { CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SyncState } from '../offline/outbox';

interface IndicatorView {
  text: string;
  tone: 'muted' | 'warning';
}

/**
 * The copy + tone for each sync state (docs/ui/patterns.md "Offline and sync", docs/ui/copy.md).
 * Pure so it can be unit-tested without a DOM. `idle` renders nothing.
 */
export function syncIndicatorView(state: SyncState): IndicatorView | null {
  switch (state) {
    case 'pending':
      return { text: 'Saved on this phone', tone: 'muted' };
    case 'failed':
      return { text: 'Couldn’t sync — will retry', tone: 'warning' };
    default:
      return null;
  }
}

/**
 * Shows the outbox state in the player header: nothing when synced, "Saved on this phone" (muted) while
 * a set is queued, "Couldn’t sync — will retry" (warning) after repeated failures. Tokens only.
 */
export function SyncIndicator({ state, className }: { state: SyncState; className?: string }) {
  const view = syncIndicatorView(state);
  if (!view) return null;
  const Icon = view.tone === 'warning' ? RefreshCw : CloudOff;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'mt-0.5 inline-flex items-center gap-1 text-xs',
        view.tone === 'warning' ? 'text-warning-soft-foreground' : 'text-muted-foreground',
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {view.text}
    </span>
  );
}
