import { useFormat, useT } from '@scp/i18n'
import type { IntegrationConfig } from '@scp/integration'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  FormField,
  Input,
  KeyValue,
  PageHeader,
} from '@scp/ui'
import { UserRound } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { useAuth, useCurrentUser } from '../../auth/auth'
import { Mono } from '../../components/badges'
import { LanguageCombobox } from '../../components/LanguageCombobox'
import { useApi } from '../../state/api'
import { actorOf, useAppState, useScoped } from '../../state/app-state'

function OrganizationCard() {
  const t = useT()
  const user = useCurrentUser()
  const { member } = useAuth()
  const { tenant, dispatch } = useScoped()
  const [name, setName] = React.useState(tenant?.name ?? '')
  const [billingEmail, setBillingEmail] = React.useState(tenant?.billingEmail ?? '')
  const [country, setCountry] = React.useState(tenant?.country ?? '')
  const [saved, setSaved] = React.useState(false)
  const isAdmin = member?.workspaceRole === 'workspace_admin'

  React.useEffect(() => {
    setName(tenant?.name ?? '')
    setBillingEmail(tenant?.billingEmail ?? '')
    setCountry(tenant?.country ?? '')
  }, [tenant])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant) return
    dispatch({
      type: 'tenants/upsert',
      tenant: {
        ...tenant,
        name: name.trim(),
        billingEmail: billingEmail.trim(),
        country: country.trim(),
        updatedAt: new Date().toISOString(),
      },
      actor: actorOf(user),
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.organizationProfile')}</CardTitle>
        <CardDescription>
          {isAdmin
            ? t('settings.organizationProfileAdmin')
            : t('settings.organizationProfileMember')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('common.name')} htmlFor="org-name" className="sm:col-span-2">
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              required
            />
          </FormField>
          <FormField label={t('settings.billingEmail')} htmlFor="org-email">
            <Input
              id="org-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              disabled={!isAdmin}
              required
            />
          </FormField>
          <FormField
            label={t('settings.country')}
            htmlFor="org-country"
            hint={t('settings.countryHint')}
          >
            <Input
              id="org-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={2}
              disabled={!isAdmin}
              required
            />
          </FormField>
          {isAdmin ? (
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit">
                {saved ? t('settings.saved') : t('settings.saveProfile')}
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}

function AccountCard() {
  const t = useT()
  const { formatDateTime } = useFormat()
  const user = useCurrentUser()
  const { member, session, liveSession } = useAuth()
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('settings.yourAccount')}</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/profile">
            <UserRound /> {t('settings.openProfile')}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <KeyValue
          dense
          rows={[
            { label: t('common.name'), value: user.name },
            { label: t('common.email'), value: user.email },
            {
              label: t('common.role'),
              value: member ? t(`role.${member.workspaceRole}`) : '—',
            },
            { label: t('settings.session'), value: <Mono>{session?.sessionId ?? '—'}</Mono> },
            {
              label: t('common.expires'),
              value: liveSession ? formatDateTime(liveSession.expiresAt) : '—',
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}

function LanguageCard() {
  const t = useT()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('common.language')}</CardTitle>
        <CardDescription>{t('settings.languageDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FormField label={t('common.language')} htmlFor="settings-language">
          <LanguageCombobox id="settings-language" />
        </FormField>
      </CardContent>
    </Card>
  )
}

function IntegrationCard() {
  const t = useT()
  const { config, setConfig } = useApi()
  const [draft, setDraft] = React.useState<IntegrationConfig>(config)
  React.useEffect(() => setDraft(config), [config])
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.integration')}</CardTitle>
        <CardDescription>{t('settings.integrationDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setConfig(draft)
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <FormField label={t('settings.mode')} htmlFor="int-mode">
            <Combobox
              id="int-mode"
              value={draft.mode}
              onChange={(mode) => setDraft({ ...draft, mode: mode as IntegrationConfig['mode'] })}
              options={[
                { value: 'mock', label: t('settings.mode.mock') },
                { value: 'http', label: t('settings.mode.http') },
              ]}
              searchPlaceholder={t('settings.searchModes')}
              emptyText={t('common.noMatches')}
            />
          </FormField>
          <FormField label={t('settings.mockLatency')} htmlFor="int-latency">
            <Input
              id="int-latency"
              type="number"
              min={0}
              value={draft.mockLatencyMs}
              onChange={(e) =>
                setDraft({ ...draft, mockLatencyMs: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </FormField>
          <FormField label={t('settings.baseUrl')} htmlFor="int-base" className="sm:col-span-2">
            <Input
              id="int-base"
              value={draft.baseUrl}
              onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" variant="secondary">
              {t('settings.saveIntegration')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function DemoDataCard() {
  const t = useT()
  const { resetDemo } = useAppState()
  const [open, setOpen] = React.useState(false)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.demoData')}</CardTitle>
        <CardDescription>{t('settings.demoDataDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="border-danger text-danger hover:bg-danger-soft"
          onClick={() => setOpen(true)}
        >
          {t('nav.resetDemo')}
        </Button>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('settings.resetTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('settings.resetDescription')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetDemo()
                  setOpen(false)
                }}
              >
                {t('settings.reset')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const t = useT()
  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.settings')} description={t('settings.description')} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OrganizationCard />
        <AccountCard />
        <LanguageCard />
        <IntegrationCard />
        <DemoDataCard />
      </div>
    </div>
  )
}
