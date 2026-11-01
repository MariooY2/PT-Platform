'use client';

import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Present but disabled in P1-01; P1-02 wires it to the invite dialog. A disabled <button> swallows
 * pointer events, so the tooltip hangs off a focusable wrapper span instead.
 */
export function InviteClientButton({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className={className} aria-describedby="invite-coming-soon">
            <Button type="button" disabled className="pointer-events-none w-full">
              <UserPlus />
              Invite client
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent id="invite-coming-soon">Coming soon</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
