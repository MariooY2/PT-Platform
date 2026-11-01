'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className={cn('pr-12', className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-1 -translate-y-1/2"
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </Button>
    </div>
  );
}
