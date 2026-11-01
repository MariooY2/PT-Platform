'use client';

import { useActionState, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { checkSlugAction } from '@/features/auth/actions';
import { completeOnboardingAction, type OnboardingState } from '../actions';

const BRAND_COLORS = ['#1F4FD1', '#0F8A7E', '#C77700', '#7048E8', '#B45309', '#13795B'];

export function OnboardingWizard({ initialStep = 1 }: { initialStep?: number }) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 3));
  const [slug, setSlug] = useState('');
  const [brandColor, setBrandColor] = useState(BRAND_COLORS[0]);
  const [slugState, setSlugState] = useState<{
    available?: boolean;
    message?: string;
    suggestion?: string;
  }>({});
  const [checking, startCheck] = useTransition();
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    completeOnboardingAction,
    undefined,
  );

  function onSlugBlur() {
    if (!slug) return;
    startCheck(async () => setSlugState(await checkSlugAction(slug)));
  }

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Step {step} of 3</p>
        <div className="flex gap-1.5" aria-hidden>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={cn('h-1.5 flex-1 rounded-full', n <= step ? 'bg-primary' : 'bg-muted')}
            />
          ))}
        </div>
      </div>

      {/* All fields stay mounted so their values post together; steps just show/hide. */}
      <div className={cn('space-y-4', step !== 1 && 'hidden')}>
        <h2 className="text-lg font-semibold">Your business</h2>
        <div className="grid gap-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" name="businessName" required={step === 1} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">Storefront address</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">yourapp.com/c/</span>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              onBlur={onSlugBlur}
              aria-invalid={slugState.available === false}
            />
          </div>
          {checking && <p className="text-xs text-muted-foreground">Checking availability…</p>}
          {!checking && slugState.available === true && (
            <p className="text-xs text-success-soft-foreground">That address is available.</p>
          )}
          {!checking && slugState.available === false && (
            <p className="text-xs text-destructive dark:text-destructive-soft-foreground">
              {slugState.message}
              {slugState.suggestion && (
                <>
                  {' '}
                  Try{' '}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => {
                      setSlug(slugState.suggestion!);
                      setSlugState({ available: true });
                    }}
                  >
                    {slugState.suggestion}
                  </button>
                  .
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className={cn('space-y-4', step !== 2 && 'hidden')}>
        <h2 className="text-lg font-semibold">Your look</h2>
        <div className="grid gap-2">
          <Label>Brand color</Label>
          <input type="hidden" name="brandColor" value={brandColor} />
          <div className="flex flex-wrap gap-2">
            {BRAND_COLORS.map((c, i) => (
              <button
                key={c}
                type="button"
                aria-label={`Brand color option ${i + 1}`}
                aria-pressed={brandColor === c}
                onClick={() => setBrandColor(c)}
                style={{ backgroundColor: c }}
                className={cn(
                  'size-11 rounded-full border-2',
                  brandColor === c ? 'border-foreground' : 'border-transparent',
                )}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">Short bio (optional)</Label>
          <Textarea id="bio" name="bio" rows={3} />
        </div>
      </div>

      <div className={cn('space-y-4', step !== 3 && 'hidden')}>
        <h2 className="text-lg font-semibold">Your money</h2>
        <div className="grid gap-2">
          <Label htmlFor="currency">Default currency</Label>
          <Select name="currency" defaultValue="USD">
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="LBP">LBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="payoutPhone">Whish phone for payouts (optional)</Label>
          <Input id="payoutPhone" name="payoutPhone" type="tel" inputMode="tel" />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive dark:text-destructive-soft-foreground" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        {step < 3 ? (
          <Button
            key="continue"
            type="button"
            className="w-full sm:w-auto"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 && (!slug || slugState.available === false)}
          >
            Continue
          </Button>
        ) : (
          <Button
            key="finish"
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={pending}
          >
            {pending && <Loader2 className="animate-spin" />}
            {pending ? 'Finishing…' : 'Finish setup'}
          </Button>
        )}
      </div>
      {step === 2 && (
        <Button type="button" variant="ghost" className="mx-auto w-full" onClick={() => setStep(3)}>
          Skip for now
        </Button>
      )}
    </form>
  );
}
