import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AddressBlock, OrderLines } from '../components/OrderLines'
import { ProductImage } from '../components/ProductImage'
import { StatusMessage } from '../components/StatusMessage'
import { secondaryButton } from '../components/styles'
import { formatPrice, pluralize } from '../lib/format'
import {
  canReturn,
  DELIVER_AFTER_MS,
  findReturn,
  orderStatus,
  REFUND_AFTER_MS,
  returnStatus,
  SHIP_AFTER_MS,
  STATUS_LABELS,
  statusTime,
  type OrderStatus,
} from '../lib/orderStatus'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useNow } from '../lib/useNow'
import { orderItemCount, RETURN_REASONS, useOrders, type Order, type OrderLine, type ReturnReason } from '../orders/orders'

const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const minutes = (ms: number) => ms / 60_000

type Tab = 'active' | 'delivered' | 'cancelled' | 'returns'
const TABS: { value: Tab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returns', label: 'Returns' },
]
const inTab: Record<Exclude<Tab, 'returns'>, OrderStatus[]> = {
  active: ['preparing', 'shipped'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
}

const linkButton = 'text-sm font-medium text-action underline underline-offset-2 hover:text-action-hover'
const disabledButton = 'cursor-not-allowed text-sm font-medium text-muted underline decoration-dotted underline-offset-2'

function Progress({ order, status }: { order: Order; status: OrderStatus }) {
  if (status === 'cancelled') {
    return <p className="text-sm font-semibold text-warning">Cancelled {dateTime.format(statusTime(order, 'cancelled'))}</p>
  }
  const steps: OrderStatus[] = ['preparing', 'shipped', 'delivered']
  const reached = steps.indexOf(status)
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="Order progress (simulated)">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          {i > 0 && (
            <span aria-hidden="true" className="text-muted">
              →
            </span>
          )}
          <span className={i <= reached ? 'font-semibold text-action' : 'text-muted'} aria-current={i === reached ? 'step' : undefined}>
            {STATUS_LABELS[step]}
            {i === reached && i > 0 && <span className="font-normal text-muted"> {dateTime.format(statusTime(order, step))}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ReturnAction({ order, line, now, onStart }: { order: Order; line: OrderLine; now: number; onStart: () => void }) {
  const request = findReturn(order, line.productId)
  if (request) {
    const refunded = returnStatus(request, now) === 'refunded'
    const detail = refunded ? `${formatPrice(line.price * line.quantity)} back (simulated)` : `requested ${dateTime.format(new Date(request.requestedAt))}`
    return (
      <p className="mt-1 text-sm">
        <span className="font-semibold">{refunded ? 'Refunded' : 'Return requested'}</span>
        <span className="text-muted">
          {' '}
          · {request.reason} · {detail}
        </span>
      </p>
    )
  }
  const eligible = canReturn(order, line, now)
  if (eligible.ok) {
    return (
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
        <button type="button" onClick={onStart} aria-label={`Return this item: ${line.title}`} className={linkButton}>
          Return this item
        </button>
        <span className="text-muted">Return window open until {shortDate.format(eligible.lastDay)}</span>
      </p>
    )
  }
  // Not returnable: the action stays visible, disabled, with the reason beside it.
  const whyId = `why-${order.id}-${line.productId}`
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
      <button type="button" disabled aria-label={`Return this item: ${line.title}`} aria-describedby={whyId} className={disabledButton}>
        Return this item
      </button>
      <span id={whyId} className="text-muted">
        {eligible.reason}
      </span>
    </p>
  )
}

function OrderCard({ order, now }: { order: Order; now: number }) {
  const cancel = useOrders((s) => s.cancel)
  const requestReturn = useOrders((s) => s.requestReturn)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [returning, setReturning] = useState<OrderLine | null>(null)
  const [reason, setReason] = useState<ReturnReason>(RETURN_REASONS[0])
  const reasonId = useId()
  const status = orderStatus(order, now)
  const headingId = `order-${order.id}`
  // Per-item return actions only once delivered (cancelled orders never get there).
  const actions = status === 'delivered' ? (line: OrderLine) => <ReturnAction order={order} line={line} now={now} onStart={() => setReturning(line)} /> : undefined

  return (
    <li>
      <article aria-labelledby={headingId} className="rounded-xl border border-border bg-surface">
        <header className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id={headingId} className="font-bold">
              Order {order.id}
            </h2>
            <p className="text-sm text-muted">
              Placed {dateTime.format(new Date(order.placedAt))} · {pluralize(orderItemCount(order), 'item')} ·{' '}
              <span className="font-semibold text-text tabular-nums">{formatPrice(order.total)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
            <Progress order={order} status={status} />
            {status === 'preparing' && (
              <button type="button" onClick={() => setConfirmCancel(true)} className={linkButton}>
                Cancel order<span className="sr-only"> {order.id}</span>
              </button>
            )}
          </div>
        </header>
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1fr_14rem]">
          {/* On the way: each item's return window. Delivered: the return action carries it. */}
          <OrderLines lines={order.lines} placedAt={status === 'preparing' || status === 'shipped' ? order.placedAt : undefined} actions={actions} />
          <div className="text-sm md:border-l md:border-border md:pl-4">
            <h3 className="font-medium text-muted">Shipping to</h3>
            <AddressBlock address={order.address} />
            {(status === 'preparing' || status === 'shipped') && <p className="mt-3 text-muted">Returns open once it’s delivered.</p>}
          </div>
        </div>
      </article>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        confirmLabel="Cancel order"
        onConfirm={() => {
          // Checked again on confirming: it may have shipped while the dialog was open.
          if (orderStatus(order, Date.now()) === 'preparing') cancel(order.id)
          setConfirmCancel(false)
        }}
        onCancel={() => setConfirmCancel(false)}
      >
        <p>
          Order {order.id}, {pluralize(orderItemCount(order), 'item')}, {formatPrice(order.total)}. It hasn’t shipped yet, so it
          can still be cancelled. Payment was simulated, so there’s nothing to refund.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={returning !== null}
        title="Return this item?"
        confirmLabel="Request return"
        onConfirm={() => {
          if (returning && canReturn(order, returning, Date.now()).ok) requestReturn(order.id, returning.productId, reason)
          setReturning(null)
        }}
        onCancel={() => setReturning(null)}
      >
        {returning && (
          <>
            <p>
              {returning.quantity} × {returning.title}, {formatPrice(returning.price * returning.quantity)}.
            </p>
            <label htmlFor={reasonId} className="mt-3 block font-medium">
              Reason
            </label>
            <select
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value as ReturnReason)}
              className="mt-1 h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-text"
            >
              {RETURN_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </>
        )}
      </ConfirmDialog>
    </li>
  )
}

function ReturnsList({ orders, now }: { orders: Order[]; now: number }) {
  const entries = orders.flatMap((order) =>
    (order.returns ?? []).flatMap((request) => {
      const line = order.lines.find((l) => l.productId === request.productId)
      return line ? [{ order, request, line }] : []
    }),
  )
  if (entries.length === 0) return <p className="mt-6 text-muted">No returns yet. Delivered items can be returned from the Delivered tab.</p>
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {entries.map(({ order, request, line }) => {
        const refunded = returnStatus(request, now) === 'refunded'
        const detail = refunded
          ? `· ${formatPrice(line.price * line.quantity)} back (simulated)`
          : `${dateTime.format(new Date(request.requestedAt))} · refund follows in about ${minutes(REFUND_AFTER_MS)} minutes`
        return (
          <li key={`${order.id}-${line.productId}`} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <ProductImage src={line.thumbnail} alt="" className="w-16 shrink-0 self-start p-1.5" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{line.title}</p>
              <p className="text-muted">
                Order {order.id} · {line.quantity} × {formatPrice(line.price)} · {request.reason}
              </p>
              <p className="mt-1">
                <span className="font-semibold">{refunded ? 'Refunded' : 'Requested'}</span>
                <span className="text-muted"> {detail}</span>
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function isTab(value: string | null): value is Tab {
  return TABS.some((t) => t.value === value)
}

export function OrdersPage() {
  useDocumentTitle('Your orders')
  const orders = useOrders((s) => s.orders)
  const now = useNow()
  const [params] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = isTab(raw) ? raw : 'active'

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

  const inStatusTab = (t: Exclude<Tab, 'returns'>) => orders.filter((o) => inTab[t].includes(orderStatus(o, now)))
  const count = (t: Tab) => (t === 'returns' ? orders.reduce((sum, o) => sum + (o.returns?.length ?? 0), 0) : inStatusTab(t).length)
  const shown = tab === 'returns' ? [] : inStatusTab(tab)
  const tabLabel = TABS.find((t) => t.value === tab)?.label.toLowerCase()

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Your orders</h1>
      <p className="mt-1 text-sm text-muted">Newest first. Prices are what you paid at the time. Orders are saved in this browser only.</p>
      <p className="mt-2 rounded-lg bg-warning-surface px-3 py-2 text-sm">
        <span className="font-semibold">Status is simulated.</span> There’s no real shipping: an order ships {minutes(SHIP_AFTER_MS)}{' '}
        minutes after it’s placed and is delivered {minutes(DELIVER_AFTER_MS - SHIP_AFTER_MS)} minutes after that. A refund follows{' '}
        {minutes(REFUND_AFTER_MS)} minutes after a return is requested. Delivery dates shown are the real estimates.
      </p>

      <nav aria-label="Order status" className="mt-4 border-b border-border">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const current = t.value === tab
            return (
              <li key={t.value}>
                <Link
                  to={t.value === 'active' ? '/orders' : `/orders?tab=${t.value}`}
                  replace
                  aria-current={current ? 'page' : undefined}
                  className={`block border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${current ? 'border-action text-action' : 'border-transparent text-muted hover:text-text'}`}
                >
                  {t.label} <span className="tabular-nums">({count(t.value)})</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {tab === 'returns' && <ReturnsList orders={orders} now={now} />}
      {tab !== 'returns' && shown.length === 0 && <p className="mt-6 text-muted">No {tabLabel} orders.</p>}
      {shown.length > 0 && (
        <ul className="mt-4 flex flex-col gap-4">
          {shown.map((order) => (
            <OrderCard key={order.id} order={order} now={now} />
          ))}
        </ul>
      )}
    </section>
  )
}
