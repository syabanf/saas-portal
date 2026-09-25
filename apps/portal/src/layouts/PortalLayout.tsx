import { avatarColor, initials } from '@scp/fixtures'
import { useT } from '@scp/i18n'
import {
  Avatar,
  BottomBar,
  BottomBarAction,
  BottomBarItem,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Rail,
  RailAction,
  RailItem,
  RailWorkspace,
  MobileMenu,
  MobileMenuGroup,
  MobileMenuItem,
  TableDensityProvider,
} from '@scp/ui'
import {
  ArrowLeft,
  Bell,
  Building2,
  Check,
  LifeBuoy,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import * as React from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth, useCurrentUser } from '../auth/auth'
import { SupportSheet } from '../components/SupportSheet'
import { PortalActionCenter } from '../components/PortalActionCenter'
import { PortalCommandPalette } from '../components/PortalCommandPalette'
import { useDocumentTitle } from '../lib/document-title'
import { useAppState, useScoped } from '../state/app-state'
import { usePrefs } from '../state/prefs'
import {
  BOTTOM_BAR_LEFT,
  BOTTOM_BAR_RIGHT,
  NAV_ITEMS,
  isActive,
  pageTitleKey,
  type NavItem,
} from './nav-items'
import { PortalSheetsContext } from './portal-sheets'

const RAIL_KEY = 'scp.portal.rail'

function readRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === 'expanded'
  } catch {
    return false
  }
}

function Wordmark({ expanded }: { expanded: boolean }) {
  const t = useT()
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-white/5 text-white">
        <ShieldCheck className="size-5" />
      </span>
      {expanded ? (
        <span className="leading-tight">
          <span className="block text-sm font-bold">
            SaaS Gate<span className="text-accent">.</span>
          </span>
          <span className="text-on-ink-muted block text-[10.5px] font-semibold">
            {t('nav.portal')}
          </span>
        </span>
      ) : null}
    </Link>
  )
}

function useNavItems(): NavItem[] {
  const { member } = useAuth()
  const admin = member?.workspaceRole === 'workspace_admin'
  return NAV_ITEMS.filter((i) => !i.adminOnly || admin)
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT()
  const { pathname } = useLocation()
  const items = useNavItems()
  return (
    <>
      {items.map((item) => (
        <RailItem
          key={item.to}
          icon={<item.icon />}
          label={t(item.labelKey)}
          active={isActive(item, pathname)}
          render={(p) => (
            <Link to={item.to} onClick={onNavigate} {...p}>
              {p.children}
            </Link>
          )}
        />
      ))}
    </>
  )
}

