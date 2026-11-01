'use client';

import { ExternalLink, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { youtubeEmbedUrl } from '../media';
import { humanizeTaxonomy } from '../taxonomy';
import type { Exercise } from '../types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function ExerciseDetailDialog({
  exercise,
  isCustom,
  onClose,
}: {
  exercise: Exercise | null;
  isCustom: boolean;
  onClose: () => void;
}) {
  const open = exercise !== null;
  const embed = youtubeEmbedUrl(exercise?.video_url);
  const secondary = exercise?.secondary_muscles ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {exercise && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">{exercise.name}</DialogTitle>
              <DialogDescription>
                {isCustom ? 'Your custom exercise.' : 'From the global library.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <Section title="Video">
                {embed ? (
                  <div className="aspect-video w-full overflow-hidden rounded-lg border">
                    <iframe
                      src={embed}
                      title={`${exercise.name} video`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="size-full"
                    />
                  </div>
                ) : exercise.video_url ? (
                  <a
                    href={exercise.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Watch video
                  </a>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    <Video className="size-4" aria-hidden />
                    No video yet
                  </div>
                )}
              </Section>

              <Section title="Muscles">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{humanizeTaxonomy(exercise.primary_muscle)}</Badge>
                  {secondary.map((m) => (
                    <Badge key={m} variant="outline">
                      {humanizeTaxonomy(m)}
                    </Badge>
                  ))}
                </div>
              </Section>

              <Section title="Equipment">
                <p className="text-sm">
                  {exercise.equipment ? humanizeTaxonomy(exercise.equipment) : 'No equipment'}
                </p>
              </Section>

              <Section title="Instructions">
                {exercise.instructions ? (
                  <p className="max-w-prose text-sm whitespace-pre-wrap">{exercise.instructions}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No instructions yet</p>
                )}
              </Section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
