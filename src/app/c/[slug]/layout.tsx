import type { ReactNode } from 'react';

// Public storefront frame: no app chrome (docs/ui/screens/storefront.md).
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
