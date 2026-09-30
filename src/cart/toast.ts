import { create } from 'zustand'

// One cart toast at a time: adding again while it's open updates it (and restarts
// its timer) instead of stacking a second one.
export interface CartToast {
  productId: number
  /** What was just added. */
  added: number
  /** This product's quantity in the cart after the add. */
  total: number
  /** Changes on every add, so the dismiss timer restarts. */
  id: number
  /** Where to show it: just below the header, measured when the add happened. */
  top: number
}

interface ToastState {
  toast: CartToast | null
  show: (productId: number, added: number, total: number) => void
  dismiss: () => void
}

function belowHeader(): number {
  const bottom = document.querySelector('body > #root header')?.getBoundingClientRect().bottom ?? 0
  return Math.max(8, bottom + 8)
}

let nextId = 1

export const useCartToast = create<ToastState>()((set) => ({
  toast: null,
  show: (productId, added, total) => set({ toast: { productId, added, total, id: nextId++, top: belowHeader() } }),
  dismiss: () => set({ toast: null }),
}))
