import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AppWindow,
  Building2,
  CreditCard,
  FileText,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  Lock,
  MonitorSmartphone,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
  Code2,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Exact match for the root route; prefix match elsewhere. */
  end?: boolean
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/** Single source of truth for the rail, the drawer, the bottom bar and page titles (blueprint §31). */
export const NAV_SECTIONS: NavSection[] = [
  { label: 'Overview', items: [{ to: '/', label: 'Overview', icon: LayoutDashboard, end: true }] },
  {
    label: 'Workspace',
    items: [
      { to: '/organizations', label: 'Organizations', icon: Building2 },
      { to: '/users', label: 'Users', icon: Users },
      { to: '/applications', label: 'Products', icon: AppWindow },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { to: '/subscriptions', label: 'Subscriptions', icon: Receipt },
      { to: '/billing', label: 'Billing', icon: FileText },
      { to: '/payments', label: 'Payments', icon: CreditCard },
    ],
  },
  {
    label: 'Access',
    items: [
      { to: '/api-clients', label: 'API Clients', icon: KeyRound },
      { to: '/access-policies', label: 'Access Policies', icon: ShieldCheck },
      { to: '/sessions', label: 'Sessions', icon: MonitorSmartphone },
    ],
  },
  {
    label: 'Integration',
    items: [
      { to: '/webhooks', label: 'Webhooks', icon: Webhook },
      { to: '/sdk', label: 'SDK', icon: Code2 },
      { to: '/logs', label: 'Access Logs', icon: Activity },
      { to: '/health', label: 'Health', icon: HeartPulse },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/audit', label: 'Audit Log', icon: ScrollText },
      { to: '/security', label: 'Security', icon: Lock },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items)

/** Phone bottom bar slots (Home · Alerts · Add · Subscriptions · Organizations · Menu). */
export const BOTTOM_BAR_ITEMS: NavItem[] = [
  ALL_NAV_ITEMS[0]!,
  { to: '/logs', label: 'Access Logs', icon: Activity },
  { to: '/subscriptions', label: 'Subscriptions', icon: Receipt },
  { to: '/organizations', label: 'Organizations', icon: Building2 },
]

export function isActive(item: NavItem, pathname: string): boolean {
  return item.end
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** Pages reachable from the avatar menu, not the rail. */
const UNLISTED_PAGES: Record<string, { title: string; section: string }> = {
  '/profile': { title: 'Profile', section: 'Account' },
}

export function pageTitle(pathname: string): { title: string; section: string } {
  const unlisted = UNLISTED_PAGES[pathname]
  if (unlisted) return unlisted
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (isActive(item, pathname)) return { title: item.label, section: section.label }
    }
  }
  return { title: 'Platform Admin', section: 'SaaS Gate' }
}
