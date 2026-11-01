'use client';

import { useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setClientStatusAction } from '../actions';
import { nextStatusActions, type ClientStatus } from '../lib';

const PAST_TENSE: Record<string, string> = {
  active: 'reactivated',
  paused: 'paused',
  archived: 'archived',
};

export function ClientStatusMenu({
  clientId,
  status,
  name,
  align = 'end',
}: {
  clientId: string;
  status: ClientStatus;
  name: string;
  align?: 'start' | 'end';
}) {
  const [pending, start] = useTransition();
  const actions = nextStatusActions(status);
  if (actions.length === 0) return null;

  function apply(next: ClientStatus, from: ClientStatus) {
    start(async () => {
      const res = await setClientStatusAction(clientId, next);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`${name} ${PAST_TENSE[next]}`, {
        action: {
          label: 'Undo',
          onClick: () =>
            start(async () => {
              await setClientStatusAction(clientId, from);
            }),
        },
      });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${name}`} disabled={pending}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {actions.map((a) => (
          <DropdownMenuItem
            key={a.status}
            variant={a.status === 'archived' ? 'destructive' : 'default'}
            onSelect={() => apply(a.status, status)}
          >
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
