import {
  Button,
  Combobox,
  EmptyState,
  FormField,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  Textarea,
} from '@scp/ui'
import { CheckCircle2 } from 'lucide-react'
import * as React from 'react'

const SUBJECTS = [
  'Billing question',
  'Restore a suspended organization',
  'Application access',
  'Something else',
]

export function SupportSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [subject, setSubject] = React.useState(SUBJECTS[0]!)
  const [message, setMessage] = React.useState('')
  const [sent, setSent] = React.useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSent(false)
      setMessage('')
    }
    onOpenChange(next)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="max-w-md p-6">
        <SheetTitle className="text-lg font-semibold">Contact support</SheetTitle>
        <SheetDescription className="text-muted text-sm">
          Tell us what you need. Billing and access questions get the fastest answers.
        </SheetDescription>
        {sent ? (
          <EmptyState
            icon={<CheckCircle2 />}
            title="Message sent"
            description={`We will reply to the organization's billing email about "${subject}".`}
            action={
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            }
          />
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <FormField label="Subject" htmlFor="support-subject">
              <Combobox
                id="support-subject"
                value={subject}
                onChange={setSubject}
                options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                searchPlaceholder="Search subjects"
              />
            </FormField>
            <FormField label="Message" htmlFor="support-message">
              <Textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened, and which application does it concern?"
                required
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Send</Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
