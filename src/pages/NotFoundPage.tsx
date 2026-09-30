import { Link } from 'react-router'
import { StatusMessage } from '../components/StatusMessage'
import { secondaryButton } from '../components/styles'

export function NotFoundPage() {
  return (
    <StatusMessage
      title="Page not found"
      action={
        <Link to="/" className={secondaryButton}>
          Back to home
        </Link>
      }
    >
      There’s nothing at this address.
    </StatusMessage>
  )
}
