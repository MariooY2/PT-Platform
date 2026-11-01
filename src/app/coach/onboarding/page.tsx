import { OnboardingWizard } from '@/features/onboarding/components/onboarding-wizard';

export const instant = false;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { step } = await searchParams;
  const initialStep = Number(step) || 1;
  return (
    <main className="mx-auto w-full max-w-[480px] p-6">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold">Set up your coaching</h1>
        <p className="text-sm text-muted-foreground">A few details and you’re ready.</p>
      </div>
      <OnboardingWizard initialStep={initialStep} />
    </main>
  );
}
