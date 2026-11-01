'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BOTTOM_NAV, NAV_LABEL, isActive, type NavVariant } from './nav-items';

export function BottomNav({
  variant,
  hideOnDesktop = false,
}: {
  variant: NavVariant;
  hideOnDesktop?: boolean;
}) {
  const pathname = usePathname();
  const items = BOTTOM_NAV[variant];
  return (
    <nav
      aria-label={NAV_LABEL[variant]}
      className={cn('shrink-0 border-t bg-card', hideOnDesktop && 'lg:hidden')}
    >
      <ul className="mx-auto flex max-w-[560px]">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  active ? 'font-medium text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-6" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
