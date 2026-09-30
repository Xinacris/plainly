import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useCatalog, type Product } from '../lib/catalog'
import { departmentName, departmentOf } from '../lib/departments'

export const MAX_COMPARE = 3

// Products are compared within one department: a blender next to a car gives the
// shopper nothing to decide with. Department rather than category, because the
// categories here are narrow (laptop vs tablet is a real decision across two).
// The first product added sets the department.

export type ToggleResult = 'added' | 'removed' | 'full' | 'other-department'

interface CompareState {
  ids: number[]
  /** Department slug of the current comparison; null when the tray is empty. */
  department: string | null
  /** True for a few seconds after an add was refused because the tray is full. */
  fullNotice: boolean
  /** A product from another department waiting on "Start new" or "Cancel". */
  pending: { id: number; department: string } | null
  /** Set when a saved selection mixed departments and was cut down to the first one's. */
  mixedNotice: boolean
  toggle: (product: Product) => ToggleResult
  /** "Start new": clears the tray and adds the pending product. */
  startNew: () => void
  cancelPending: () => void
  remove: (id: number) => void
  clear: () => void
  dismissMixedNotice: () => void
  /** Brings a saved selection in line with the rule (and drops products that no longer exist). */
  reconcile: (catalog: Product[]) => void
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined

const departmentSlug = (product: Product) => departmentOf(product.category)?.slug ?? product.category

// The products that fit the rule, in the order added: those in the first product's department.
export function consistentProducts(ids: number[], catalog: Product[]): Product[] {
  const products = ids.flatMap((id) => catalog.filter((p) => p.id === id))
  const first = products[0]
  return first ? products.filter((p) => departmentSlug(p) === departmentSlug(first)) : []
}

export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      department: null,
      fullNotice: false,
      pending: null,
      mixedNotice: false,
      toggle: (product) => {
        const { ids, department } = get()
        const slug = departmentSlug(product)
        set({ mixedNotice: false })
        if (ids.includes(product.id)) {
          const rest = ids.filter((x) => x !== product.id)
          set({ ids: rest, department: rest.length ? department : null })
          return 'removed'
        }
        if (ids.length > 0 && department && slug !== department) {
          set({ pending: { id: product.id, department: slug } })
          return 'other-department'
        }
        if (ids.length >= MAX_COMPARE) {
          clearTimeout(noticeTimer)
          set({ fullNotice: true })
          noticeTimer = setTimeout(() => set({ fullNotice: false }), 5000)
          return 'full'
        }
        set({ ids: [...ids, product.id], department: slug })
        return 'added'
      },
      startNew: () => {
        const { pending } = get()
        if (pending) set({ ids: [pending.id], department: pending.department, pending: null })
      },
      cancelPending: () => set({ pending: null }),
      remove: (id) =>
        set(({ ids, department }) => {
          const rest = ids.filter((x) => x !== id)
          return { ids: rest, department: rest.length ? department : null, mixedNotice: false }
        }),
      clear: () => set({ ids: [], department: null, mixedNotice: false }),
      dismissMixedNotice: () => set({ mixedNotice: false }),
      reconcile: (catalog) => {
        const { ids, department } = get()
        const kept = consistentProducts(ids, catalog)
        const keptIds = kept.map((p) => p.id)
        const slug = kept[0] ? departmentSlug(kept[0]) : null
        const mixed = keptIds.length < ids.filter((id) => catalog.some((p) => p.id === id)).length
        if (keptIds.length !== ids.length || slug !== department) set({ ids: keptIds, department: slug, mixedNotice: mixed })
      },
    }),
    {
      name: 'plainly-compare',
      // v1 saved ids only, possibly across departments; reconcile() fixes those on load.
      version: 2,
      migrate: (saved) => ({ ids: [], department: null, ...(saved as object) }),
      // Only the selection persists; notices and the pending choice are for this visit.
      partialize: ({ ids, department }) => ({ ids, department }),
    },
  ),
)

export function useInCompare(id: number): boolean {
  return useCompare((s) => s.ids.includes(id))
}

/** The comparison's department, read from its first product. */
export function compareDepartmentName(products: Product[]): string {
  const department = products[0] ? departmentOf(products[0].category) : undefined
  if (department) return departmentName(department)
  return products[0]?.category ?? ''
}

/** The products being compared, repaired against the catalog once it's loaded. */
export function useCompareProducts(): Product[] {
  const catalog = useCatalog()
  const ids = useCompare((s) => s.ids)
  const reconcile = useCompare((s) => s.reconcile)
  // Syncing a saved (external) selection with the catalog; render uses the pure version meanwhile.
  useEffect(() => reconcile(catalog), [catalog, ids, reconcile])
  return consistentProducts(ids, catalog)
}

// The tray only appears where products are picked; checkout stays free of it.
export function useTrayVisible(): boolean {
  const { pathname } = useLocation()
  const count = useCompare((s) => s.ids.length)
  const onShoppingPage = pathname === '/' || pathname === '/search' || pathname.startsWith('/product/')
  return count > 0 && onShoppingPage
}
