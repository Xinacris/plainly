import { formatDate, t } from '../i18n'
import { returnWindow } from './facts'
import type { Order, OrderLine, ReturnRequest } from '../orders/orders'

// There's no real shipping, so an order's status is simulated from the time since
// it was placed, on a short fixed timeline a reviewer can watch:
//   Preparing for 2 minutes, then Shipped, then Delivered 5 minutes after ordering.
// A return is Requested for 2 minutes, then Refunded. The delivery estimate dates
// stay the real estimates; see DECISIONS.md for why the timeline isn't scaled to them.
export const SHIP_AFTER_MS = 2 * 60_000
export const DELIVER_AFTER_MS = 5 * 60_000
export const REFUND_AFTER_MS = 2 * 60_000

export type OrderStatus = 'preparing' | 'shipped' | 'delivered' | 'cancelled'

export const statusLabel = (status: OrderStatus): string => t.orders.status[status]

const since = (iso: string, now: number) => now - new Date(iso).getTime()

export function orderStatus(order: Order, now: number): OrderStatus {
  if (order.cancelledAt) return 'cancelled'
  const age = since(order.placedAt, now)
  if (age < SHIP_AFTER_MS) return 'preparing'
  if (age < DELIVER_AFTER_MS) return 'shipped'
  return 'delivered'
}

/** When the simulated status changed, for the order's timeline line. */
export function statusTime(order: Order, status: OrderStatus): Date {
  const placed = new Date(order.placedAt).getTime()
  if (status === 'cancelled' && order.cancelledAt) return new Date(order.cancelledAt)
  if (status === 'shipped') return new Date(placed + SHIP_AFTER_MS)
  if (status === 'delivered') return new Date(placed + DELIVER_AFTER_MS)
  return new Date(placed)
}

export type ReturnStatus = 'requested' | 'refunded'

export function returnStatus(request: ReturnRequest, now: number): ReturnStatus {
  return since(request.requestedAt, now) < REFUND_AFTER_MS ? 'requested' : 'refunded'
}

export function findReturn(order: Order, productId: number): ReturnRequest | undefined {
  return order.returns?.find((r) => r.productId === productId)
}

export type ReturnEligibility = { ok: true; lastDay: Date } | { ok: false; reason: string }

export const formatDay = (date: Date): string => formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' })

// Per item: only after delivery, within that item's return window, and once.
export function canReturn(order: Order, line: OrderLine, now: number): ReturnEligibility {
  const status = orderStatus(order, now)
  const why = t.orders.cannot
  if (status === 'cancelled') return { ok: false, reason: why.cancelled }
  if (status !== 'delivered') return { ok: false, reason: why.notDelivered }
  if (findReturn(order, line.productId)) return { ok: false, reason: why.already }
  const policy = returnWindow(line.returnPolicy, order.placedAt, new Date(now))
  if (policy.kind === 'none') return { ok: false, reason: why.none }
  if (policy.kind === 'unknown') return { ok: false, reason: why.unknown(line.returnPolicy) }
  if (policy.kind === 'closed') return { ok: false, reason: why.closed(formatDay(policy.lastDay), policy.days) }
  return { ok: true, lastDay: policy.lastDay }
}

// A returned item (requested or refunded) belongs only under Returns: the order's
// Delivered view shows the items that were kept. Per item, so a partly returned
// order stays under Delivered and a fully returned one appears only under Returns.
export function keptLines(order: Order): OrderLine[] {
  return order.lines.filter((line) => !findReturn(order, line.productId))
}

export function returnedCount(order: Order): number {
  return order.lines.length - keptLines(order).length
}
