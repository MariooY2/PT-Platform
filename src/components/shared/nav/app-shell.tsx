import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BottomNav } from './bottom-nav';
import { SideNav } from './side-nav';
import { PHONE_SHAPED, SIDEBAR_NAV, type NavVariant } from './nav-items';

// Server component: a static page frame that composes the client nav islands + a skip link.
// Only a serializable `variant` crosses into the client islands (they look their items up there),
// so no icon component is ever passed as a prop across the RSC boundary.
export function AppShell({ variant, children }: { variant: NavVariant; children: ReactNode }) {
  const hasSidebar = Boolean(SIDEBAR_NAV[variant]);
  const phoneShaped = PHONE_SHAPED[variant];

  return (
    // Fixed-height app frame: the page itself never scrolls, `main` does. This keeps the bottom nav a
    // normal in-flow sibling below `main` (not a sticky overlay), so it never paints over mid-page
    // interactive content at the fold (WCAG 2.2 target-size). See app-shell inner-scroll note (D-028).
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#main"
        className="sr-only bg-primary text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to content
      </a>
      {hasSidebar && <SideNav variant={variant} />}
      <div className="flex h-dvh min-w-0 flex-1 flex-col">
        <main
          id="main"
          tabIndex={-1}
          className={cn(
            // `min-h-0` lets this flex child shrink below its content so `overflow-y-auto` scrolls
            // inside the frame instead of growing the page. The nav shows below lg for coach/admin,
            // always for the client.
            'min-h-0 flex-1 overflow-y-auto outline-none',
            phoneShaped && 'mx-auto w-full max-w-[560px]',
          )}
        >
          {children}
        </main>
        <BottomNav variant={variant} hideOnDesktop={hasSidebar} />
      </div>
    </div>
  );
}
