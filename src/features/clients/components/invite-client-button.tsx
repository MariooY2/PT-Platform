'use client';

import { InviteDialog } from './invite-dialog';

/**
 * The Clients-list primary action. Opens the invite dialog (copy-link / email / import-CSV tabs).
 * Wrapped as its own component so the server page can render it in the PageHeader action slot.
 */
export function InviteClientButton({ className }: { className?: string }) {
  return <InviteDialog triggerClassName={className} />;
}
