import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@scp/ui'
import * as React from 'react'
import { useBlocker } from 'react-router'

export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when)

  React.useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!when) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [when])

  return (
    <AlertDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => !open && blocker.state === 'blocked' && blocker.reset()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this form?</AlertDialogTitle>
          <AlertDialogDescription>
            Your draft is saved on this device, but unsaved changes have not been applied.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.state === 'blocked' && blocker.reset()}>
            Stay here
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
            Leave page
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
