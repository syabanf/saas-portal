import { Button, EmptyState } from '@scp/ui'
import { Link, useParams } from 'react-router'
import { useScoped } from '../../state/app-state'
import { ProductForm } from './ProductForm'

/** Loads the product behind `/applications/:id/edit` and hands it to the wizard. */
export function ApplicationEditPage() {
  const { id = '' } = useParams()
  const { applicationsById } = useScoped()
  const app = applicationsById.get(id)

  if (!app) {
    return (
      <EmptyState
        title="Product not found"
        description="It may have been deleted."
        action={
          <Button variant="outline" asChild>
            <Link to="/applications">All products</Link>
          </Button>
        }
      />
    )
  }

  return <ProductForm key={app.id} application={app} />
}
