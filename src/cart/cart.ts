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
