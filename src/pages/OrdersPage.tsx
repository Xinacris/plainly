import { Link } from 'react-router'
import { AddressBlock, OrderLines } from '../components/OrderLines'
import { StatusMessage } from '../components/StatusMessage'
import { secondaryButton } from '../components/styles'
import { formatPrice, pluralize } from '../lib/format'
import { orderItemCount, useOrders, type Order } from '../orders/orders'

const placedFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

function OrderCard({ order }: { order: Order }) {
  const headingId = `order-${order.id}`
  return (
    <li>
      <article aria-labelledby={headingId} className="rounded-xl border border-border bg-surface">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border px-4 py-3 sm:px-6">
          <h2 id={headingId} className="font-bold">
            Order {order.id}
          </h2>
          <p className="text-sm text-muted">
            Placed {placedFormat.format(new Date(order.placedAt))} · {pluralize(orderItemCount(order), 'item')} ·{' '}
            <span className="font-semibold text-text tabular-nums">{formatPrice(order.total)}</span>
          </p>
        </header>
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1fr_14rem]">
          <OrderLines lines={order.lines} />
          <div className="text-sm md:border-l md:border-border md:pl-4">
            <h3 className="font-medium text-muted">Shipping to</h3>
            <AddressBlock address={order.address} />
          </div>
        </div>
      </article>
    </li>
  )
}

export function OrdersPage() {
  const orders = useOrders((s) => s.orders)
  if (orders.length === 0) {
    return (
      <StatusMessage
        title="No orders yet"
        action={
          <Link to="/search" className={secondaryButton}>
            Browse all products
          </Link>
        }
      >
        Orders you place in this browser show up here.
      </StatusMessage>
    )
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Your orders</h1>
      <p className="mt-1 text-sm text-muted">
        Newest first. Prices are what you paid at the time. Orders are saved in this browser only.
      </p>
      <ul className="mt-4 flex flex-col gap-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </ul>
    </section>
  )
}
