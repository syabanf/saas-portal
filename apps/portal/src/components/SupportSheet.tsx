import { useT, type DictKey } from '@scp/i18n'
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

const SUBJECTS: DictKey[] = [
  'support.subject.billing',
  'support.subject.restore',
  'support.subject.access',
  'support.subject.other',
]

export function SupportSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const [subject, setSubject] = React.useState<DictKey>(SUBJECTS[0]!)
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
        <SheetTitle className="text-lg font-semibold">{t('support.title')}</SheetTitle>
        <SheetDescription className="text-muted text-sm">
          {t('support.description')}
        </SheetDescription>
        {sent ? (
          <EmptyState
            icon={<CheckCircle2 />}
            title={t('support.sent')}
            description={t('support.sentDescription', { subject: t(subject) })}
            action={
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t('common.close')}
              </Button>
            }
          />
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <FormField label={t('support.subject')} htmlFor="support-subject">
              <Combobox
                id="support-subject"
                value={subject}
                onChange={(value) => {
                  const key = SUBJECTS.find((item) => item === value)
                  if (key) setSubject(key)
                }}
                options={SUBJECTS.map((key) => ({ value: key, label: t(key) }))}
                searchPlaceholder={t('support.searchSubjects')}
                emptyText={t('common.noMatches')}
              />
            </FormField>
            <FormField label={t('support.message')} htmlFor="support-message">
              <Textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('support.messagePlaceholder')}
                required
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('support.send')}</Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
