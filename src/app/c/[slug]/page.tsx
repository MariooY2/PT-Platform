import { connection } from 'next/server';
import { Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';

export const instant = false;

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const supabase = await createClient();

  // Only a published storefront is visible to visitors; everything else is indistinguishable
  // (RLS currently returns nothing to anon — a public trainer view arrives in Phase 2).
  const { data: trainer } = await supabase
    .from('trainers')
    .select('business_name, storefront_published')
    .eq('slug', slug)
    .maybeSingle();

  if (!trainer || !trainer.storefront_published) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center gap-2 p-6 text-center"
      >
        <h1 className="text-lg font-medium">This page isn’t available yet</h1>
        <p className="text-sm text-muted-foreground">
          The link may be wrong, or this coach hasn’t published their page.
        </p>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-[960px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-xl border bg-card p-6">
        <h1 className="text-2xl font-bold">{trainer.business_name}</h1>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Programs and coaching</h2>
        <EmptyState
          icon={Package}
          title="No offers yet"
          description="This coach hasn’t published any programs or coaching plans yet."
        />
      </section>
    </main>
  );
}
