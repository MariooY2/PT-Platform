import { SignupForm } from '@/features/auth/components/auth-forms';

export const instant = false;

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Create your coach account</h1>
        <p className="text-sm text-muted-foreground">Start coaching clients in minutes.</p>
      </div>
      <SignupForm />
    </div>
  );
}
