'use client';

import { useRef, useState, useTransition } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RelativeDate } from '@/components/format';
import { addNoteAction } from '../actions';
import type { ClientNote } from '../queries';

export function NotesPanel({ clientId, notes }: { clientId: string; notes: ClientNote[] }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await addNoteAction(clientId, body);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setBody('');
      toast.success('Note added');
      fieldRef.current?.focus();
    });
  }

  return (
    <section aria-labelledby="notes-heading" className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="size-4" aria-hidden />
        <span id="notes-heading">Only you can see notes</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid gap-2">
          <Label htmlFor="note-body" className="sr-only">
            Add a note
          </Label>
          <Textarea
            id="note-body"
            ref={fieldRef}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a private note about this client…"
          />
        </div>
        {error && (
          <p
            className="text-sm text-destructive dark:text-destructive-soft-foreground"
            role="alert"
          >
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending || body.trim() === ''}>
          {pending ? 'Adding…' : 'Add note'}
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No notes yet. Private notes you add appear here.
        </p>
      ) : (
        <ol className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border p-3">
              <p className="text-sm whitespace-pre-wrap">{note.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                <RelativeDate date={note.createdAt} />
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
