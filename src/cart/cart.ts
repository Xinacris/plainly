import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../lib/catalog'

export interface CartLine {
  productId: number
  quantity: number
}

// Never sell more than is in stock, and cap single-line quantities at 10.
export const MAX_PER_LINE = 10

export function maxQuantity(product: Product): number {
  return Math.min(product.stock, MAX_PER_LINE)
}

interface CartState {
  lines: CartLine[]
  /** Adds up to `quantity`, capped at `max`. Returns how many were actually added. */
  add: (productId: number, quantity: number, max: number) => number
  setQuantity: (productId: number, quantity: number) => void
  remove: (productId: number) => void
  /** Removes the given products, e.g. after they've been ordered. */
  removeMany: (productIds: number[]) => void
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (productId, quantity, max) => {
        const current = get().lines.find((l) => l.productId === productId)?.quantity ?? 0
        const next = Math.min(current + quantity, max)
        const added = next - current
        if (added <= 0) return 0
        set(({ lines }) => ({
          lines: current
            ? lines.map((l) => (l.productId === productId ? { ...l, quantity: next } : l))
            : [...lines, { productId, quantity: next }],
        }))
        return added
      },
      setQuantity: (productId, quantity) =>
        set(({ lines }) => ({
          lines: lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
        })),
      remove: (productId) => set(({ lines }) => ({ lines: lines.filter((l) => l.productId !== productId) })),
      removeMany: (productIds) => set(({ lines }) => ({ lines: lines.filter((l) => !productIds.includes(l.productId)) })),
    }),
    { name: 'plainly-cart', version: 1 },
  ),
)

export function useCartCount(): number {
  return useCart((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0))
}

export function useCartQuantity(productId: number): number {
  return useCart((s) => s.lines.find((l) => l.productId === productId)?.quantity ?? 0)
}

export interface ResolvedLine extends CartLine {
  product: Product
}

// Lines whose product is gone or out of stock are skipped, and stored quantities
// are clamped to what can actually be bought. Cart and checkout both use this.
export function resolveCart(lines: CartLine[], catalog: Product[]): ResolvedLine[] {
  return lines.flatMap((line) => {
    const product = catalog.find((p) => p.id === line.productId)
    if (!product || maxQuantity(product) === 0) return []
    return [{ ...line, product, quantity: Math.min(line.quantity, maxQuantity(product)) }]
  })
}

export function cartTotals(lines: ResolvedLine[]): { itemCount: number; subtotal: number } {
  return {
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal: lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
  }
}
