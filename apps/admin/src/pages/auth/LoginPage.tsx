import { Button, Input, Label } from '@scp/ui'
import { ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/auth'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = React.useState('admin@platform.example')
  const [password, setPassword] = React.useState('demo')
  const [error, setError] = React.useState<string | null>(null)

  if (user) return <Navigate to="/" replace />

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = login(email)
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
          <p className="text-muted text-center text-xs">
            Demo: admin@platform.example · any password
          </p>
        </form>
      </div>
    </div>
  )
}
