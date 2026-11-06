'use client';

import { useRef, useState, useTransition } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { Camera, ImageOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { RelativeDate } from '@/components/format';
import type { Database } from '@/lib/supabase/types';
import { publicSupabaseConfig, registerProgressPhotoAction } from '../actions';
import type { PhotoDate } from '../types';
import type { PhotoPose } from '../schemas';

const BUCKET = 'progress-photos';
const MAX_BYTES = 10 * 1024 * 1024;
const POSES: PhotoPose[] = ['front', 'side', 'back'];
const POSE_LABEL: Record<PhotoPose, string> = { front: 'Front', side: 'Side', back: 'Back' };

function ext(name: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name);
  return (m?.[1] ?? 'jpg').toLowerCase();
}

function PhotoCell({ url, pose, date }: { url: string | null; pose: PhotoPose; date: string }) {
  return (
    <div className="space-y-1">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL; next/image needs remotePatterns config (out of scope)
          <img
            src={url}
            alt={`${POSE_LABEL[pose]} photo from ${date}`}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageOff className="size-5" aria-hidden />
            <span className="text-xs">No {POSE_LABEL[pose].toLowerCase()}</span>
          </span>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground">{POSE_LABEL[pose]}</p>
    </div>
  );
}

function DateGroup({ group }: { group: PhotoDate }) {
  const byPose = new Map(group.photos.map((p) => [p.pose, p]));
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        <RelativeDate date={`${group.date}T12:00:00Z`} absolute />
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {POSES.map((pose) => (
          <PhotoCell key={pose} pose={pose} date={group.date} url={byPose.get(pose)?.url ?? null} />
        ))}
      </div>
    </div>
  );
}

function UploadRow({ userId }: { userId: string }) {
  const [pose, setPose] = useState<PhotoPose>('front');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || pending;

  function reset() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function upload() {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is larger than 10 MB.');
      return;
    }
    const cfg = await publicSupabaseConfig();
    const supabase = createBrowserClient<Database>(cfg.url, cfg.anonKey);
    const path = `${userId}/${pose}/${crypto.randomUUID()}.${ext(file.name)}`;
    setUploading(true);
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    setUploading(false);
    if (up.error) {
      setError('That photo could not be uploaded. Try again.');
      return;
    }
    start(async () => {
      const res = await registerProgressPhotoAction({ pose, storagePath: path });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      toast.success('Photo added.');
      reset();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="photo-pose">Pose</Label>
          <Select value={pose} onValueChange={(v) => setPose(v as PhotoPose)}>
            <SelectTrigger id="photo-pose" className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSES.map((p) => (
                <SelectItem key={p} value={p}>
                  {POSE_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid flex-1 gap-2">
          <Label htmlFor="photo-file">Photo</Label>
          <Input
            id="photo-file"
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              setError(null);
              setFile(e.target.files?.[0] ?? null);
            }}
          />
        </div>
        <Button type="button" onClick={upload} disabled={!file || busy} className="sm:w-auto">
          {busy ? 'Adding…' : 'Add photo'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive dark:text-destructive-soft-foreground">
          {error}
        </p>
      )}
    </div>
  );
}

function ComparePicker({ dates }: { dates: PhotoDate[] }) {
  const [a, setA] = useState(dates[0].date);
  const [b, setB] = useState(dates[1].date);
  const groupA = dates.find((d) => d.date === a) ?? dates[0];
  const groupB = dates.find((d) => d.date === b) ?? dates[1];

  return (
    <section aria-labelledby="compare-heading" className="space-y-3">
      <h2 id="compare-heading" className="text-lg font-medium">
        Compare
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: a, set: setA, label: 'First date' },
          { value: b, set: setB, label: 'Second date' },
        ].map((sel, i) => (
          <div key={i} className="grid gap-2">
            <Label htmlFor={`compare-${i}`}>{sel.label}</Label>
            <Select value={sel.value} onValueChange={sel.set}>
              <SelectTrigger id={`compare-${i}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dates.map((d) => (
                  <SelectItem key={d.date} value={d.date}>
                    {d.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DateGroup group={groupA} />
        <DateGroup group={groupB} />
      </div>
    </section>
  );
}

export function PhotosTab({
  dates,
  userId,
  hadError = false,
  forcedState,
}: {
  dates: PhotoDate[];
  userId: string;
  hadError?: boolean;
  forcedState?: string;
}) {
  if (forcedState === 'loading') return <ListSkeleton rows={3} />;
  if (forcedState === 'error' || hadError)
    return (
      <ErrorState
        title="Couldn’t load your photos"
        description="Check your connection and try again."
      />
    );

  const isEmpty = forcedState === 'empty' || dates.length === 0;

  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <Lock className="size-4 shrink-0" aria-hidden />
        Only you and your coach can see these.
      </p>

      <UploadRow userId={userId} />

      {isEmpty ? (
        <EmptyState
          icon={Camera}
          title="No progress photos yet"
          description="Add a front, side or back photo to track how you change over time."
        />
      ) : (
        <>
          {dates.length >= 2 && <ComparePicker dates={dates} />}
          <section aria-labelledby="all-photos-heading" className="space-y-4">
            <h2 id="all-photos-heading" className="text-lg font-medium">
              By date
            </h2>
            {dates.map((group) => (
              <DateGroup key={group.date} group={group} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
