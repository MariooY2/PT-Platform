'use client';

import { useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Item = { label: string; href: string; action: string; done: boolean };

export function SetupChecklist({
  hasClient,
  storefrontPublished,
}: {
  hasClient: boolean;
  storefrontPublished: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  // Two items are computable now; the other three complete with their Phase 1/2 features.
  const items: Item[] = [
    {
      label: 'Invite your first client',
      href: '/coach/clients',
      action: 'Invite',
      done: hasClient,
    },
    {
      label: 'Build or duplicate a program',
      href: '/coach/programs',
      action: 'Build',
      done: false,
    },
    { label: 'Assign it to a client', href: '/coach/programs', action: 'Assign', done: false },
    { label: 'Set your weekly check-in day', href: '/coach/settings', action: 'Set', done: false },
    {
      label: 'Publish your storefront (optional)',
      href: '/coach/settings',
      action: 'Publish',
      done: storefrontPublished,
    },
  ];
  const doneCount = items.filter((i) => i.done).length;

  if (dismissed) return null;

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Get set up</h2>
          <p className="text-sm text-muted-foreground">
            <span className="num">{doneCount}</span> of <span className="num">5</span> done
          </p>
        </div>
        {doneCount >= 3 && (
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
        )}
      </div>
      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 py-3">
            {item.done ? (
              <Check className="size-5 shrink-0 text-success" aria-label="Done" />
            ) : (
              <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span
              className={cn('flex-1 text-sm', item.done && 'text-muted-foreground line-through')}
            >
              {item.label}
            </span>
            {!item.done && (
              <Button asChild variant="outline" size="sm">
                <a href={item.href}>{item.action}</a>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
