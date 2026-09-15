import { avatarColor, initials } from '@scp/fixtures'
import { Avatar, Button, Input, Label } from '@scp/ui'
import { ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../auth/auth'
import { useAppState } from '../../state/app-state'

export function LoginPage() {
  const { user, login } = useAuth()
  const { state } = useAppState()
  const location = useLocation()
  const [email, setEmail] = React.useState('admin@platform.example')
  const [password, setPassword] = React.useState('demo')
  const [error, setError] = React.useState<string | null>(null)
  const admins = state.users.filter((u) => u.platformAdmin && u.status === 'active')
  /** Where RequireAuth sent the visitor from, so sign-in returns them there. */
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (user) return <Navigate to={from} replace />

  function signIn(address: string) {
    const res = login(address)
    if (!res.ok) setError(res.error)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    signIn(email)
  }

  return (
    <div className="bg-surface flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="bg-ink shadow-float flex size-11 items-center justify-center rounded-2xl text-white">
            <ShieldCheck className="size-5" />
          </span>
          <span className="text-sm font-bold">SaaS Gate</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Platform Admin<span className="text-accent">.</span>
        </h1>
        <p className="text-muted mt-1 text-sm">
          Manage organizations, subscriptions and application access from one place.
        </p>
        <form onSubmit={submit} className="rounded-card bg-card shadow-card mt-8 space-y-4 p-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="[&_input]:h-12"
              autoComplete="username"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="[&_input]:h-12"
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-danger text-xs">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full">
            Sign in
          </Button>
          <p className="text-muted text-center text-xs">Demo accounts · any password</p>
        </form>
        <div className="mt-4 space-y-2">
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
            Quick login
          </p>
          {admins.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => signIn(a.email)}
              className="bg-card shadow-card hover:bg-surface flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98]"
            >
              <Avatar initials={initials(a.name)} color={avatarColor(a.id)} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{a.name}</span>
                <span className="text-muted block truncate text-xs">{a.email}</span>
              </span>
              <span className="text-accent text-xs font-semibold">Sign in</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
