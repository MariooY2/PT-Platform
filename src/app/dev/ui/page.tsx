import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';
import { devUiEnabled } from '@/lib/dev';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/page-header';
import { StatusChip } from '@/components/shared/status-chip';
import { EmptyState, ListSkeleton } from '@/components/shared/states';
import { Money, Weight, Reps, Duration, RelativeDate } from '@/components/format';
import { GalleryInteractive, ThemeToggle } from './gallery-interactive';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className={`flex min-h-16 flex-col justify-end rounded-lg border p-2 ${className}`}>
      <span className="text-xs font-medium">{name}</span>
    </div>
  );
}

const PAIRS = [
  ['background', 'bg-background text-foreground'],
  ['card', 'bg-card text-card-foreground'],
  ['popover', 'bg-popover text-popover-foreground'],
  ['primary', 'bg-primary text-primary-foreground'],
  ['secondary', 'bg-secondary text-secondary-foreground'],
  ['muted', 'bg-muted text-muted-foreground'],
  ['accent', 'bg-accent text-accent-foreground'],
  ['destructive', 'bg-destructive text-destructive-foreground'],
  ['destructive-soft', 'bg-destructive-soft text-destructive-soft-foreground'],
  ['success', 'bg-success text-success-foreground'],
  ['success-soft', 'bg-success-soft text-success-soft-foreground'],
  ['warning', 'bg-warning text-warning-foreground'],
  ['warning-soft', 'bg-warning-soft text-warning-soft-foreground'],
  ['pr', 'bg-pr text-pr-foreground'],
  ['pr-soft', 'bg-pr-soft text-pr-soft-foreground'],
] as const;

const CHARTS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
const BUTTON_VARIANTS = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
] as const;

// A dev-only, request-time route (reads the env guard); never prerendered. (Next cacheComponents)
export const instant = false;

// Computed once at module load (not during render) for the RelativeDate demo.
const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000);

export default async function DevUiPage() {
  // Force dynamic rendering so the env-based guard is read per request, not inlined at build.
  await connection();
  if (!devUiEnabled()) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-12 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="UI gallery"
        description="Design system tokens and components (chalk and iron). Toggle the theme to check both."
        action={<ThemeToggle />}
      />

      <Section title="Colors">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PAIRS.map(([name, cls]) => (
            <Swatch key={name} name={name} className={cls} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {CHARTS.map((c) => (
            <div key={c} className={`size-10 rounded-md ${c}`} title={c} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="rounded-md border border-border px-3 py-1">border</span>
          <span className="rounded-md border-2 border-input px-3 py-1">input</span>
          <span className="rounded-md border border-border px-3 py-1 outline-2 outline-offset-2 outline-ring">
            ring
          </span>
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-2">
          <p className="num-xl">142.5</p>
          <p className="num-lg">1,248</p>
          <p>
            Inline number <span className="num">62.5</span> in a sentence.
          </p>
          <h1 className="text-2xl font-bold">Page title (text-2xl)</h1>
          <h2 className="text-lg font-semibold">Section title (text-lg)</h2>
          <p className="text-base">Body text (text-base), the minimum for inputs.</p>
          <p className="text-sm">Secondary text (text-sm).</p>
          <p className="text-xs text-muted-foreground">Caption and units (text-xs).</p>
          <p className="num-xl" data-testid="tnum-zeros">
            000
          </p>
          <p className="num-xl" data-testid="tnum-ones">
            111
          </p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          {BUTTON_VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
          <Button disabled>
            <Loader2 className="animate-spin" />
            Saving…
          </Button>
        </div>
      </Section>

      <Section title="Form controls">
        {/* Form controls sit on a card surface (border-input meets 3:1 vs card; see D-012). */}
        <div className="grid max-w-md gap-4 rounded-xl border bg-card p-4">
          <div className="grid gap-2">
            <Label htmlFor="g-name">Client name</Label>
            <Input id="g-name" placeholder="e.g. Rami" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-err">Weight (kg)</Label>
            <Input
              id="g-err"
              defaultValue="999"
              aria-invalid
              inputMode="decimal"
              aria-describedby="g-err-msg"
            />
            <p
              id="g-err-msg"
              className="text-sm text-destructive dark:text-destructive-soft-foreground"
            >
              Enter a weight between 0 and 500 kg.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-disabled">Disabled</Label>
            <Input id="g-disabled" placeholder="Disabled" disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-select">Plan</Label>
            <Select>
              <SelectTrigger id="g-select">
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="g-check" defaultChecked />
            <Label htmlFor="g-check">Include chat</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="g-switch" defaultChecked />
            <Label htmlFor="g-switch">Storefront published</Label>
          </div>
        </div>
      </Section>

      <Section title="Status chips">
        <div className="flex flex-wrap gap-2">
          <StatusChip tone="success">Active</StatusChip>
          <StatusChip tone="success">Paid</StatusChip>
          <StatusChip tone="neutral">Paused</StatusChip>
          <StatusChip tone="warning">Overdue</StatusChip>
          <StatusChip tone="warning">Past due</StatusChip>
          <StatusChip tone="destructive">Failed</StatusChip>
          <StatusChip tone="info">Invited</StatusChip>
          <StatusChip tone="neutral">Archived</StatusChip>
          <StatusChip tone="pr">New PR</StatusChip>
        </div>
      </Section>

      <Section title="Numbers, money and dates">
        <div className="flex flex-wrap items-center gap-6">
          <Money amount={49} />
          <Money amount={49.5} />
          <Money amount={1_500_000} currency="LBP" />
          <Weight kg={62.5} />
          <Reps reps={8} />
          <Duration seconds={90} />
          <RelativeDate date={TWO_HOURS_AGO} />
          <RelativeDate date="2026-11-03T00:00:00.000Z" absolute />
        </div>
      </Section>

      <Section title="Data states">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Loading</p>
            <ListSkeleton rows={3} />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Empty</p>
            <EmptyState
              title="No clients yet"
              description="Invite your first client to start tracking their training."
              action={<Button>Invite client</Button>}
            />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">No results</p>
            <EmptyState
              icon={Search}
              title="No clients match these filters"
              action={<Button variant="outline">Clear filters</Button>}
            />
          </div>
        </div>
      </Section>

      <Separator />

      <Section title="Overlays and feedback">
        <GalleryInteractive />
      </Section>
    </main>
  );
}
