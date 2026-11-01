'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { saveAnswersAction, submitResponseAction } from '../actions';
import type { AnswerValue, Question } from '../schemas';

export function CheckinFill({
  responseId,
  formTitle,
  questions,
  initialAnswers,
}: {
  responseId: string;
  formTitle: string;
  questions: Question[];
  initialAnswers: Record<string, AnswerValue>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSend] = useTransition();

  const total = questions.length;
  const question = questions[step];
  const isLast = step === total - 1;

  function setAnswer(value: AnswerValue) {
    setError(null);
    setAnswers((a) => ({ ...a, [question.id]: value }));
  }

  function isAnswered(q: Question, v: AnswerValue): boolean {
    return !(v === undefined || v === null || v === '');
  }

  function goNext() {
    const value = answers[question.id] ?? null;
    if (question.required && !isAnswered(question, value)) {
      setError('This question is required.');
      return;
    }
    // Persist progress so a reload resumes where they left off (best-effort; errors are non-blocking).
    void saveAnswersAction(responseId, answers);
    setError(null);
    setStep((s) => Math.min(s + 1, total - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    const value = answers[question.id] ?? null;
    if (question.required && !isAnswered(question, value)) {
      setError('This question is required.');
      return;
    }
    startSend(async () => {
      const res = await submitResponseAction(responseId, answers);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.kind === 'intake') {
        router.replace('/client');
      } else {
        router.refresh();
      }
    });
  }

  if (!question) return null;

  const progress = Math.round(((step + 1) / total) * 100);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-6 p-4 sm:p-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">{formTitle}</p>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Question ${step + 1} of ${total}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs num text-muted-foreground">
          {step + 1} of {total}
        </p>
      </header>

      <div className="flex-1 space-y-4">
        <h1 className="text-xl font-semibold">
          {question.label}
          {question.required && (
            <span className="text-destructive" aria-hidden>
              {' '}
              *
            </span>
          )}
        </h1>

        <QuestionField
          question={question}
          value={answers[question.id] ?? null}
          onChange={setAnswer}
        />

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="lg" onClick={goBack} disabled={step === 0 || isSending}>
          Back
        </Button>
        {isLast ? (
          <Button size="lg" onClick={submit} disabled={isSending}>
            {isSending ? 'Sending…' : 'Send check-in'}
          </Button>
        ) : (
          <Button size="lg" onClick={goNext} disabled={isSending}>
            Next
          </Button>
        )}
      </div>
      <Toaster />
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  switch (question.type) {
    case 'long_text':
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          autoFocus
          placeholder="Type your answer"
        />
      );
    case 'number':
      return (
        <Input
          inputMode="numeric"
          value={value === null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 text-base"
          autoFocus
          placeholder="0"
        />
      );
    case 'weight':
      return (
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal"
            value={value === null ? '' : String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="h-12 max-w-40 text-base"
            autoFocus
            placeholder="0.0"
          />
          <span className="text-sm text-muted-foreground">kg</span>
        </div>
      );
    case 'scale':
      return (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, n) => {
            const selected = value === n + 1;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(n + 1)}
                className={cn(
                  'size-11 rounded-md border text-sm num',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted',
                )}
              >
                {n + 1}
              </button>
            );
          })}
        </div>
      );
    case 'choice':
      return (
        <div className="flex flex-col gap-2">
          {(question.options ?? []).map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(opt)}
                className={cn(
                  'min-h-11 rounded-md border px-4 py-2 text-left text-sm',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted',
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    case 'yes_no':
      return (
        <div className="flex gap-2">
          {[
            { label: 'Yes', v: true },
            { label: 'No', v: false },
          ].map((opt) => {
            const selected = value === opt.v;
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(opt.v)}
                className={cn(
                  'min-h-11 min-w-20 rounded-md border px-4 py-2 text-sm',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    case 'photo':
      return (
        <div className="flex items-center gap-2 rounded-md border border-dashed px-4 py-4 text-sm text-muted-foreground">
          <Camera className="size-5" aria-hidden />
          Photo upload is coming soon — you can skip this.
        </div>
      );
    case 'text':
    default:
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 text-base"
          autoFocus
          placeholder="Type your answer"
        />
      );
  }
}
