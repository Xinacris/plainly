import { Link, useParams } from 'react-router'
import { AddressBlock, OrderLines } from '../components/OrderLines'
import { StatusMessage } from '../components/StatusMessage'
import { primaryButton, secondaryButton } from '../components/styles'
import { formatIsoDate, latestArrival } from '../lib/delivery'
import { t } from '../i18n'
import { formatPrice } from '../lib/format'
import { useOrdersData } from '../account/hooks'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function OrderConfirmationPage() {
  const id = useParams().id
  const data = useOrdersData()
  const order = data.orders.find((o) => o.id === id)
  useDocumentTitle(order ? t.confirmation.placed : t.confirmation.notFound)
  if (!order && data.status === 'loading') return <StatusMessage role="status" title={t.confirmation.loading} />
  if (!order) {
    return (
      <StatusMessage
        title={t.confirmation.notFound}
        action={
          <Link to="/orders" className={secondaryButton}>
            {t.confirmation.seeOrders}
          </Link>
        }
      >
        {t.confirmation.notFoundBody}
      </StatusMessage>
    )
  }

  const arrivesBy = latestArrival(order.lines.map((l) => l.estimate))
  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.confirmation.placed}</h1>
      <p className="mt-2 text-muted">
        {t.confirmation.orderBefore}
        <span className="font-semibold text-text">{order.id}</span>
        {t.confirmation.orderAfter}
      </p>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-6">
        {arrivesBy && (
          <p className="mb-4 text-lg">
            {t.confirmation.arrivesBy} <span className="font-bold">{formatIsoDate(arrivesBy)}</span>
          </p>
        )}
        <OrderLines lines={order.lines} placedAt={order.placedAt} />
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-medium text-muted">{t.confirmation.shippingTo}</h2>
            <AddressBlock address={order.address} />
          </div>
          <div className="sm:text-right">
            <h2 className="text-sm font-medium text-muted">{t.confirmation.total}</h2>
            <p className="text-lg font-bold tabular-nums">{formatPrice(order.total)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/orders" className={primaryButton}>
          {t.confirmation.seeOrders}
        </Link>
        <Link to="/search" className={secondaryButton}>
          {t.confirmation.keepShopping}
        </Link>
      </div>
    </section>
  )
}
