'use client';

import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QUESTION_TYPES, QUESTION_TYPE_LABEL, type Question, type QuestionType } from '../schemas';

export function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  question: Question;
  index: number;
  total: number;
  onChange: (next: Question) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const labelId = `q-label-${question.id}`;
  const typeId = `q-type-${question.id}`;

  function setType(type: QuestionType) {
    const next: Question = { ...question, type };
    if (type === 'choice' && (!next.options || next.options.length === 0)) {
      next.options = ['Option 1', 'Option 2'];
    }
    if (type !== 'choice') delete next.options;
    if (type === 'photo') next.required = false;
    onChange(next);
  }

  function setOption(i: number, val: string) {
    const options = [...(question.options ?? [])];
    options[i] = val;
    onChange({ ...question, options });
  }

  function addOption() {
    const options = [...(question.options ?? []), `Option ${(question.options?.length ?? 0) + 1}`];
    onChange({ ...question, options });
  }

  function removeOption(i: number) {
    const options = (question.options ?? []).filter((_, j) => j !== i);
    onChange({ ...question, options });
  }

  return (
    <li className="space-y-3 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={labelId} className="text-xs text-muted-foreground">
            Question {index + 1}
          </Label>
          <Input
            id={labelId}
            value={question.label}
            onChange={(e) => onChange({ ...question, label: e.target.value })}
            placeholder="Question label"
          />
        </div>
        <div className="flex flex-col gap-1 pt-5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move question ${index + 1} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move question ${index + 1} down`}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove question ${index + 1}`}
          onClick={onRemove}
          className="mt-5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-1">
          <Label htmlFor={typeId} className="text-xs text-muted-foreground">
            Type
          </Label>
          <Select value={question.type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger id={typeId} aria-label={`Type for question ${index + 1}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch
            id={`q-required-${question.id}`}
            checked={question.required}
            disabled={question.type === 'photo'}
            onCheckedChange={(checked) => onChange({ ...question, required: checked })}
          />
          <Label htmlFor={`q-required-${question.id}`} className="text-sm">
            Required
          </Label>
          {question.type === 'photo' && (
            <span className="text-xs text-muted-foreground">Photos stay optional</span>
          )}
        </div>
      </div>

      {question.type === 'choice' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Choices</p>
          <ul className="space-y-1.5">
            {(question.options ?? []).map((opt, i) => (
              <li key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  aria-label={`Choice ${i + 1} for question ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove choice ${i + 1}`}
                  disabled={(question.options ?? []).length <= 2}
                  onClick={() => removeOption(i)}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="default" onClick={addOption}>
            <Plus className="size-4" aria-hidden />
            Add choice
          </Button>
        </div>
      )}
    </li>
  );
}
