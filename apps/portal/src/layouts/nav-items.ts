import type { LucideIcon } from 'lucide-react'
import { AppWindow, FileText, Home, Receipt, Settings, Users } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Exact match for the root route; prefix match elsewhere. */
  end?: boolean
  adminOnly?: boolean
  /** Extra route prefixes that belong to this section (page title and active state). */
  aliases?: string[]
}

/** Single source of truth for the rail, the drawer, the bottom bar and page titles (blueprint §31, Tenant Admin). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/applications', label: 'Applications', icon: AppWindow },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
  { to: '/subscription', label: 'Subscriptions', icon: Receipt, adminOnly: true },
  { to: '/billing', label: 'Billing', icon: FileText, adminOnly: true, aliases: ['/payments'] },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/** Phone bottom bar slots around the round support action: Home · Applications · [action] · Billing · Menu. */
export const BOTTOM_BAR_LEFT: NavItem[] = [NAV_ITEMS[0]!, NAV_ITEMS[1]!]
export const BOTTOM_BAR_RIGHT: NavItem[] = [NAV_ITEMS[4]!]

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to
  return [item.to, ...(item.aliases ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function pageTitle(pathname: string): string {
  return NAV_ITEMS.find((i) => isActive(i, pathname))?.label ?? 'Portal'
}
