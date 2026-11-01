'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, Copy, Link2, Mail, Upload, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  createInviteAction,
  importClientsCsvAction,
  type CreateInviteSuccess,
  type ImportSummary,
} from '../invite-actions';
import type { InvalidInviteRow } from '../invite-schemas';

// Mirrors MAX_CSV_BYTES in invite-schemas (kept as a literal so the browser bundle doesn't pull in
// the server-side CSV parser). The server enforces the real limit.
const MAX_CSV_BYTES = 1_000_000;

function FieldError({ children }: { children: string }) {
  return (
    <p className="text-sm text-destructive dark:text-destructive-soft-foreground" role="alert">
      {children}
    </p>
  );
}

function buildInviteUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/invite/${token}`;
}

/** Copy-link tab: create an invite, then show the shareable link with copy + WhatsApp. */
function LinkTab() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateInviteSuccess | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createInviteAction(email, 'link');
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setCreated(res);
    });
  }

  if (created) {
    const url = buildInviteUrl(created.token);
    const waText = `Join me on PT Platform — accept your invite: ${url}`;
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-success-soft p-3 text-sm text-success-soft-foreground">
          Invite link ready for {created.email}. It works only for this email and expires in 14
          days.
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="invite-link">Invite link</Label>
          <div className="flex gap-2">
            <Input id="invite-link" value={url} readOnly className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setError('Couldn’t copy the link. Select it and copy manually.');
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on WhatsApp
          </a>
        </Button>
        {error && <FieldError>{error}</FieldError>}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setCreated(null);
            setEmail('');
          }}
        >
          Create another link
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="link-email">Client email</Label>
        <Input
          id="link-email"
          type="email"
          autoComplete="email"
          placeholder="client@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <p className="text-sm text-muted-foreground">
          The link works only for this email. Share it yourself over WhatsApp or anywhere.
        </p>
        {error && <FieldError>{error}</FieldError>}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Creating link…' : 'Create invite link'}
      </Button>
    </form>
  );
}

/** Email tab: create an invite and send it through the email provider. */
function EmailTab() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CreateInviteSuccess | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createInviteAction(email, 'email');
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setDone(res);
    });
  }

  if (done) {
    const url = buildInviteUrl(done.token);
    return (
      <div className="space-y-4">
        {done.emailed ? (
          <div className="rounded-lg bg-success-soft p-3 text-sm text-success-soft-foreground">
            Invite sent to {done.email}. We’ll let you know when they accept.
          </div>
        ) : (
          <div className="rounded-lg bg-warning-soft p-3 text-sm text-warning-soft-foreground">
            We created the invite but couldn’t send the email. Share this link instead:
            <span className="mt-1 block font-mono text-xs break-all">{url}</span>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setDone(null);
            setEmail('');
          }}
        >
          Invite someone else
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="email-email">Client email</Label>
        <Input
          id="email-email"
          type="email"
          autoComplete="email"
          placeholder="client@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <p className="text-sm text-muted-foreground">
          We’ll email them an invite link to create their account.
        </p>
        {error && <FieldError>{error}</FieldError>}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Sending invite…' : 'Send invite'}
      </Button>
    </form>
  );
}

function ImportSummaryView({ summary, onReset }: { summary: ImportSummary; onReset: () => void }) {
  const invalid: InvalidInviteRow[] = summary.invalid;
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-success-soft p-3 text-sm text-success-soft-foreground">
        {summary.created === 0
          ? 'No new clients were added.'
          : `Invited ${summary.created} ${summary.created === 1 ? 'client' : 'clients'}.`}
      </div>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {summary.skippedExisting > 0 && (
          <li>{summary.skippedExisting} already on your list — skipped.</li>
        )}
        {summary.duplicatesInFile > 0 && (
          <li>{summary.duplicatesInFile} repeated in the file — added once.</li>
        )}
        {invalid.length > 0 && (
          <li className="text-destructive dark:text-destructive-soft-foreground">
            {invalid.length} {invalid.length === 1 ? 'row' : 'rows'} couldn’t be read.
          </li>
        )}
      </ul>
      {invalid.length > 0 && (
        <div className="max-h-40 overflow-auto rounded-lg border p-2 text-xs">
          <ul className="space-y-1">
            {invalid.map((r) => (
              <li key={r.line} className="flex justify-between gap-2">
                <span className="truncate">
                  Line {r.line}: {r.value || '(empty)'}
                </span>
                <span className="shrink-0 text-muted-foreground">{r.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button type="button" variant="ghost" className="w-full" onClick={onReset}>
        Import another file
      </Button>
    </div>
  );
}

/** Import tab: read the file in the browser, parse + create rows on the server. */
function ImportTab() {
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setSummary(null);
    setError(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    setSummary(null);
    setFileName(file?.name ?? null);
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      setError('That file is too large. Keep it under 1 MB.');
      return;
    }
    const text = await file.text();
    start(async () => {
      const res = await importClientsCsvAction(text);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setSummary(res);
    });
  }

  if (summary) return <ImportSummaryView summary={summary} onReset={reset} />;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Import from CSV</p>
        <p className="text-sm text-muted-foreground">
          One client per row, with an <span className="font-mono">email</span> column (a{' '}
          <span className="font-mono">goals</span> column is optional). Up to 500 rows.
        </p>
      </div>
      <Label
        htmlFor="csv-file"
        className={cn(
          'flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 text-sm font-medium',
          'hover:bg-muted',
          pending && 'pointer-events-none opacity-50',
        )}
      >
        <Upload className="size-4" aria-hidden />
        {pending ? 'Importing…' : (fileName ?? 'Choose a CSV file')}
      </Label>
      <input
        ref={inputRef}
        id="csv-file"
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        disabled={pending}
        onChange={onFile}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

export function InviteDialog({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);

  // The UI gallery/axe pass reaches this screen's "invite-dialog" state via ?state=invite-dialog
  // (tests/e2e/ui-routes.ts). Read it on the client so there's no prerender/session coupling; defer
  // the open to a frame so it's not a synchronous setState in the effect body.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wantsOpen = new URLSearchParams(window.location.search).get('state') === 'invite-dialog';
    if (!wantsOpen) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('w-full sm:w-auto', triggerClassName)}
        >
          <UserPlus />
          Invite client
        </Button>
      </DialogTrigger>
      <DialogContent
        // Remount the tabs each time the dialog opens so every tab starts fresh.
        key={open ? 'open' : 'closed'}
      >
        <DialogHeader>
          <DialogTitle>Invite a client</DialogTitle>
          <DialogDescription>
            Share a link, email an invite, or import a list. Each client sets up their own login.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="link">
          <TabsList className="w-full">
            <TabsTrigger value="link">
              <Link2 aria-hidden />
              Copy link
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail aria-hidden />
              Email
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload aria-hidden />
              Import
            </TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="pt-4">
            <LinkTab />
          </TabsContent>
          <TabsContent value="email" className="pt-4">
            <EmailTab />
          </TabsContent>
          <TabsContent value="import" className="pt-4">
            <ImportTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
