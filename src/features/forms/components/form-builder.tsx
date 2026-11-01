'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, Loader2, Plus, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QUESTION_TYPES, QUESTION_TYPE_LABEL, type Question, type QuestionType } from '../schemas';
import { saveFormAction } from '../actions';
import type { FormRow } from '../queries';
import { QuestionEditor } from './question-editor';
import { FormPreview } from './form-preview';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function newQuestion(type: QuestionType): Question {
  const id = `q_${crypto.randomUUID().slice(0, 8)}`;
  // A non-empty default label keeps the form valid so autosave succeeds the moment it's added;
  // the coach edits the label in place.
  const base = { id, type, label: 'New question', required: false } as Question;
  if (type === 'choice') base.options = ['Option 1', 'Option 2'];
  return base;
}

export function FormBuilder({ form }: { form: FormRow }) {
  const [title, setTitle] = useState(form.title);
  const [questions, setQuestions] = useState<Question[]>(form.questions);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The parent remounts this component (key={form.id}) when a different form is selected, so local
  // state always initialises fresh from props — no reset effect needed.

  const save = useCallback(
    async (nextTitle: string, nextQuestions: Question[]) => {
      setStatus('saving');
      const res = await saveFormAction(form.id, { title: nextTitle, questions: nextQuestions });
      if (res.ok) {
        setStatus('saved');
      } else {
        setStatus('error');
        toast.error(res.error);
      }
    },
    [form.id],
  );

  // Autosave (debounced) — the spec's long-editor pattern: no Save button, a visible status.
  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(title, questions), 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [title, questions, save]);

  function update(next: Question[]) {
    dirty.current = true;
    setQuestions(next);
  }

  function changeQuestion(i: number, q: Question) {
    update(questions.map((old, j) => (j === i ? q : old)));
  }

  function moveQuestion(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  }

  function removeQuestion(i: number) {
    update(questions.filter((_, j) => j !== i));
  }

  function addQuestion(type: QuestionType) {
    update([...questions, newQuestion(type)]);
  }

  const previewQuestions = useMemo(() => questions, [questions]);

  return (
    <section className="space-y-4" aria-label={`Editing ${form.title}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="form-title">Form title</Label>
          <Input
            id="form-title"
            value={title}
            onChange={(e) => {
              dirty.current = true;
              setTitle(e.target.value);
            }}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Eye className="size-4" aria-hidden />
                Preview
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto p-4">
              <SheetHeader className="p-0">
                <SheetTitle>Preview</SheetTitle>
                <SheetDescription>Exactly what your client sees on their phone.</SheetDescription>
              </SheetHeader>
              <FormPreview title={title} questions={previewQuestions} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          This form has no questions yet. Add your first question below.
        </div>
      ) : (
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onChange={(next) => changeQuestion(i, next)}
              onMove={(dir) => moveQuestion(i, dir)}
              onRemove={() => removeQuestion(i)}
            />
          ))}
        </ol>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Plus className="size-4" aria-hidden />
            Add question
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {QUESTION_TYPES.map((t) => (
            <DropdownMenuItem key={t} onSelect={() => addQuestion(t)}>
              {QUESTION_TYPE_LABEL[t]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </section>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <Check className="size-4 text-success" aria-hidden />
        Saved
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-warning" role="status">
        <TriangleAlert className="size-4" aria-hidden />
        Couldn’t save
      </span>
    );
  }
  return null;
}
