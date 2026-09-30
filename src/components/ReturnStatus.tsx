import { returnWindow } from '../lib/facts'

const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// Whether an ordered item can still be sent back, counted from the order date.
export function ReturnStatus({ policy, placedAt }: { policy: string; placedAt: string }) {
  const status = returnWindow(policy, placedAt)
  if (status.kind === 'none') return <p className="text-sm font-semibold text-warning">No returns for this item</p>
  if (status.kind === 'unknown') return <p className="text-sm text-muted">Returns: {policy}</p>
  const last = dayFormat.format(status.lastDay)
  if (status.kind === 'open') {
    return (
      <p className="text-sm">
        <span className="font-semibold text-action">Return window open</span>
        <span className="text-muted">
          {' '}
          until {last} ({status.days} days from the order date)
        </span>
      </p>
    )
  }
  return (
    <p className="text-sm text-muted">
      Return window closed on {last} ({status.days} days from the order date)
    </p>
  )
}
