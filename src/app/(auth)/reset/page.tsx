import { ResetForm } from '@/features/auth/components/auth-forms';

export const instant = false;

export default function ResetPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          We’ll email you a link to set a new password.
        </p>
      </div>
      <ResetForm />
      <p className="text-center text-sm">
        <a href="/login" className="text-primary">
          Back to sign in
        </a>
      </p>
    </div>
  );
}
