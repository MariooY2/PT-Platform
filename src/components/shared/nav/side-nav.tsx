'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_LABEL, SIDEBAR_NAV, isActive, type NavVariant } from './nav-items';

export function SideNav({ variant }: { variant: NavVariant }) {
  const pathname = usePathname();
  const groups = SIDEBAR_NAV[variant] ?? [];
  return (
    <nav
      aria-label={`${NAV_LABEL[variant]} sidebar`}
      className="hidden w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 text-sidebar-foreground lg:flex"
    >
      <span className="px-2 text-lg font-bold">PT Platform</span>
      {groups.map((group, i) => (
        <div key={group.title ?? i} className="space-y-1">
          {group.title && (
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.title}</p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-2 text-sm',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
                  active
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                <Icon className="size-6 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
