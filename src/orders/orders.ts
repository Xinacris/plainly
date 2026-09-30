import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Estimate } from '../lib/delivery'

export interface Address {
  fullName: string
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
}

export const EMPTY_ADDRESS: Address = { fullName: '', line1: '', line2: '', city: '', region: '', postalCode: '' }

// Everything an order shows is copied in when it's placed, so past orders keep
// the price, title and estimate they had even if the catalog changes.
export interface OrderLine {
  productId: number
  title: string
  thumbnail: string
  price: number
  quantity: number
  shippingInformation: string
  returnPolicy: string
  estimate?: Estimate
}

export const RETURN_REASONS = ['Changed my mind', 'Arrived damaged', 'Not as described', 'Wrong item sent', 'Other'] as const
export type ReturnReason = (typeof RETURN_REASONS)[number]

/** A return covers the whole line (all units of that item in the order). */
export interface ReturnRequest {
  productId: number
  reason: ReturnReason
  requestedAt: string
}

export interface Order {
  id: string
  placedAt: string
  address: Address
  lines: OrderLine[]
  total: number
  cancelledAt?: string
  returns?: ReturnRequest[]
}

interface OrdersState {
  /** Newest first. */
  orders: Order[]
  place: (order: Omit<Order, 'id' | 'placedAt'>) => Order
  /** Callers check the order can still be cancelled (see lib/orderStatus.ts). */
  cancel: (orderId: string) => void
  requestReturn: (orderId: string, productId: number, reason: ReturnReason) => void
}

function newOrderId(): string {
  return `PL-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export const useOrders = create<OrdersState>()(
  persist(
    (set) => ({
      orders: [],
      place: (draft) => {
        const order: Order = { ...draft, id: newOrderId(), placedAt: new Date().toISOString() }
        set(({ orders }) => ({ orders: [order, ...orders] }))
        return order
      },
      cancel: (orderId) =>
        set(({ orders }) => ({ orders: orders.map((o) => (o.id === orderId && !o.cancelledAt ? { ...o, cancelledAt: new Date().toISOString() } : o)) })),
      requestReturn: (orderId, productId, reason) =>
        set(({ orders }) => ({
          orders: orders.map((o) => {
            if (o.id !== orderId || o.returns?.some((r) => r.productId === productId)) return o
            return { ...o, returns: [...(o.returns ?? []), { productId, reason, requestedAt: new Date().toISOString() }] }
          }),
        })),
    }),
    { name: 'plainly-orders', version: 1 },
  ),
)

export function useOrder(id: string | undefined): Order | undefined {
  return useOrders((s) => s.orders.find((o) => o.id === id))
}

export function orderItemCount(order: Order): number {
  return order.lines.reduce((sum, l) => sum + l.quantity, 0)
}
