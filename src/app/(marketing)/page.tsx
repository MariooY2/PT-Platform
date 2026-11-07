import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wordmark } from '@/components/shared/brand';

export const metadata = {
  title: 'PT Platform — coaching, without the admin',
  description:
    'Track training, deliver programs, and sell them — in one place built for personal trainers in Lebanon. Get paid with Whish.',
};

const VALUE_PROPS: { edge: 'primary' | 'success' | 'pr'; title: string; body: string }[] = [
  {
    edge: 'primary',
    title: 'Track every client',
    body: "See who trained, who's slipping, and who hit a personal record — the moment it happens.",
  },
  {
    edge: 'success',
    title: 'Deliver programs',
    body: 'Build a program once, assign it to every client, and they log each set on their phone — even offline.',
  },
  {
    edge: 'pr',
    title: 'Sell your programs',
    body: 'Publish a storefront and take payment with Whish. Cash and transfers, tracked in one ledger.',
  },
];

const STATS: { value: string; unit: string; label: string }[] = [
  { value: '3', unit: 'taps', label: 'to log a set, even offline' },
  { value: '1', unit: 'place', label: 'clients, programs and payments' },
  { value: '100', unit: '% yours', label: 'your clients, your brand' },
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </header>

      {/* Hero — open with the thing a coach lives for: a PR, stencilled big. */}
      <section className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            For personal trainers in Lebanon
          </p>
          <h1 className="mt-3 text-4xl font-bold text-balance sm:text-5xl">
            Coach more clients, without the admin.
          </h1>
          <p className="mt-5 max-w-prose text-lg text-muted-foreground">
            Track training, deliver programs, and sell them — all in one place. Your clients log
            every set on their phone; you get paid with Whish.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Start coaching free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <Card edge="pr" className="justify-self-center border-l-[6px] border-l-pr p-6 sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-pr-soft px-3 py-1 text-xs font-bold text-pr-soft-foreground">
            <span className="size-2 rounded-full bg-pr" aria-hidden />
            New personal record
          </p>
          <p className="mt-4 num-hero">
            142.5<span className="ml-2 align-top text-2xl font-bold text-muted-foreground">kg</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Maya · Deadlift · up 5 kg on her best
          </p>
        </Card>
      </section>

      {/* Value props */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {VALUE_PROPS.map((p) => (
            <Card key={p.title} edge={p.edge} className="p-5">
              <h2 className="text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Stat band */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
        <dl className="grid gap-8 border-t pt-8 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label}>
              <dd className="num-xl">
                {s.value}
                <span className="ml-1 text-xl font-bold text-muted-foreground">{s.unit}</span>
              </dd>
              <dt className="mt-1 text-sm text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <Wordmark textClassName="text-lg" />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Built for coaches in Lebanon.</span>
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
