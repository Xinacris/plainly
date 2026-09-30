import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AddressBlock, OrderLines } from '../components/OrderLines'
import { ProductImage } from '../components/ProductImage'
import { StatusMessage } from '../components/StatusMessage'
import { secondaryButton } from '../components/styles'
import { formatDate, t } from '../i18n'
import { formatPrice } from '../lib/format'
import {
  canReturn,
  DELIVER_AFTER_MS,
  formatDay,
  keptLines,
  orderStatus,
  REFUND_AFTER_MS,
  returnedCount,
  returnStatus,
  SHIP_AFTER_MS,
  statusLabel,
  statusTime,
  type OrderStatus,
} from '../lib/orderStatus'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useNow } from '../lib/useNow'
import { useOrdersData } from '../account/hooks'
import { LocalDataNotice } from '../components/MoveDataPrompt'
import { primaryButton } from '../components/styles'
import { Select } from '../components/Select'
import { orderItemCount, RETURN_REASONS, type Order, type OrderLine, type ReturnReason } from '../orders/orders'

const dateTime = { format: (date: Date) => formatDate(date, { dateStyle: 'medium', timeStyle: 'short' }) }
const minutes = (ms: number) => ms / 60_000

type Tab = 'active' | 'delivered' | 'cancelled' | 'returns'
const TABS: Tab[] = ['active', 'delivered', 'cancelled', 'returns']
const inTab: Record<Exclude<Tab, 'returns'>, OrderStatus[]> = {
  active: ['preparing', 'shipped'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
}

const linkButton = 'text-sm font-medium text-action underline underline-offset-2 hover:text-action-hover'
const disabledButton = 'cursor-not-allowed text-sm font-medium text-muted underline decoration-dotted underline-offset-2'

function Progress({ order, status }: { order: Order; status: OrderStatus }) {
  if (status === 'cancelled') {
    return <p className="text-sm font-semibold text-warning">{t.orders.cancelledAt(dateTime.format(statusTime(order, 'cancelled')))}</p>
  }
  const steps: OrderStatus[] = ['preparing', 'shipped', 'delivered']
  const reached = steps.indexOf(status)
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label={t.orders.progress}>
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          {i > 0 && (
            <span aria-hidden="true" className="text-muted">
              →
            </span>
          )}
          <span className={i <= reached ? 'font-semibold text-action' : 'text-muted'} aria-current={i === reached ? 'step' : undefined}>
            {statusLabel(step)}
            {i === reached && i > 0 && <span className="font-normal text-muted"> {dateTime.format(statusTime(order, step))}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ReturnAction({ order, line, now, onStart }: { order: Order; line: OrderLine; now: number; onStart: () => void }) {
  // (Returned items aren't listed here: they're under Returns.)
  const eligible = canReturn(order, line, now)
  if (eligible.ok) {
    return (
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
        <button type="button" onClick={onStart} aria-label={t.orders.returnItemLabel(line.title)} className={linkButton}>
          {t.orders.returnItem}
        </button>
        <span className="text-muted">{t.orders.windowOpenUntil(formatDay(eligible.lastDay))}</span>
      </p>
    )
  }
  // Not returnable: the action stays visible, disabled, with the reason beside it.
  const whyId = `why-${order.id}-${line.productId}`
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
      <button type="button" disabled aria-label={t.orders.returnItemLabel(line.title)} aria-describedby={whyId} className={disabledButton}>
        {t.orders.returnItem}
      </button>
      <span id={whyId} className="text-muted">
        {eligible.reason}
      </span>
    </p>
  )
}

interface CardProps {
  order: Order
  now: number
  /** Account writes can fail; the page shows the error. */
  onCancel: (orderId: string) => void
  onReturn: (orderId: string, productId: number, reason: ReturnReason) => void
}

function OrderCard({ order, now, onCancel, onReturn }: CardProps) {
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
              {t.orders.order(order.id)}
            </h2>
            <p className="text-sm text-muted">
              {t.orders.placed(dateTime.format(new Date(order.placedAt)), t.common.items(orderItemCount(order)))}
              <span className="font-semibold text-text tabular-nums">{formatPrice(order.total)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
            <Progress order={order} status={status} />
            {status === 'preparing' && (
              <button type="button" onClick={() => setConfirmCancel(true)} className={linkButton}>
                {t.orders.cancel}<span className="sr-only"> {order.id}</span>
              </button>
            )}
          </div>
        </header>
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1fr_14rem]">
          {/* On the way: each item's return window. Delivered: the return action carries it. */}
          <div className="min-w-0">
            {/* Delivered: only the items kept; returned ones are under Returns. */}
            <OrderLines
              lines={status === 'delivered' ? keptLines(order) : order.lines}
              placedAt={status === 'preparing' || status === 'shipped' ? order.placedAt : undefined}
              actions={actions}
            />
            {status === 'delivered' && returnedCount(order) > 0 && (
              <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
                {t.orders.returnedNote(returnedCount(order))}
                <Link to="/orders?tab=returns" replace className={linkButton}>
                  {t.orders.seeReturns}
                </Link>
              </p>
            )}
          </div>
          <div className="text-sm md:border-l md:border-border md:pl-4">
            <h3 className="font-medium text-muted">{t.orders.shippingTo}</h3>
            <AddressBlock address={order.address} />
            {(status === 'preparing' || status === 'shipped') && <p className="mt-3 text-muted">{t.orders.returnsOnceDelivered}</p>}
          </div>
        </div>
      </article>

      <ConfirmDialog
        open={confirmCancel}
        title={t.orders.cancelTitle}
        confirmLabel={t.orders.cancel}
        onConfirm={() => {
          // Checked again on confirming: it may have shipped while the dialog was open.
          if (orderStatus(order, Date.now()) === 'preparing') onCancel(order.id)
          setConfirmCancel(false)
        }}
        onCancel={() => setConfirmCancel(false)}
      >
        <p>{t.orders.cancelBody(order.id, t.common.items(orderItemCount(order)), formatPrice(order.total))}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={returning !== null}
        title={t.orders.returnTitle}
        confirmLabel={t.orders.requestReturn}
        onConfirm={() => {
          if (returning && canReturn(order, returning, Date.now()).ok) onReturn(order.id, returning.productId, reason)
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
              {t.orders.reason}
            </label>
            <Select
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value as ReturnReason)}
              wrapperClassName="mt-1 w-full"
            >
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t.orders.reasons[r]}
                </option>
              ))}
            </Select>
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
  if (entries.length === 0) return <p className="mt-6 text-muted">{t.orders.noReturns}</p>
  return (
    <ul aria-label={t.orders.returnedItems} className="mt-4 flex flex-col gap-3">
      {entries.map(({ order, request, line }) => {
        const refunded = returnStatus(request, now) === 'refunded'
        const amount = formatPrice(line.price * line.quantity)
        const detail = refunded
          ? t.orders.refundedDetail(amount)
          : t.orders.requestedDetail(dateTime.format(new Date(request.requestedAt)), amount, minutes(REFUND_AFTER_MS))
        return (
          <li key={`${order.id}-${line.productId}`} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <ProductImage src={line.thumbnail} alt="" className="w-16 shrink-0 self-start p-1.5" />
            <div className="min-w-0 flex-1 text-sm">
              <p lang="en" className="font-semibold">
                {line.title}
              </p>
              <p className="text-muted">
                {t.orders.returnLine(order.id, line.quantity, formatPrice(line.price), t.orders.reasons[request.reason] ?? request.reason)}
              </p>
              <p className="mt-1">
                <span className="font-semibold">{refunded ? t.orders.refunded : t.orders.requested}</span>
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
  return TABS.some((tab) => tab === value)
}

export function OrdersPage() {
  useDocumentTitle(t.orders.title)
  const data = useOrdersData()
  const { orders } = data
  const [actionError, setActionError] = useState('')
  const run = async (write: Promise<string | null>) => setActionError((await write) ?? '')
  const now = useNow()
  const [params] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = isTab(raw) ? raw : 'active'
  const tabList = useRef<HTMLUListElement>(null)
  // On phones the tabs scroll sideways: keep the current one in view (scrollLeft only,
  // so the page itself never jumps).
  useEffect(() => {
    const ul = tabList.current
    const current = ul?.querySelector<HTMLElement>('[aria-current="page"]')
    if (ul && current) ul.scrollLeft = current.offsetLeft - (ul.clientWidth - current.offsetWidth) / 2
    // Also once the orders have loaded: before that the tabs aren't on the page yet.
  }, [tab, data.status])

  if (data.status === 'loading') return <StatusMessage role="status" title={t.orders.loading} />
  if (data.status === 'error') {
    return (
      <StatusMessage
        role="alert"
        title={t.orders.loadError}
        action={
          <button type="button" onClick={data.retry} className={primaryButton}>
            {t.common.tryAgain}
          </button>
        }
      >
        {data.error}
      </StatusMessage>
    )
  }
  if (orders.length === 0) {
    return (
      <StatusMessage
        title={t.orders.none}
        action={
          <Link to="/search" className={secondaryButton}>
            {t.common.browseAll}
          </Link>
        }
      >
        {data.mode === 'account' ? t.orders.noneAccount : t.orders.noneBrowser}
        <LocalDataNotice />
      </StatusMessage>
    )
  }

  // Delivered lists an order only while it still has an item that wasn't returned, so
  // no item is counted under both Delivered and Returns.
  const inStatusTab = (which: Exclude<Tab, 'returns'>) =>
    orders.filter((o) => inTab[which].includes(orderStatus(o, now)) && (which !== 'delivered' || keptLines(o).length > 0))
  const count = (which: Tab) => (which === 'returns' ? orders.reduce((sum, o) => sum + (o.returns?.length ?? 0), 0) : inStatusTab(which).length)
  const shown = tab === 'returns' ? [] : inStatusTab(tab)

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">{t.orders.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {t.orders.intro} {data.mode === 'account' ? t.orders.savedAccount : t.orders.savedBrowser}
      </p>
      <LocalDataNotice />
      {actionError && (
        <p role="alert" className="mt-3 rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning">
          {actionError}
        </p>
      )}
      <p className="mt-2 rounded-lg bg-warning-surface px-3 py-2 text-sm">
        <span className="font-semibold">{t.orders.simulatedLead}</span>
        {t.orders.simulated(minutes(SHIP_AFTER_MS), minutes(DELIVER_AFTER_MS - SHIP_AFTER_MS), minutes(REFUND_AFTER_MS))}
      </p>

      <nav aria-label={t.orders.tabsLabel} className="mt-4 border-b border-border">
        <ul ref={tabList} className="relative -mb-px flex gap-1 overflow-x-auto">
          {TABS.map((which) => {
            const current = which === tab
            return (
              <li key={which}>
                <Link
                  to={which === 'active' ? '/orders' : `/orders?tab=${which}`}
                  replace
                  aria-current={current ? 'page' : undefined}
                  className={`block border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${current ? 'border-action text-action' : 'border-transparent text-muted hover:text-text'}`}
                >
                  {t.orders.tabs[which]} <span className="tabular-nums">({count(which)})</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {tab === 'returns' && <ReturnsList orders={orders} now={now} />}
      {tab !== 'returns' && shown.length === 0 && <p className="mt-6 text-muted">{t.orders.emptyTab[tab]}</p>}
      {shown.length > 0 && (
        <ul className="mt-4 flex flex-col gap-4">
          {shown.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              now={now}
              onCancel={(id) => void run(data.cancel(id))}
              onReturn={(id, productId, reason) => void run(data.requestReturn(id, productId, reason))}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
