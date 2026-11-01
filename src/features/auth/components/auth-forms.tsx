'use client';

import { useActionState, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
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

// Live password hint: neutral before the first blur, then valid/invalid.
function PasswordField({ id = 'password' }: { id?: string }) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const ok = value.length >= 8;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Password</Label>
      <PasswordInput
        id={id}
        name="password"
        autoComplete="new-password"
        required
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
      />
      <p
        className={cn(
          'flex items-center gap-1 text-xs',
          !touched
            ? 'text-muted-foreground'
            : ok
              ? 'text-success-soft-foreground'
              : 'text-destructive dark:text-destructive-soft-foreground',
        )}
      >
        {touched && ok && <Check className="size-3.5" aria-hidden />}
        At least 8 characters.
      </p>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state?.values?.email}
          required
        />
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
        <Label htmlFor="ml-email">Email for a sign-in link</Label>
        <Input id="ml-email" name="email" type="email" autoComplete="email" required />
      </div>
      <FormError message={state?.error} />
      <Button type="submit" variant="outline" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Email me a sign-in link'}
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
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={state?.values?.fullName}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state?.values?.email}
          required
        />
      </div>
      <PasswordField />
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

export function InviteForm({
  token,
  email,
  coachName,
}: {
  token: string;
  email: string;
  coachName: string;
}) {
  const bound = acceptInviteAction.bind(null, token);
  const [state, action, pending] = useActionState<FormState, FormData>(bound, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="inv-email">Email</Label>
        <Input id="inv-email" value={email} readOnly />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fullName">Your name</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={state?.values?.fullName}
          required
        />
      </div>
      <PasswordField />
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Joining…' : `Join ${coachName}`}
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
