import { Link, useParams } from 'react-router'
import { AddressBlock, OrderLines } from '../components/OrderLines'
import { StatusMessage } from '../components/StatusMessage'
import { primaryButton, secondaryButton } from '../components/styles'
import { formatIsoDate, latestArrival } from '../lib/delivery'
import { formatPrice } from '../lib/format'
import { useOrder } from '../orders/orders'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function OrderConfirmationPage() {
  const order = useOrder(useParams().id)
  useDocumentTitle(order ? 'Order placed' : 'Order not found')
  if (!order) {
    return (
      <StatusMessage
        title="Order not found"
        action={
          <Link to="/orders" className={secondaryButton}>
            See your orders
          </Link>
        }
      >
        There’s no order at this address in this browser.
      </StatusMessage>
    )
  }

  const arrivesBy = latestArrival(order.lines.map((l) => l.estimate))
  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Order placed</h1>
      <p className="mt-2 text-muted">
        Order <span className="font-semibold text-text">{order.id}</span>. Payment was simulated, so nothing was
        charged.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-6">
        {arrivesBy && (
          <p className="mb-4 text-lg">
            Estimated to arrive by <span className="font-bold">{formatIsoDate(arrivesBy)}</span>
          </p>
        )}
        <OrderLines lines={order.lines} placedAt={order.placedAt} />
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-medium text-muted">Shipping to</h2>
            <AddressBlock address={order.address} />
          </div>
          <div className="sm:text-right">
            <h2 className="text-sm font-medium text-muted">Total</h2>
            <p className="text-lg font-bold tabular-nums">{formatPrice(order.total)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/orders" className={primaryButton}>
          See your orders
        </Link>
        <Link to="/search" className={secondaryButton}>
          Keep shopping
        </Link>
      </div>
    </section>
  )
}