function WorkspaceMenu({ children }: { children: React.ReactNode }) {
  const t = useT()
  const { tenant, tenants, switchTenant, logout } = useAuth()
  const { resetDemo } = useAppState()
  const user = useCurrentUser()
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuLabel>{t('nav.signedInAs')}</DropdownMenuLabel>
        <div className="px-3 pb-2 text-sm">
          <p className="font-semibold">{user.name}</p>
          <p className="text-muted text-xs">{user.email}</p>
        </div>
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <UserRound /> {t('nav.profile')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('nav.organization')}</DropdownMenuLabel>
        {tenants.map((item) => (
          <DropdownMenuItem key={item.id} onSelect={() => switchTenant(item.id)}>
            <Building2 />
            <span className="flex-1 truncate">{item.name}</span>
            {item.id === tenant?.id ? <Check className="text-foreground" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={resetDemo}>
          <RotateCcw /> {t('nav.resetDemo')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={() => void logout()}>
          <LogOut /> {t('common.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const searchPill =
  '[&_input]:h-11 [&_input]:rounded-full [&_input]:border-0 [&_input]:bg-card [&_input]:shadow-card'

export function PortalLayout() {
  const t = useT()
  const [expanded, setExpanded] = React.useState(readRail)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const navItems = useNavItems()
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [actionOpen, setActionOpen] = React.useState(false)
  const [supportOpen, setSupportOpen] = React.useState(false)
  const location = useLocation()
  const { pathname } = location
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { tenant, member } = useAuth()
  const { prefs } = usePrefs()
  const isAdmin = member?.workspaceRole === 'workspace_admin'
  const { subscriptions } = useScoped()
  const attention = subscriptions.filter(
    (s) => s.status === 'past_due' || s.status === 'grace_period' || s.status === 'suspended',
  ).length
  const title = t(pageTitleKey(pathname))
  const sheets = React.useMemo(() => ({ openSupport: () => setSupportOpen(true) }), [])
  useDocumentTitle(title)

  function fallbackRoute(): string {
    if (/^\/billing\/[^/]+\/pay$/.test(pathname)) return pathname.replace(/\/pay$/, '')
    if (/^\/billing\/[^/]+$/.test(pathname)) return '/billing'
    if (/^\/payments\/[^/]+$/.test(pathname)) return '/billing'
    return '/'
  }

  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate(fallbackRoute())
  }

  function toggleRail() {
    setExpanded((e) => {
      try {
        localStorage.setItem(RAIL_KEY, e ? 'collapsed' : 'expanded')
      } catch {
        /* ignore */
      }
      return !e
    })
  }

  React.useEffect(() => {
    function openCommand(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', openCommand)
    return () => window.removeEventListener('keydown', openCommand)
  }, [])

  const bottomItem = (item: NavItem) => (
    <BottomBarItem
      key={item.to}
      icon={<item.icon />}
      label={t(item.labelKey)}
      active={isActive(item, pathname)}
      render={(p) => (
        <Link to={item.to} className={p.className} aria-current={p['aria-current']}>
          {p.children}
        </Link>
      )}
    />
  )

  return (
    <PortalSheetsContext.Provider value={sheets}>
      <div className="bg-surface relative flex h-dvh gap-4 overflow-hidden p-3 lg:p-4">
        <a
          href="#main-content"
          className="bg-ink text-on-ink focus:ring-accent fixed top-2 left-2 z-[120] -translate-y-20 rounded-full px-4 py-3 font-semibold transition-transform focus:translate-y-0 focus:ring-2 focus:outline-none"
        >
          {t('nav.skipToMain')}
        </a>
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {t('nav.pageStatus', { title })}
        </span>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[30%] -right-[8%] h-[120%] w-[70%] opacity-70 blur-xl"
          style={{
            background:
              'radial-gradient(40% 40% at 60% 30%, color-mix(in srgb, var(--color-accent) 9%, transparent) 0%, transparent 70%), radial-gradient(30% 30% at 85% 60%, color-mix(in srgb, var(--color-accent) 7%, transparent) 0%, transparent 70%), radial-gradient(25% 25% at 40% 70%, rgb(255 205 210 / 0.35) 0%, transparent 70%)',
          }}
        />

        <div className="hidden shrink-0 md:block">
          <Rail
            expanded={expanded}
            onToggle={toggleRail}
            header={<Wordmark expanded={expanded} />}
            action={
              <RailAction label={t('common.contactSupport')} onClick={() => setSupportOpen(true)}>
                <LifeBuoy />
              </RailAction>
            }
            workspace={
              <WorkspaceMenu>
                <RailWorkspace
                  icon={<Building2 />}
                  kicker={t('nav.organization')}
                  name={tenant?.name ?? t('nav.noOrganization')}
                />
              </WorkspaceMenu>
            }
          >
            <NavLinks />
          </Rail>
        </div>

        <MobileMenu open={drawerOpen} onOpenChange={setDrawerOpen} header={<Wordmark expanded />}>
          <MobileMenuGroup>
            {navItems.map((item) => (
              <MobileMenuItem
                key={item.to}
                icon={<item.icon />}
                label={t(item.labelKey)}
                active={isActive(item, pathname)}
                render={(p) => (
                  <Link to={item.to} onClick={() => setDrawerOpen(false)} {...p}>
                    {p.children}
                  </Link>
                )}
              />
            ))}
          </MobileMenuGroup>
        </MobileMenu>

        <div className="relative flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex h-14 shrink-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="bg-card shadow-card rounded-full md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('nav.openMenu')}
            >
              <Menu />
            </Button>
            {pathname !== '/' ? (
              <Button
                variant="ghost"
                size="sm"
                className="bg-card shadow-card"
                onClick={goBack}
                aria-label={t('nav.backToPrevious')}
              >
                <ArrowLeft /> {t('common.back')}
              </Button>
            ) : null}
            <div className="hidden min-w-0 md:block">
              <h2 className="truncate text-lg leading-tight font-bold">{title}</h2>
              <p className="text-muted truncate text-xs">
                {tenant?.name ?? t('common.saasPortal')}
              </p>
            </div>
            <div className="hidden min-w-0 flex-1 md:ml-6 md:block md:max-w-sm">
              <Input
                readOnly
                onFocus={() => setCommandOpen(true)}
                onClick={() => setCommandOpen(true)}
                placeholder={t('nav.searchWorkspace')}
                leftIcon={<Search />}
                className={searchPill}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="bg-card shadow-card rounded-full md:hidden"
                onClick={() => setCommandOpen(true)}
                aria-label={t('nav.search')}
              >
                <Search />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-card shadow-card relative rounded-full"
                onClick={() => setActionOpen(true)}
                aria-label={t('nav.openActionCenter')}
              >
                <Bell />
                {attention > 0 ? (
                  <span className="border-surface bg-accent text-on-ink absolute -top-1 -right-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 px-1 text-[10.5px] font-bold">
                    {attention}
                  </span>
                ) : null}
              </Button>
              <WorkspaceMenu>
                <button
                  type="button"
                  className="bg-card shadow-card flex h-11 items-center gap-2.5 rounded-full pr-3 pl-1.5"
                >
                  <Avatar initials={initials(user.name)} color={avatarColor(user.id)} size="md" />
                  <span className="hidden text-left leading-tight xl:block">
                    <span className="block text-sm font-semibold">{user.name}</span>
                    <span className="text-muted block text-[11px]">{user.email}</span>
                  </span>
                </button>
              </WorkspaceMenu>
            </div>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto pr-0.5 pb-24 focus:outline-none md:pb-2"
          >
            <TableDensityProvider density={prefs.compactTables ? 'compact' : 'comfortable'}>
              <Outlet />
            </TableDensityProvider>
          </main>
        </div>

        <BottomBar>
          {BOTTOM_BAR_LEFT.map(bottomItem)}
          <BottomBarAction label={t('common.contactSupport')} onClick={() => setSupportOpen(true)}>
            <LifeBuoy />
          </BottomBarAction>
          {BOTTOM_BAR_RIGHT.filter((item) => !item.adminOnly || isAdmin).map(bottomItem)}
          <BottomBarItem
            icon={<Menu />}
            label={t('nav.menu')}
            onClick={() => setDrawerOpen(true)}
          />
        </BottomBar>

        <SupportSheet open={supportOpen} onOpenChange={setSupportOpen} />
        <PortalCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        <PortalActionCenter open={actionOpen} onOpenChange={setActionOpen} />
      </div>
    </PortalSheetsContext.Provider>
  )
}
