import { useLocation } from 'react-router'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MAX_COMPARE = 3

export type ToggleResult = 'added' | 'removed' | 'full'

interface CompareState {
  ids: number[]
  /** True for a few seconds after an add was refused because the tray is full. */
  fullNotice: boolean
  toggle: (id: number) => ToggleResult
  remove: (id: number) => void
  clear: () => void
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined

export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      fullNotice: false,
      toggle: (id) => {
        const { ids } = get()
        if (ids.includes(id)) {
          set({ ids: ids.filter((x) => x !== id) })
          return 'removed'
        }
        if (ids.length >= MAX_COMPARE) {
          clearTimeout(noticeTimer)
          set({ fullNotice: true })
          noticeTimer = setTimeout(() => set({ fullNotice: false }), 5000)
          return 'full'
        }
        set({ ids: [...ids, id] })
        return 'added'
      },
      remove: (id) => set(({ ids }) => ({ ids: ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
    }),
    // Only the selection persists; the "full" notice is for this visit only.
    { name: 'plainly-compare', version: 1, partialize: ({ ids }) => ({ ids }) },
  ),
)

export function useInCompare(id: number): boolean {
  return useCompare((s) => s.ids.includes(id))
}

// The tray only appears where products are picked; checkout stays free of it.
export function useTrayVisible(): boolean {
  const { pathname } = useLocation()
  const count = useCompare((s) => s.ids.length)
  const onShoppingPage = pathname === '/' || pathname === '/search' || pathname.startsWith('/product/')
  return count > 0 && onShoppingPage
}
