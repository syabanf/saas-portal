import { avatarColor, fmtDate, fmtNumber, initials } from '@scp/fixtures'
import type { User, UserStatus } from '@scp/types'
import { USER_STATUS_LABEL } from '@scp/types'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Combobox,
  ConfirmDelete,
  DataTable,
  Input,
  PageHeader,
  StatCard,
  cn,
  type Column,
} from '@scp/ui'
import { CheckCircle2, Mail, Pencil, Plus, Search, ShieldCheck, Trash2, Users } from 'lucide-react'
import * as React from 'react'
import { ClearFiltersButton } from '../../components/ClearFiltersButton'
import { Mono, UserBadge } from '../../components/badges'
import { UserDialog, emptyUser } from '../../components/master/UserDialog'
import { PILL_COMBOBOX, PILL_INPUT, useFilterParams } from '../../lib/filters'
import { labelOptions, tenantOptions, withAll } from '../../lib/options'
import { useScoped } from '../../state/app-state'
import { UserSheet } from './UserSheet'

const STATUS_FILTERS: UserStatus[] = ['active', 'invited', 'disabled']
const ROLE_FILTERS = [
  { value: 'workspace_admin', label: 'Workspace admin' },
  { value: 'member', label: 'Member' },
  { value: 'platform_admin', label: 'Platform admin' },
]
const FILTER_KEYS = ['q', 'status', 'org', 'role'] as const

export function UsersPage() {
  const { users, usersById, tenants, membersByUser, tenantsById, dispatch } = useScoped()
  const filters = useFilterParams(FILTER_KEYS)
  const { q: query, status, org, role } = filters.values
  const [editing, setEditing] = React.useState<User | null>(null)
  const [removing, setRemoving] = React.useState<User | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = selectedId ? (usersById.get(selectedId) ?? null) : null

  const stats = React.useMemo(() => {
    const out = { active: 0, invited: 0, disabled: 0, platformAdmins: 0 }
    for (const u of users) {
      out[u.status] += 1
      if (u.platformAdmin) out.platformAdmins += 1
    }
    return out
  }, [users])

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter((u) => {
      if (status && u.status !== status) return false
      const memberships = membersByUser.get(u.id) ?? []
      if (org && !memberships.some((m) => m.tenantId === org)) return false
      if (role === 'platform_admin' && !u.platformAdmin) return false
      if (
        (role === 'workspace_admin' || role === 'member') &&
        !memberships.some((m) => m.workspaceRole === role && (!org || m.tenantId === org))
      )
        return false
      return (
        !needle || u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)
      )
    })
  }, [users, membersByUser, query, status, org, role])

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      sortValue: (u) => u.name.toLowerCase(),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar initials={initials(u.name)} color={avatarColor(u.id)} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{u.name}</p>
            <p className="text-muted truncate text-xs">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (u) => u.status,
      cell: (u) => <UserBadge status={u.status} />,
    },
    {
      key: 'memberships',
      header: 'Organizations',
      cell: (u) => {
        const memberships = membersByUser.get(u.id) ?? []
        if (memberships.length === 0) return <span className="text-muted text-xs">None</span>
        return (
          <div className="flex flex-wrap gap-1.5">
            {memberships.map((m) => (
              <Badge key={m.id} variant="default">
                {tenantsById.get(m.tenantId)?.name ?? m.tenantId}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'role',
      header: 'Platform',
      cell: (u) =>
        u.platformAdmin ? (
          <Badge variant="ink">Platform admin</Badge>
        ) : (
          <Mono className="text-muted">{u.id}</Mono>
        ),
    },
    {
      key: 'created',
      header: 'Created',
      sortValue: (u) => u.createdAt,
      cell: (u) => <span className="text-muted whitespace-nowrap">{fmtDate(u.createdAt)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="Accounts across every organization. Application access is granted per membership."
        actions={
          <Button onClick={() => setEditing(emptyUser())}>
            <Plus /> Add user
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={fmtNumber(users.length)}
          hint={`${stats.disabled} disabled`}
          icon={<Users />}
          tone="ink"
        />
        <StatCard
          label="Active"
          value={fmtNumber(stats.active)}
          hint="Can sign in"
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label="Invited"
          value={fmtNumber(stats.invited)}
          hint="Waiting to accept"
          icon={<Mail />}
          tone="info"
        />
        <StatCard
          label="Platform admins"
          value={fmtNumber(stats.platformAdmins)}
          hint="Can open this console"
          icon={<ShieldCheck />}
          tone="default"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => filters.set('q', e.target.value)}
          placeholder="Search name or email"
          leftIcon={<Search />}
          className={cn('w-full sm:w-72', PILL_INPUT)}
        />
        <Combobox
          value={status || 'all'}
          onChange={(v) => filters.set('status', v)}
          options={withAll('All statuses', labelOptions(STATUS_FILTERS, USER_STATUS_LABEL))}
          searchPlaceholder="Search statuses…"
          className={cn('w-full sm:w-40', PILL_COMBOBOX)}
        />
        <Combobox
          value={org || 'all'}
          onChange={(v) => filters.set('org', v)}
          options={withAll('All organizations', tenantOptions(tenants))}
          searchPlaceholder="Search organizations…"
          className={cn('w-full sm:w-56', PILL_COMBOBOX)}
        />
        <Combobox
          value={role || 'all'}
          onChange={(v) => filters.set('role', v)}
          options={withAll('All roles', ROLE_FILTERS)}
          searchPlaceholder="Search roles…"
          className={cn('w-full sm:w-44', PILL_COMBOBOX)}
        />
        {filters.active ? <ClearFiltersButton onClick={filters.clear} /> : null}
      </div>

      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(u) => u.id}
          onRowClick={(u) => setSelectedId(u.id)}
          rowActions={(u) => (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit"
                onClick={() => setEditing(u)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete"
                className="text-accent"
                onClick={() => setRemoving(u)}
              >
                <Trash2 />
              </Button>
            </>
          )}
          empty={
            filters.active
              ? {
                  icon: <Users />,
                  title: 'No matches',
                  description: 'Try another name, email, status, organization or role.',
                  action: <ClearFiltersButton onClick={filters.clear} />,
                }
              : {
                  icon: <Users />,
                  title: 'No users yet',
                  description: 'Add a user, then add them to an organization.',
                  action: (
                    <Button onClick={() => setEditing(emptyUser())}>
                      <Plus /> Add user
                    </Button>
                  ),
                }
          }
        />
      </Card>

      <UserSheet user={selected} onOpenChange={(open) => !open && setSelectedId(null)} />
      <UserDialog user={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDelete
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Delete ${removing?.name ?? 'user'}?`}
        description="Their memberships and sessions are removed in every organization."
        onConfirm={() => {
          if (removing) dispatch({ type: 'users/remove', id: removing.id })
          setRemoving(null)
        }}
      />
    </div>
  )
}
