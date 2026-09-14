import { dashboardKpis, initials, avatarColor } from '@scp/fixtures'
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
  RailGroup,
  RailItem,
  RailWorkspace,
  Sheet,
  SheetContent,
  SheetTitle,
  cn,
} from '@scp/ui'
import {
  ArrowLeft,
  Bell,
  ExternalLink,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import * as React from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth, useCurrentUser } from '../auth/auth'
import { useAppState } from '../state/app-state'
import { AdminActionCenter } from '../components/AdminActionCenter'
import { AdminCommandPalette } from '../components/AdminCommandPalette'
import { BOTTOM_BAR_ITEMS, NAV_SECTIONS, isActive, pageTitle } from './nav-items'

const RAIL_KEY = 'scp.admin.rail'
const PORTAL_URL = 'http://localhost:5174'

function readRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === 'expanded'
  } catch {
    return false
  }
}

function Wordmark({ expanded }: { expanded: boolean }) {
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
          <span className="text-on-ink-muted block text-[10.5px] font-semibold">Control plane</span>
        </span>
      ) : null}
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const { state } = useAppState()
  const kpis = dashboardKpis(state)
  return (
    <>
      {NAV_SECTIONS.map((section) => (
        <RailGroup key={section.label} label={section.label}>
          {section.items.map((item) => (
            <RailItem
              key={item.to}
              icon={<item.icon />}
              label={item.label}
              active={isActive(item, pathname)}
              badge={
                item.to === '/logs'
                  ? kpis.deniedToday
                  : item.to === '/webhooks'
                    ? kpis.failedWebhooks
                    : undefined
              }
              render={(p) => (
                <Link to={item.to} onClick={onNavigate} {...p}>
                  {p.children}
                </Link>
              )}
            />
          ))}
        </RailGroup>
      ))}
    </>
  )
}

function WorkspaceMenu({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const { resetDemo } = useAppState()
  const user = useCurrentUser()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-3 pb-2 text-sm">
          <p className="font-semibold">{user.name}</p>
          <p className="text-muted text-xs">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={PORTAL_URL} target="_blank" rel="noreferrer">
            <ExternalLink /> Open SaaS Portal
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={resetDemo}>
          <RotateCcw /> Reset demo data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={logout}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminLayout() {
  const [expanded, setExpanded] = React.useState(readRail)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [actionOpen, setActionOpen] = React.useState(false)
  const location = useLocation()
  const { pathname } = location
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { state } = useAppState()
  const { title, section } = pageTitle(pathname)
  const kpis = dashboardKpis(state)
  const attention = kpis.pastDueAccounts + kpis.failedWebhooks + kpis.integrationsOffline

  function fallbackRoute(): string {
    if (/^\/organizations\/(new|[^/]+)$/.test(pathname)) return '/organizations'
    if (/^\/applications\/[^/]+\/edit$/.test(pathname)) return pathname.replace(/\/edit$/, '')
    if (/^\/applications\/(new|[^/]+)$/.test(pathname)) return '/applications'
    if (/^\/subscriptions\/[^/]+$/.test(pathname)) return '/subscriptions'
    if (/^\/billing\/[^/]+$/.test(pathname)) return '/billing'
    if (/^\/payments\/[^/]+$/.test(pathname)) return '/payments'
    if (/^\/webhooks\/[^/]+$/.test(pathname)) return '/webhooks'
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

  return (
    <div className="bg-surface relative flex h-dvh gap-4 overflow-hidden p-3 lg:p-4">
      <a
        href="#main-content"
        className="bg-ink text-on-ink focus:ring-accent fixed top-2 left-2 z-[120] -translate-y-20 rounded-full px-4 py-3 font-semibold transition-transform focus:translate-y-0 focus:ring-2 focus:outline-none"
      >
        Skip to main content
      </a>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {title} page
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
            <RailAction label="Add organization" onClick={() => navigate('/organizations/new')}>
              <Plus />
            </RailAction>
          }
          workspace={
            <WorkspaceMenu>
              <RailWorkspace icon={<ShieldCheck />} kicker="Platform admin" name={user.name} />
            </WorkspaceMenu>
          }
        >
          <NavLinks />
        </Rail>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" hideClose className="bg-ink text-on-ink w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Rail
            expanded
            onToggle={() => setDrawerOpen(false)}
            header={<Wordmark expanded />}
            className="h-full w-full rounded-none shadow-none"
          >
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
          </Rail>
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex h-14 shrink-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="bg-card shadow-card rounded-full md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
          {pathname !== '/' ? (
            <Button
              variant="ghost"
              size="sm"
              className="bg-card shadow-card"
              onClick={goBack}
              aria-label="Back to previous page"
            >
              <ArrowLeft /> Back
            </Button>
          ) : null}
          <div className="hidden min-w-0 md:block">
            <h2 className="truncate text-lg leading-tight font-bold">{title}</h2>
            <p className="text-muted truncate text-xs">{section} · SaaS Control Plane</p>
          </div>
          <div className="hidden min-w-0 flex-1 md:ml-6 md:block md:max-w-sm">
            <Input
              readOnly
              onFocus={() => setCommandOpen(true)}
              onClick={() => setCommandOpen(true)}
              placeholder="Search everything…   ⌘K"
              leftIcon={<Search />}
              className="[&_input]:bg-card [&_input]:shadow-card [&_input]:h-11 [&_input]:rounded-full [&_input]:border-0"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-card shadow-card rounded-full md:hidden"
              onClick={() => setCommandOpen(true)}
              aria-label="Search"
            >
              <Search />
            </Button>
            <Button
              className="hidden sm:inline-flex"
              onClick={() => navigate('/organizations/new')}
            >
              <Plus /> New organization
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-card shadow-card relative rounded-full"
              onClick={() => setActionOpen(true)}
              aria-label="Needs attention"
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

        <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto pr-0.5 pb-24 focus:outline-none md:pb-2">
          <Outlet />
        </main>
      </div>

      <BottomBar>
        {BOTTOM_BAR_ITEMS.slice(0, 2).map((item) => (
          <BottomBarItem
            key={item.to}
            icon={<item.icon />}
            label={item.label}
            active={isActive(item, pathname)}
            badge={item.to === '/logs' ? kpis.deniedToday : undefined}
            render={(p) => (
              <Link to={item.to} className={cn(p.className)} aria-current={p['aria-current']}>
                {p.children}
              </Link>
            )}
          />
        ))}
        <BottomBarAction label="Add organization" onClick={() => navigate('/organizations/new')}>
          <Plus />
        </BottomBarAction>
        {BOTTOM_BAR_ITEMS.slice(2).map((item) => (
          <BottomBarItem
            key={item.to}
            icon={<item.icon />}
            label={item.label}
            active={isActive(item, pathname)}
            render={(p) => (
              <Link to={item.to} className={cn(p.className)}>
                {p.children}
              </Link>
            )}
          />
        ))}
        <BottomBarItem icon={<Menu />} label="Menu" onClick={() => setDrawerOpen(true)} />
      </BottomBar>
      <AdminCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <AdminActionCenter open={actionOpen} onOpenChange={setActionOpen} />
    </div>
  )
}
