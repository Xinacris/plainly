import { t } from '../i18n'
import { returnWindow } from '../lib/facts'
import { formatDay } from '../lib/orderStatus'

// Whether an ordered item can still be sent back, counted from the order date.
export function ReturnStatus({ policy, placedAt }: { policy: string; placedAt: string }) {
  const status = returnWindow(policy, placedAt)
  if (status.kind === 'none') return <p className="text-sm font-semibold text-warning">{t.returns.none}</p>
  if (status.kind === 'unknown') return <p className="text-sm text-muted">{t.returns.unknown(policy)}</p>
  const last = formatDay(status.lastDay)
  if (status.kind === 'open') {
    return (
      <p className="text-sm">
        <span className="font-semibold text-action">{t.returns.open}</span>
        <span className="text-muted">{t.returns.until(last, status.days)}</span>
      </p>
    )
  }
  return (
    <p className="text-sm text-muted">
      {t.returns.closed(last, status.days)}
    </p>
  )
}
