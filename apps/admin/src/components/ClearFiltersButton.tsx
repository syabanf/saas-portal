import { Button } from '@scp/ui'
import { X } from 'lucide-react'

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <X /> Clear filters
    </Button>
  )
}
