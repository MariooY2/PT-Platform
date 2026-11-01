'use client';

import { Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Question } from '../schemas';

/**
 * A non-interactive phone-view preview of a form, exactly as the client sees it. Used in the builder
 * (docs/ui/screens/program-builder.md → Forms builder "Preview shows the client phone view").
 */
export function FormPreview({ title, questions }: { title: string; questions: Question[] }) {
  return (
    <div className="mx-auto w-full max-w-[360px] space-y-4 rounded-2xl border bg-background p-4">
      <p className="text-lg font-semibold">{title}</p>
      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a question to see the preview.</p>
      ) : (
        <ol className="space-y-5">
          {questions.map((q, i) => (
            <li key={q.id} className="space-y-2">
              <p className="text-sm font-medium">
                <span className="text-muted-foreground">{i + 1}. </span>
                {q.label || 'Untitled question'}
                {q.required && (
                  <span className="text-destructive" aria-hidden>
                    {' '}
                    *
                  </span>
                )}
              </p>
              <PreviewField question={q} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PreviewField({ question }: { question: Question }) {
  switch (question.type) {
    case 'long_text':
      return <Textarea disabled placeholder="Their answer" rows={3} />;
    case 'number':
      return <Input disabled inputMode="numeric" placeholder="0" />;
    case 'weight':
      return <Input disabled inputMode="decimal" placeholder="kg" />;
    case 'scale':
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }).map((_, n) => (
            <span
              key={n}
              className="inline-flex size-9 items-center justify-center rounded-md border text-sm num text-muted-foreground"
            >
              {n + 1}
            </span>
          ))}
        </div>
      );
    case 'choice':
      return (
        <div className="flex flex-col gap-1.5">
          {(question.options ?? []).map((opt) => (
            <span key={opt} className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              {opt}
            </span>
          ))}
        </div>
      );
    case 'yes_no':
      return (
        <div className="flex gap-1.5">
          <span className="rounded-md border px-4 py-2 text-sm text-muted-foreground">Yes</span>
          <span className="rounded-md border px-4 py-2 text-sm text-muted-foreground">No</span>
        </div>
      );
    case 'photo':
      return (
        <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
          <Camera className="size-4" aria-hidden />
          Add a photo
        </div>
      );
    case 'text':
    default:
      return <Input disabled placeholder="Their answer" />;
  }
}
