'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  acceptInviteAction,
  requestMagicLinkAction,
  requestPasswordResetAction,
  signInAction,
  signUpCoachAction,
  type FormState,
} from '../actions';
import { PasswordInput } from './password-input';

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive dark:text-destructive-soft-foreground" role="alert">
      {message}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <a href="/reset" className="text-sm text-primary">
            Forgot password?
          </a>
        </div>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </div>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New coach?{' '}
        <a href="/signup" className="text-primary">
          Create an account
        </a>
      </p>
    </form>
  );
}

export function MagicLinkForm() {
  const [state, action, pending] = useActionState(requestMagicLinkAction, undefined);
  if (state?.sent) {
    return (
      <p className="text-center text-sm text-muted-foreground" role="status">
        If that email has an account, a sign-in link is on its way.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="ml-email">Email</Label>
        <Input id="ml-email" name="email" type="email" autoComplete="email" required />
      </div>
      <FormError message={state?.error} />
      <Button type="submit" variant="outline" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Email me a sign-in link'}
      </Button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);
  if (state?.sent) {
    return (
      <p className="text-center text-sm text-muted-foreground" role="status">
        If that email has an account, a reset link is on its way.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input id="reset-email" name="email" type="email" autoComplete="email" required />
      </div>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Email me a reset link'}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    signUpCoachAction,
    undefined,
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="fullName">Your name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" required />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Create coach account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Joining a coach? Use the link they sent you.
      </p>
    </form>
  );
}

export function InviteForm({ token, email }: { token: string; email: string }) {
  const bound = acceptInviteAction.bind(null, token);
  const [state, action, pending] = useActionState<FormState, FormData>(bound, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="inv-email">Email</Label>
        <Input id="inv-email" value={email} readOnly disabled />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fullName">Your name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Create a password</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" required />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Joining…' : 'Join'}
      </Button>
    </form>
  );
}
