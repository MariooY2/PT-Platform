import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { NavItem } from './nav-items';

export function MoreList({ items }: { items: NavItem[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-14 items-center gap-3 px-4 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-sm">{item.label}</span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
