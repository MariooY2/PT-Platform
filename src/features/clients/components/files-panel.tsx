'use client';

import { useRef, useState, useTransition } from 'react';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RelativeDate } from '@/components/format';
import { createClient } from '@/lib/supabase/browser';
import { registerClientFileAction } from '../actions';
import type { ClientFile } from '../queries';

const BUCKET = 'client-files';
const MAX_BYTES = 25 * 1024 * 1024;

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

export function FilesPanel({
  clientId,
  trainerId,
  files,
}: {
  clientId: string;
  trainerId: string;
  files: ClientFile[];
}) {
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
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 25 MB.');
      return;
    }
    // The bytes go straight to the private bucket (RLS enforces the trainer/client prefix); the
    // server action then re-derives the prefix from the session before recording the metadata.
    const supabase = createClient();
    const path = `${trainerId}/${clientId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    setUploading(true);
    const up = await supabase.storage.from(BUCKET).upload(path, file);
    setUploading(false);
    if (up.error) {
      setError('That file could not be uploaded. Try again.');
      return;
    }
    const name = file.name;
    start(async () => {
      const res = await registerClientFileAction(clientId, name, path);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      toast.success('File uploaded');
      reset();
    });
  }

  return (
    <section aria-labelledby="files-heading" className="space-y-4">
      <h3 id="files-heading" className="text-sm font-medium">
        Files
      </h3>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="client-file">Upload a file</Label>
          <Input
            id="client-file"
            ref={inputRef}
            type="file"
            onChange={(e) => {
              setError(null);
              setFile(e.target.files?.[0] ?? null);
            }}
          />
        </div>
        <Button type="button" onClick={upload} disabled={!file || busy} className="sm:w-auto">
          {busy ? 'Uploading…' : 'Upload file'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive dark:text-destructive-soft-foreground" role="alert">
          {error}
        </p>
      )}

      {files.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No files yet. Upload plans, photos or documents for this client.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border p-3">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{f.fileName}</span>
                <span className="text-xs text-muted-foreground">
                  <RelativeDate date={f.createdAt} />
                </span>
              </span>
              {f.signedUrl ? (
                <a
                  href={f.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Download className="size-4" aria-hidden />
                  Download
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Unavailable</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
