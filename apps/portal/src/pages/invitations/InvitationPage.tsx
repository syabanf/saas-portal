import { fmtDate } from '@scp/fixtures'
import { Button, Card, CardContent } from '@scp/ui'
import * as React from 'react'
import { Link, useParams } from 'react-router'
import { useAppState } from '../../state/app-state'
import { useAuth } from '../../auth/auth'

export function InvitationPage() {
  const { token = '' } = useParams()
  const { state, dispatch } = useAppState()
  const { user: signedInUser, logout } = useAuth()
  const [accepting, setAccepting] = React.useState(false)
  const [now, setNow] = React.useState(Date.now)
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const member = state.members.find((m) => m.invitationToken === token)
  const user = state.users.find((u) => u.id === member?.userId)
  const tenant = state.tenants.find((t) => t.id === member?.tenantId)
  const accepted = Boolean(member?.invitationAcceptedAt)
  const disabled = member?.status === 'disabled' || user?.status === 'disabled'
  const expired = Boolean(
    member && (!member.invitationExpiresAt || Date.parse(member.invitationExpiresAt) <= now),
  )
  const valid = member && user && tenant && !disabled
  return (
    <main className="bg-surface flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4 p-8">
          <h1 className="text-2xl font-bold">
            {!valid
              ? 'Invitation unavailable'
              : accepted
                ? 'Invitation accepted'
                : expired
                  ? 'Invitation expired'
                  : `Join ${tenant.name}`}
          </h1>
          {!valid ? (
            <p>
              This invitation was removed or replaced, or the account is disabled. Ask your
              workspace admin for a new link.
            </p>
          ) : accepted ? (
            <>
              <p>
                {user.email} is a member of {tenant.name}. Sign in with that email to open your
                assigned applications.
              </p>
              <Button asChild>
                <Link
                  to={`/login?email=${encodeURIComponent(user.email)}&tenant=${member.tenantId}`}
                >
                  Continue to sign in
                </Link>
              </Button>
            </>
          ) : expired ? (
            <>
              <p>
                This link expired on {fmtDate(member.invitationExpiresAt)}. Ask your workspace admin
                to renew the invitation and share the new link.
              </p>
              <a
                className="underline"
                href={`mailto:${tenant.billingEmail}?subject=${encodeURIComponent(`New invitation for ${user.email}`)}`}
              >
                Contact {tenant.billingEmail}
              </a>
            </>
          ) : (
            <>
              <p>
                You’re invited as{' '}
                {member.workspaceRole === 'workspace_admin' ? 'a workspace admin' : 'a member'}{' '}
                using {user.email}.
              </p>
              <p>
                Applications:{' '}
                {member.applicationIds
                  .map((id) => state.applications.find((a) => a.id === id)?.name)
                  .filter(Boolean)
                  .join(', ') || 'None assigned yet. Your admin can assign access after you join.'}
              </p>
              {signedInUser && signedInUser.id !== user.id ? (
                <>
                  <p>
                    You’re signed in as {signedInUser.email}. Sign out before accepting this
                    invitation.
                  </p>
                  <Button onClick={() => void logout()}>Sign out</Button>
                </>
              ) : (
                <Button
                  disabled={accepting}
                  onClick={() => {
                    setAccepting(true)
                    dispatch({ type: 'invitations/accept', token })
                  }}
                >
                  {accepting ? 'Accepting…' : 'Accept invitation'}
                </Button>
              )}
              <p className="text-muted text-sm">
                Expires {fmtDate(member.invitationExpiresAt)}. This demo link activates the
                membership; no password is created.
              </p>
            </>
          )}
          <Link className="block text-sm underline" to="/login">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
