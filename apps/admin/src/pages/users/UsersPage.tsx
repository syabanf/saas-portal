import { avatarColor, fmtDate, initials } from '@scp/fixtures'
import type { User } from '@scp/types'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDelete,
  DataTable,
  Input,
  PageHeader,
  type Column,
} from '@scp/ui'
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import * as React from 'react'
import { Mono, UserBadge } from '../../components/badges'
import { UserDialog, emptyUser } from '../../components/master/UserDialog'
import { useScoped } from '../../state/app-state'
import { UserSheet } from './UserSheet'

export function UsersPage() {
  const { users, usersById, membersByUser, tenantsById, dispatch } = useScoped()
  const [query, setQuery] = React.useState('')
  const [editing, setEditing] = React.useState<User | null>(null)
  const [removing, setRemoving] = React.useState<User | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = selectedId ? (usersById.get(selectedId) ?? null) : null

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, query])

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
          <>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users…"
              leftIcon={<Search />}
              className="[&_input]:bg-card [&_input]:shadow-card w-full sm:w-72 [&_input]:rounded-full [&_input]:border-0"
            />
            <Button onClick={() => setEditing(emptyUser())}>
              <Plus /> Add user
            </Button>
          </>
        }
      />
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
          empty={{
            icon: <Users />,
            title: query ? 'No users match' : 'No users yet',
            description: query
              ? 'Try another name or email.'
              : 'Add a user, then add them to an organization.',
            action: (
              <Button onClick={() => setEditing(emptyUser())}>
                <Plus /> Add user
              </Button>
            ),
          }}
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
