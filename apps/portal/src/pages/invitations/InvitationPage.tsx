import { useFormat, useT } from '@scp/i18n'
import { Button, Card, CardContent } from '@scp/ui'
import * as React from 'react'
import { Link, useParams } from 'react-router'
import { useDocumentTitle } from '../../lib/document-title'
import { useAppState } from '../../state/app-state'
import { useAuth } from '../../auth/auth'

export function InvitationPage() {
  const t = useT()
  const { formatDate } = useFormat()
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
  const tenant = state.tenants.find((item) => item.id === member?.tenantId)
  const accepted = Boolean(member?.invitationAcceptedAt)
  const disabled = member?.status === 'disabled' || user?.status === 'disabled'
  const expired = Boolean(
    member && (!member.invitationExpiresAt || Date.parse(member.invitationExpiresAt) <= now),
  )
  const valid = member && user && tenant && !disabled
  const title = !valid
    ? t('invite.unavailable')
    : accepted
      ? t('invite.accepted')
      : expired
        ? t('invite.expired')
        : t('invite.join', { organization: tenant.name })
  useDocumentTitle(title)
  return (
    <main className="bg-surface flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4 p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          {!valid ? (
            <p>{t('invite.unavailableBody')}</p>
          ) : accepted ? (
            <>
              <p>{t('invite.acceptedBody', { email: user.email, organization: tenant.name })}</p>
              <Button asChild>
                <Link
                  to={`/login?email=${encodeURIComponent(user.email)}&tenant=${member.tenantId}`}
                >
                  {t('invite.continueToSignIn')}
                </Link>
              </Button>
            </>
          ) : expired ? (
            <>
              <p>{t('invite.expiredBody', { date: formatDate(member.invitationExpiresAt) })}</p>
              <a
                className="underline"
                href={`mailto:${tenant.billingEmail}?subject=${encodeURIComponent(t('invite.mailSubject', { email: user.email }))}`}
              >
                {t('invite.contact', { email: tenant.billingEmail })}
              </a>
            </>
          ) : (
            <>
              <p>
                {t('invite.invitedAs', {
                  role:
                    member.workspaceRole === 'workspace_admin'
                      ? t('invite.asAdmin')
                      : t('invite.asMember'),
                  email: user.email,
                })}
              </p>
              <p>
                {t('invite.applications', {
                  list:
                    member.applicationIds
                      .map((id) => state.applications.find((a) => a.id === id)?.name)
                      .filter(Boolean)
                      .join(', ') || t('invite.noneAssigned'),
                })}
              </p>
              {signedInUser && signedInUser.id !== user.id ? (
                <>
                  <p>{t('invite.signedInAsOther', { email: signedInUser.email })}</p>
                  <Button onClick={() => void logout()}>{t('common.signOut')}</Button>
                </>
              ) : (
                <Button
                  disabled={accepting}
                  onClick={() => {
                    setAccepting(true)
                    dispatch({ type: 'invitations/accept', token })
                  }}
                >
                  {accepting ? t('invite.accepting') : t('invite.accept')}
                </Button>
              )}
              <p className="text-muted text-sm">
                {t('invite.expiresNote', { date: formatDate(member.invitationExpiresAt) })}
              </p>
            </>
          )}
          <Link className="block text-sm underline" to="/login">
            {t('invite.backToSignIn')}
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
