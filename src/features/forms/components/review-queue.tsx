'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { RelativeDate } from '@/components/format';
import { cn } from '@/lib/utils';
import { replyToResponseAction } from '../actions';
import type { QueueItem } from '../queries';
import { AnswersView } from './answers-view';

const DESCRIPTION = 'Submitted check-ins and intakes, oldest first. Reply to mark one reviewed.';

export function ReviewQueue({
  items,
  hadError = false,
  forcedState,
}: {
  items: QueueItem[];
  hadError?: boolean;
  forcedState?: string;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>(items);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);

  const showError = hadError || forcedState === 'error';
  const showLoading = forcedState === 'loading';
  const isEmpty = forcedState === 'empty' || queue.length === 0;

  const selected = queue.find((q) => q.id === selectedId) ?? queue[0] ?? null;

  function onReplied(id: string) {
    setQueue((q) => q.filter((item) => item.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Check-ins" description={DESCRIPTION} />

      {showError ? (
        <ErrorState
          title="Couldn’t load check-ins"
          description="Check your connection and try again."
          onRetry={() => router.refresh()}
        />
      ) : showLoading ? (
        <ListSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No check-ins to review"
          description="When your clients submit check-ins, they appear here, oldest first."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <nav aria-label="Check-in queue" className="flex flex-col gap-1.5">
            {queue.map((item) => {
              const active = item.id === selected?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'min-h-11 space-y-0.5 rounded-lg border px-3 py-2 text-left transition-colors',
                    active ? 'border-primary bg-muted' : 'border-border hover:bg-muted/60',
                  )}
                >
                  <span className="block truncate text-sm font-medium">
                    {item.clientName ?? 'Your client'}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.formTitle} · <RelativeDate date={item.submittedAt} />
                  </span>
                </button>
              );
            })}
          </nav>

          {selected ? (
            <ReviewDetail key={selected.id} item={selected} onReplied={onReplied} />
          ) : (
            <p className="text-sm text-muted-foreground">Select a check-in to review it.</p>
          )}
        </div>
      )}

      <Toaster />
    </div>
  );
}

function ReviewDetail({ item, onReplied }: { item: QueueItem; onReplied: (id: string) => void }) {
  const [reply, setReply] = useState('');
  const [isSending, startSend] = useTransition();

  function send() {
    const text = reply.trim();
    if (!text) {
      toast.error('Write a reply first.');
      return;
    }
    startSend(async () => {
      const res = await replyToResponseAction(item.id, text);
      if (res.ok) {
        toast.success('Reply sent.');
        onReplied(item.id);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <section className="space-y-5" aria-label={`Review ${item.clientName ?? 'client'}`}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">{item.clientName ?? 'Your client'}</h2>
        <p className="text-sm text-muted-foreground">
          {item.formTitle} · submitted <RelativeDate date={item.submittedAt} />
        </p>
      </header>

      <AnswersView questions={item.questions} answers={item.answers} />

      <div className="space-y-2">
        <Label htmlFor="coach-reply">Your reply</Label>
        <Textarea
          id="coach-reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder="Write back to your client"
        />
        <Button onClick={send} disabled={isSending}>
          {isSending ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </section>
  );
}
