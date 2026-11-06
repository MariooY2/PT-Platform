import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SyncIndicator, syncIndicatorView } from '@/features/workouts/components/sync-indicator';

// Rendered with react-dom/server (no jsdom needed) so this runs in the default node test env.
describe('A4 sync indicator states', () => {
  it('renders nothing when synced (idle)', () => {
    expect(syncIndicatorView('idle')).toBeNull();
    expect(renderToStaticMarkup(<SyncIndicator state="idle" />)).toBe('');
  });

  it('shows "Saved on this phone" in a muted tone while pending', () => {
    expect(syncIndicatorView('pending')).toEqual({ text: 'Saved on this phone', tone: 'muted' });
    const html = renderToStaticMarkup(<SyncIndicator state="pending" />);
    expect(html).toContain('Saved on this phone');
    expect(html).toContain('text-muted-foreground');
    expect(html).toContain('role="status"');
  });

  it('shows "Couldn’t sync — will retry" in a warning tone after repeated failure', () => {
    expect(syncIndicatorView('failed')).toEqual({
      text: 'Couldn’t sync — will retry',
      tone: 'warning',
    });
    const html = renderToStaticMarkup(<SyncIndicator state="failed" />);
    expect(html).toContain('will retry');
    expect(html).toContain('text-warning-soft-foreground');
  });
});
