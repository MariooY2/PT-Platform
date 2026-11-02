'use client';

import { useCallback, useEffect, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusChip } from '@/components/shared/status-chip';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Users } from 'lucide-react';
import {
  assignClientsAction,
  listAssignableClientsAction,
  loadWeekOnePreviewAction,
  type AssignableClient,
} from '../actions';
import type { WeekOnePreview as WeekOnePreviewData } from '../queries';
import { assignedToLabel, defaultStartDate } from '../lib';
import { WeekOnePreview } from './week-one-preview';

type Fetch<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

export function AssignDialog({
  templateId,
  templateTitle,
  trigger,
  autoOpenStep,
}: {
  templateId: string;
  templateTitle: string;
  trigger: ReactNode;
  /** For screenshots: open the dialog (at this step) on mount, driven by `?state` (first card only). */
  autoOpenStep?: 1 | 2;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [clients, setClients] = useState<Fetch<AssignableClient[]>>({ status: 'loading' });
  const [preview, setPreview] = useState<Fetch<WeekOnePreviewData> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [assigning, startAssign] = useTransition();

  const fetchClients = useCallback(async () => {
    const res = await listAssignableClientsAction();
    setClients(
      'error' in res
        ? { status: 'error', message: res.error }
        : { status: 'ready', data: res.clients },
    );
  }, []);

  const fetchPreview = useCallback(async () => {
    const res = await loadWeekOnePreviewAction(templateId);
    setPreview(
      'error' in res
        ? { status: 'error', message: res.error }
        : { status: 'ready', data: res.preview },
    );
  }, [templateId]);

  // Opening (from the trigger click or the auto-open effect) kicks off the client load, and the
  // preview load too when opening straight to step 2.
  const openAt = useCallback(
    (toStep: 1 | 2) => {
      setOpen(true);
      setStep(toStep);
      setClients({ status: 'loading' });
      void fetchClients();
      if (toStep === 2) {
        setPreview({ status: 'loading' });
        void fetchPreview();
      }
    },
    [fetchClients, fetchPreview],
  );

  // Auto-open for the `?state` screenshot pass. Deferred to a frame so the effect never calls
  // setState synchronously (matches the invite-dialog pattern).
  useEffect(() => {
    if (!autoOpenStep) return;
    const frame = requestAnimationFrame(() => openAt(autoOpenStep));
    return () => cancelAnimationFrame(frame);
  }, [autoOpenStep, openAt]);

  function retryClients() {
    setClients({ status: 'loading' });
    void fetchClients();
  }

  function retryPreview() {
    setPreview({ status: 'loading' });
    void fetchPreview();
  }

  function onOpenChange(next: boolean) {
    if (next) {
      openAt(1);
      return;
    }
    // Closed: reset for the next open.
    setOpen(false);
    setStep(1);
    setSelected(new Set());
    setQuery('');
    setStartDate(defaultStartDate());
    setClients({ status: 'loading' });
    setPreview(null);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goToPreview() {
    setStep(2);
    setPreview({ status: 'loading' });
    void fetchPreview();
  }

  function assign() {
    startAssign(async () => {
      const res = await assignClientsAction({
        templateId,
        clientIds: [...selected],
        startDate,
      });
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success(assignedToLabel(res.copies.map((c) => c.name)));
      if (res.failed.length > 0) {
        toast.error(`We couldn’t assign to ${res.failed.join(', ')}. Try again.`);
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const filtered =
    clients.status === 'ready'
      ? clients.data.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign {templateTitle}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Pick the clients to assign this program to. Each gets their own copy.'
              : 'Choose a start date and review week 1 before assigning.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3">
            {clients.status === 'loading' && <ListSkeleton rows={4} />}
            {clients.status === 'error' && (
              <ErrorState description={clients.message} onRetry={retryClients} />
            )}
            {clients.status === 'ready' && clients.data.length === 0 && (
              <EmptyState
                icon={Users}
                title="No active clients yet"
                description="Add or reactivate a client to assign a program."
                action={
                  <Button asChild variant="outline">
                    <Link href="/coach/clients">Go to clients</Link>
                  </Button>
                }
              />
            )}
            {clients.status === 'ready' && clients.data.length > 0 && (
              <>
                <div>
                  <Label htmlFor="assign-search" className="sr-only">
                    Search clients
                  </Label>
                  <Input
                    id="assign-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search clients"
                  />
                </div>
                {filtered.length === 0 ? (
                  <div className="space-y-2 py-4 text-center">
                    <p className="text-sm text-muted-foreground">No clients match your search.</p>
                    <Button type="button" variant="outline" onClick={() => setQuery('')}>
                      Clear search
                    </Button>
                  </div>
                ) : (
                  <ul className="max-h-72 space-y-1 overflow-y-auto">
                    {filtered.map((c) => (
                      <li key={c.id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-2 hover:bg-accent has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                          <Checkbox
                            checked={selected.has(c.id)}
                            onCheckedChange={() => toggle(c.id)}
                            aria-label={`Assign to ${c.name}`}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {c.name}
                          </span>
                          {c.hasProgram && <StatusChip tone="neutral">Has a program</StatusChip>}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assign-start-date">Start date</Label>
              <Input
                id="assign-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="max-w-48"
              />
            </div>
            {preview?.status === 'loading' && <ListSkeleton rows={3} />}
            {preview?.status === 'error' && (
              <ErrorState description={preview.message} onRetry={retryPreview} />
            )}
            {preview?.status === 'ready' && <WeekOnePreview preview={preview.data} />}
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={goToPreview}
                disabled={selected.size === 0 || clients.status !== 'ready'}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" onClick={assign} disabled={assigning || selected.size === 0}>
                {assigning ? 'Assigning…' : 'Assign program'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
