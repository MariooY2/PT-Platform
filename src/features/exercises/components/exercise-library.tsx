'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EQUIPMENT, EXERCISE_CATEGORIES, MUSCLES, humanizeTaxonomy } from '../taxonomy';
import type { Exercise } from '../types';
import { ExerciseCard } from './exercise-card';
import { ExerciseDetailDialog } from './exercise-detail-dialog';
import { NewExerciseDialog } from './new-exercise-dialog';

const NO_MATCH = 'zzznomatchzzz';
const DESCRIPTION = 'Your exercises and the built-in library. Search, filter, or add your own.';

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">{children}</ul>
  );
}

export function ExerciseLibrary({
  exercises,
  userId,
  hadError = false,
  forcedState,
}: {
  exercises: Exercise[];
  userId: string | null;
  hadError?: boolean;
  forcedState?: string;
}) {
  const router = useRouter();

  const [query, setQuery] = useState(forcedState === 'no-results' ? NO_MATCH : '');
  const [muscle, setMuscle] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const [category, setCategory] = useState('all');
  const [mine, setMine] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(null);

  const isCustom = (e: Exercise) => e.trainer_id !== null && e.trainer_id === userId;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      if (mine && !isCustom(e)) return false;
      if (muscle !== 'all' && e.primary_muscle !== muscle && !e.secondary_muscles.includes(muscle))
        return false;
      if (equipment !== 'all' && e.equipment !== equipment) return false;
      if (category !== 'all' && e.category !== category) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, query, muscle, equipment, category, mine, userId]);

  const activeCount =
    (query.trim() ? 1 : 0) +
    (muscle !== 'all' ? 1 : 0) +
    (equipment !== 'all' ? 1 : 0) +
    (category !== 'all' ? 1 : 0) +
    (mine ? 1 : 0);

  function clearFilters() {
    setQuery('');
    setMuscle('all');
    setEquipment('all');
    setCategory('all');
    setMine(false);
  }

  const showError = hadError || forcedState === 'error';
  const showLoading = forcedState === 'loading';
  const isEmptyLibrary = forcedState === 'empty' || exercises.length === 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Exercises" description={DESCRIPTION} action={<NewExerciseDialog />} />

      {showError ? (
        <ErrorState
          title="Couldn't load exercises"
          description="Check your connection and try again."
          onRetry={() => router.refresh()}
        />
      ) : showLoading ? (
        <div aria-hidden>
          <Grid>
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-20 w-full rounded-xl lg:h-44" />
              </li>
            ))}
          </Grid>
        </div>
      ) : isEmptyLibrary ? (
        <EmptyState
          title="No exercises yet"
          description="Exercises you create appear here. Add one to use it in your programs."
          action={<NewExerciseDialog />}
        />
      ) : (
        <>
          <div className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exercises"
                aria-label="Search exercises"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={muscle} onValueChange={setMuscle}>
                <SelectTrigger aria-label="Filter by muscle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All muscles</SelectItem>
                  {MUSCLES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {humanizeTaxonomy(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger aria-label="Filter by equipment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All equipment</SelectItem>
                  {EQUIPMENT.map((eq) => (
                    <SelectItem key={eq} value={eq}>
                      {humanizeTaxonomy(eq)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Filter by category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {EXERCISE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {humanizeTaxonomy(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={mine ? 'secondary' : 'outline'}
                aria-pressed={mine}
                onClick={() => setMine((v) => !v)}
              >
                My exercises
              </Button>

              {activeCount > 0 && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear filters
                  <span className="text-muted-foreground">({activeCount})</span>
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              <span className="num">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'exercise' : 'exercises'}
            </p>
          </div>

          {filtered.length === 0 ? (
            mine && !exercises.some(isCustom) ? (
              <EmptyState
                title="No exercises yet"
                description="Exercises you create appear here. Add one to use it in your programs."
                action={<NewExerciseDialog />}
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No exercises match these filters"
                description="Try a different muscle, equipment or search, or clear the filters above."
              />
            )
          ) : (
            <Grid>
              {filtered.map((e) => (
                <ExerciseCard
                  key={e.id}
                  exercise={e}
                  isCustom={isCustom(e)}
                  onOpen={() => setSelected(e)}
                />
              ))}
            </Grid>
          )}
        </>
      )}

      <ExerciseDetailDialog
        exercise={selected}
        isCustom={selected ? isCustom(selected) : false}
        onClose={() => setSelected(null)}
      />
      <Toaster />
    </div>
  );
}
