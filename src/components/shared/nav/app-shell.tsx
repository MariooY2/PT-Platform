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
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only bg-primary text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to content
      </a>
      {hasSidebar && <SideNav variant={variant} />}
      <div className="flex min-h-dvh flex-1 flex-col">
        <main
          id="main"
          tabIndex={-1}
          className={cn('flex-1 outline-none', phoneShaped && 'mx-auto w-full max-w-[560px]')}
        >
          {children}
        </main>
        <BottomNav variant={variant} hideOnDesktop={hasSidebar} />
      </div>
    </div>
  );
}
