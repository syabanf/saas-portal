import { newId } from '@scp/fixtures'
import type { User, UserStatus } from '@scp/types'
import { USER_STATUS_LABEL } from '@scp/types'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Select,
  ToggleRow,
} from '@scp/ui'
import * as React from 'react'
import { useScoped } from '../../state/app-state'

const USER_STATUSES: UserStatus[] = ['active', 'invited', 'disabled']

export function emptyUser(): User {
  const now = new Date().toISOString()
  return {
    id: '',
    name: '',
    email: '',
    status: 'invited',
    platformAdmin: false,
    createdAt: now,
    updatedAt: now,
  }
}

export interface UserDialogProps {
  /** null = closed; `id === ''` = create. */
  user: User | null
  onOpenChange: (open: boolean) => void
}

export function UserDialog({ user, onOpenChange }: UserDialogProps) {
  const { dispatch } = useScoped()
  const [draft, setDraft] = React.useState<User>(() => user ?? emptyUser())
  React.useEffect(() => {
    if (user) setDraft(user)
  }, [user])

  const isCreate = draft.id === ''

  function set<K extends keyof User>(key: K, value: User[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const now = new Date().toISOString()
    const next: User = {
      ...draft,
      id: isCreate ? newId('usr') : draft.id,
      email: draft.email.trim().toLowerCase(),
      createdAt: isCreate ? now : draft.createdAt,
      updatedAt: now,
    }
    dispatch({ type: 'users/upsert', user: next })
    onOpenChange(false)
  }

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isCreate ? 'New user' : 'Edit user'}</DialogTitle>
            <DialogDescription>
              A user can belong to several organizations. Application access is set per membership.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name">
              <Input
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Fahmi Syaban"
                required
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="fahmi@alpha.co.id"
                required
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={draft.status}
                onChange={(e) => set('status', e.target.value as UserStatus)}
              >
                {USER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {USER_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="sm:col-span-2">
              <ToggleRow
                title="Platform admin"
                description="Can sign in to this console and manage every organization."
                checked={draft.platformAdmin}
                onCheckedChange={(v) => set('platformAdmin', v)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isCreate ? 'Create user' : 'Save changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
