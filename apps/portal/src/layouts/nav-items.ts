import type { DictKey } from '@scp/i18n'
import type { LucideIcon } from 'lucide-react'
import { AppWindow, FileText, Home, Receipt, Settings, Users } from 'lucide-react'

export interface NavItem {
  to: string
  labelKey: DictKey
  icon: LucideIcon
  /** Exact match for the root route; prefix match elsewhere. */
  end?: boolean
  adminOnly?: boolean
  /** Extra route prefixes that belong to this section (page title and active state). */
  aliases?: string[]
}

/** Single source of truth for the rail, the drawer, the bottom bar and page titles (blueprint §31, Tenant Admin). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/applications', labelKey: 'nav.applications', icon: AppWindow },
  { to: '/users', labelKey: 'nav.users', icon: Users, adminOnly: true },
  { to: '/subscription', labelKey: 'nav.subscriptions', icon: Receipt, adminOnly: true },
  {
    to: '/billing',
    labelKey: 'nav.billing',
    icon: FileText,
    adminOnly: true,
    aliases: ['/payments'],
  },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
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

/** Pages reachable from the avatar menu, not the rail. */
const UNLISTED_TITLES: Record<string, DictKey> = { '/profile': 'nav.profile' }

export function pageTitleKey(pathname: string): DictKey {
  return (
    UNLISTED_TITLES[pathname] ??
    NAV_ITEMS.find((i) => isActive(i, pathname))?.labelKey ??
    'nav.portal'
  )
}
