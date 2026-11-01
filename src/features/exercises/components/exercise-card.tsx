'use client';

import { ChevronRight, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { humanizeTaxonomy } from '../taxonomy';
import type { Exercise } from '../types';

export function ExerciseCard({
  exercise,
  isCustom,
  onOpen,
}: {
  exercise: Exercise;
  isCustom: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        data-testid="exercise-card"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:min-h-44 lg:flex-col lg:items-stretch lg:justify-between lg:p-4"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground lg:h-24 lg:w-full">
          <PlayCircle
            className={exercise.video_url ? 'size-6 text-foreground' : 'size-6 opacity-40'}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-medium lg:whitespace-normal">{exercise.name}</p>
            {isCustom && (
              <Badge variant="outline" className="shrink-0">
                Custom
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{humanizeTaxonomy(exercise.primary_muscle)}</Badge>
            {exercise.equipment && (
              <Badge variant="outline">{humanizeTaxonomy(exercise.equipment)}</Badge>
            )}
          </div>
        </div>

        <ChevronRight className="size-5 shrink-0 text-muted-foreground lg:hidden" aria-hidden />
      </button>
    </li>
  );
}
