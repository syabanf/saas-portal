import { Button, Chip, Input, Label } from '@scp/ui'
import { ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/auth'

const DEMO_USERS = [
  {
    email: 'alpha.admin@example.com',
    name: 'Fahmi Syaban',
    org: 'PT Alpha',
    hint: 'workspace admin',
  },
  { email: 'alpha.operator@example.com', name: 'Reyza Pratama', org: 'PT Alpha', hint: 'member' },
  {
    email: 'beta.admin@example.com',
    name: 'Aditiya Nugraha',
    org: 'PT Beta',
    hint: 'grace period demo',
  },
  {
    email: 'gamma.admin@example.com',
    name: 'Bima Santoso',
    org: 'PT Gamma',
    hint: 'suspended demo',
  },
  {
    email: 'lambda.admin@example.com',
    name: 'Agus Setiawan',
    org: 'PT Lambda',
    hint: 'everything active',
  },
]

export function LoginPage() {
  const { session, user, login } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = React.useState(params.get('email') ?? DEMO_USERS[0]!.email)
  const [password, setPassword] = React.useState('demo')
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  if (session && user) return <Navigate to="/" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await login(email, params.get('tenant'))
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    navigate(from, { replace: true })
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
          SaaS Portal<span className="text-accent">.</span>
        </h1>
        <p className="text-muted mt-1 text-sm">
          One login for every application your organization uses.
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
              required
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
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Sign in
          </Button>
          <p className="text-muted text-center text-xs">Demo accounts · any password</p>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {DEMO_USERS.map((u) => (
            <Chip
              key={u.email}
              active={email === u.email}
              activeTone="ink"
              title={`${u.org} · ${u.hint}`}
              onClick={() => setEmail(u.email)}
            >
              {u.name}
              <span className="font-normal opacity-70">{u.org}</span>
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}
