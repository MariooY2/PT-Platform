import {
  Activity,
  Banknote,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  MoreHorizontal,
  Receipt,
  Settings,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';

// `matches` lets a tab (e.g. "More") show as current on its child routes that have no tab of their own.
export type NavItem = { href: string; label: string; icon: LucideIcon; matches?: string[] };
export type NavGroup = { title: string | null; items: NavItem[] };

// Labels and groupings are fixed by docs/ui/patterns.md — changes need a decision entry.
export const COACH_BOTTOM: NavItem[] = [
  { href: '/coach', label: 'Today', icon: LayoutDashboard },
  { href: '/coach/clients', label: 'Clients', icon: Users },
  { href: '/coach/checkins', label: 'Check-ins', icon: ClipboardCheck },
  { href: '/coach/messages', label: 'Messages', icon: MessageSquare },
  {
    href: '/coach/more',
    label: 'More',
    icon: MoreHorizontal,
    matches: [
      '/coach/programs',
      '/coach/exercises',
      '/coach/forms',
      '/coach/products',
      '/coach/orders',
      '/coach/earnings',
      '/coach/settings',
    ],
  },
];

export const COACH_SIDEBAR: NavGroup[] = [
  {
    title: 'Coaching',
    items: [
      { href: '/coach', label: 'Today', icon: LayoutDashboard },
      { href: '/coach/clients', label: 'Clients', icon: Users },
      { href: '/coach/checkins', label: 'Check-ins', icon: ClipboardCheck },
      { href: '/coach/messages', label: 'Messages', icon: MessageSquare },
    ],
  },
  {
    title: 'Library',
    items: [
      { href: '/coach/programs', label: 'Programs', icon: Dumbbell },
      { href: '/coach/exercises', label: 'Exercises', icon: Activity },
      { href: '/coach/forms', label: 'Forms', icon: FileText },
    ],
  },
  {
    title: 'Store',
    items: [
      { href: '/coach/products', label: 'Products', icon: Tag },
      { href: '/coach/orders', label: 'Orders', icon: Receipt },
      { href: '/coach/earnings', label: 'Earnings', icon: Banknote },
    ],
  },
  { title: null, items: [{ href: '/coach/settings', label: 'Settings', icon: Settings }] },
];

// Coach "More" (mobile) collects everything not in the bottom bar.
export const COACH_MORE: NavItem[] = [
  { href: '/coach/programs', label: 'Programs', icon: Dumbbell },
  { href: '/coach/exercises', label: 'Exercises', icon: Activity },
  { href: '/coach/forms', label: 'Forms', icon: FileText },
  { href: '/coach/products', label: 'Products', icon: Tag },
  { href: '/coach/orders', label: 'Orders', icon: Receipt },
  { href: '/coach/earnings', label: 'Earnings', icon: Banknote },
  { href: '/coach/settings', label: 'Settings', icon: Settings },
];

export const CLIENT_BOTTOM: NavItem[] = [
  { href: '/client', label: 'Today', icon: LayoutDashboard },
  { href: '/client/progress', label: 'Progress', icon: TrendingUp },
  { href: '/client/messages', label: 'Messages', icon: MessageSquare },
  {
    href: '/client/more',
    label: 'More',
    icon: MoreHorizontal,
    matches: ['/client/checkins', '/client/billing', '/client/settings'],
  },
];

// Client "More": check-ins, billing, settings.
export const CLIENT_MORE: NavItem[] = [
  { href: '/client/checkins', label: 'Check-ins', icon: ClipboardCheck },
  { href: '/client/billing', label: 'Billing', icon: CreditCard },
  { href: '/client/settings', label: 'Settings', icon: Settings },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Trainers', icon: Users },
  { href: '/admin/orders', label: 'Orders', icon: Receipt },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export const ADMIN_SIDEBAR: NavGroup[] = [{ title: null, items: ADMIN_ITEMS }];

// Admin mobile is "usable, not optimised" (patterns.md): the same destinations as a bottom bar (D-017).
export const ADMIN_BOTTOM: NavItem[] = ADMIN_ITEMS;

// A serializable variant is what crosses the server→client boundary; the islands look the rest up
// here so no icon (a function) is ever passed as a prop from a Server Component.
export type NavVariant = 'coach' | 'client' | 'admin';
export const NAV_LABEL: Record<NavVariant, string> = {
  coach: 'Coach',
  client: 'Client',
  admin: 'Admin',
};
export const BOTTOM_NAV: Record<NavVariant, NavItem[]> = {
  coach: COACH_BOTTOM,
  client: CLIENT_BOTTOM,
  admin: ADMIN_BOTTOM,
};
export const SIDEBAR_NAV: Partial<Record<NavVariant, NavGroup[]>> = {
  coach: COACH_SIDEBAR,
  admin: ADMIN_SIDEBAR,
};
// Client stays phone-shaped (single column ≤ 560 px); coach/admin are full width.
export const PHONE_SHAPED: Record<NavVariant, boolean> = {
  coach: false,
  client: true,
  admin: false,
};

const ROOTS = new Set(['/coach', '/client', '/admin']);
export function isActive(pathname: string, item: NavItem | string): boolean {
  const href = typeof item === 'string' ? item : item.href;
  if (pathname === href) return true;
  if (
    typeof item !== 'string' &&
    item.matches?.some((m) => pathname === m || pathname.startsWith(`${m}/`))
  ) {
    return true;
  }
  if (ROOTS.has(href)) return false; // index links match only exactly
  return pathname.startsWith(`${href}/`);
}
