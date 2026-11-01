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
          {/* A disabled <button> swallows pointer/focus events, so the focusable wrapper span is
              the trigger. Radix wires aria-describedby to the content only while the tooltip is open. */}
          <span tabIndex={0} className={className}>
            <Button
              type="button"
              variant="outline"
              tabIndex={-1}
              disabled
              className="pointer-events-none w-full"
            >
              <UserPlus />
              Invite client
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Coming soon</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
