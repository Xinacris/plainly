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

export const STATUS_LABELS: Record<OrderStatus, string> = {
  preparing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

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

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// Per item: only after delivery, within that item's return window, and once.
export function canReturn(order: Order, line: OrderLine, now: number): ReturnEligibility {
  const status = orderStatus(order, now)
  if (status === 'cancelled') return { ok: false, reason: 'This order was cancelled.' }
  if (status !== 'delivered') return { ok: false, reason: 'Returns open once the order is delivered.' }
  if (findReturn(order, line.productId)) return { ok: false, reason: 'A return is already on its way.' }
  const policy = returnWindow(line.returnPolicy, order.placedAt, new Date(now))
  if (policy.kind === 'none') return { ok: false, reason: 'No returns for this item.' }
  if (policy.kind === 'unknown') return { ok: false, reason: `Returns: ${line.returnPolicy}` }
  if (policy.kind === 'closed') return { ok: false, reason: `Return window closed on ${day.format(policy.lastDay)} (${policy.days} days from the order date).` }
  return { ok: true, lastDay: policy.lastDay }
}
