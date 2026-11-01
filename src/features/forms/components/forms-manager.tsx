'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, ClipboardList, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { createFormAction } from '../actions';
import type { FormRow } from '../queries';
import { FormBuilder } from './form-builder';

const DESCRIPTION = 'Your intake and check-in forms. Build questions and preview the client view.';

export function FormsManager({
  forms,
  hadError = false,
  forcedState,
}: {
  forms: FormRow[];
  hadError?: boolean;
  forcedState?: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(forms[0]?.id ?? null);
  const [isCreating, startCreate] = useTransition();

  // Derive the selection so it stays valid as the list changes (e.g. after creating a form),
  // without a setState-in-effect: an invalid or stale selection falls back to the first form.
  const selected = forms.find((f) => f.id === selectedId) ?? forms[0] ?? null;

  function createForm() {
    startCreate(async () => {
      const res = await createFormAction({ title: 'New form', kind: 'checkin' });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSelectedId(res.id);
      router.refresh();
      toast.success('Form created.');
    });
  }

  const newFormButton = (
    <Button onClick={createForm} disabled={isCreating}>
      <Plus className="size-4" aria-hidden />
      {isCreating ? 'Creating…' : 'New form'}
    </Button>
  );

  const showError = hadError || forcedState === 'error';
  const showLoading = forcedState === 'loading';
  const isEmpty = forcedState === 'empty' || forms.length === 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Forms" description={DESCRIPTION} action={newFormButton} />

      {showError ? (
        <ErrorState
          title="Couldn’t load forms"
          description="Check your connection and try again."
          onRetry={() => router.refresh()}
        />
      ) : showLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <ListSkeleton rows={3} />
          <div className="space-y-3">
            <Skeleton className="h-11 w-64 rounded-md" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={FileText}
          title="No forms yet"
          description="Intake and check-in forms you build appear here."
          action={newFormButton}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <nav aria-label="Forms" className="flex flex-col gap-1.5">
            {forms.map((f) => {
              const Icon = f.kind === 'intake' ? ClipboardList : CalendarCheck;
              const active = f.id === selected?.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedId(f.id)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'border-primary bg-muted font-medium'
                      : 'border-border hover:bg-muted/60',
                  )}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1 truncate">{f.title}</span>
                  {f.isDefault && (
                    <Badge variant="secondary" className="shrink-0">
                      Default
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>

          {selected ? (
            <FormBuilder key={selected.id} form={selected} />
          ) : (
            <p className="text-sm text-muted-foreground">Select a form to edit it.</p>
          )}
        </div>
      )}

      <Toaster />
    </div>
  );
}
