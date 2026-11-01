'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Phase 1 PWA install card (docs/platform.md §10, docs/ui/screens/client-app.md). Self-contained so
// the P1-07 Today rebuild keeps it by importing, not inlining. It renders UNCONDITIONALLY on Today,
// hidden only after the client dismisses it (localStorage, per-device) or when the app is already
// installed (display-mode: standalone). The native install button shows only if the browser fired
// `beforeinstallprompt`; otherwise we show a short "Add to Home Screen" instruction — the event may
// never fire in Chromium without a service worker (that is Phase 3), and the card must stay visible
// for the e2e screenshot + axe scan.

const DISMISS_KEY = 'pt:install-prompt-dismissed';

// --- dismissed: a tiny external store backed by localStorage, read via useSyncExternalStore so the
// first client render matches the server (both `false`) and there is no setState-in-effect. ---
const dismissListeners = new Set<() => void>();

function subscribeDismissed(onChange: () => void) {
  dismissListeners.add(onChange);
  return () => dismissListeners.delete(onChange);
}

function getDismissedSnapshot() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function dismissForever() {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Private mode / blocked storage: the card simply reappears next load. Acceptable for a hint.
  }
  for (const listener of dismissListeners) listener();
}

// --- standalone: read matchMedia through the same hook, subscribing to its changes. ---
function subscribeStandalone(onChange: () => void) {
  try {
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  } catch {
    return () => {};
  }
}

function getStandaloneSnapshot() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

const serverFalse = () => false;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const dismissed = useSyncExternalStore(subscribeDismissed, getDismissedSnapshot, serverFalse);
  const standalone = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, serverFalse);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Keep the event so we can trigger the native prompt from our own button.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      // User closed the OS dialog; nothing to do.
    }
    setDeferredPrompt(null);
    dismissForever();
  }, [deferredPrompt]);

  if (dismissed || standalone) return null;

  return (
    <section
      aria-labelledby="install-prompt-title"
      className="relative rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
    >
      <div className="flex items-start gap-3 pr-9">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
        >
          <Share className="size-5" />
        </span>
        <div className="space-y-1">
          <h2 id="install-prompt-title" className="text-base font-semibold">
            Install the app
          </h2>
          <p className="text-sm text-muted-foreground">
            {deferredPrompt
              ? 'Add PT to your home screen for one-tap access to today’s workout.'
              : 'Add PT to your home screen: open your browser menu and choose “Add to Home Screen”.'}
          </p>
        </div>
      </div>

      {deferredPrompt && (
        <div className="mt-3">
          <Button type="button" onClick={install}>
            Add to home screen
          </Button>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={dismissForever}
        aria-label="Dismiss install prompt"
        className="absolute top-2 right-2"
      >
        <X className="size-4" />
      </Button>
    </section>
  );
}
