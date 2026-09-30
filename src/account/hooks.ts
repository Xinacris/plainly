import { useAuth } from '../auth/auth'
import { SUPABASE_CONFIGURED } from '../lib/supabase'
import { useAddressBook, type SavedAddress } from '../orders/addresses'
import { useOrders, type Address, type Order, type ReturnReason } from '../orders/orders'
import {
  addAddress,
  cancelOrder,
  loadAccountData,
  placeOrder,
  removeAddress,
  requestReturnRemote,
  setDefaultAddress,
  updateAddress,
  useAccountData,
} from './data'

// One set of hooks for the pages, whichever place the data lives: this browser
// when signed out (exactly as before), the account when signed in. Actions return
// a plain-language error, or null when they worked.

export type DataStatus = 'loading' | 'ready' | 'error'

interface Source {
  mode: 'browser' | 'account'
  status: DataStatus
  error: string
  retry: () => void
}

const STATUS: Record<'idle' | 'loading' | 'ready' | 'error', DataStatus> = { idle: 'loading', loading: 'loading', ready: 'ready', error: 'error' }

/** Wraps a browser-store action so it has the same shape as an account write. */
function done<A extends unknown[]>(action: (...args: A) => unknown) {
  return async (...args: A): Promise<string | null> => {
    action(...args)
    return null
  }
}

function useSource(): Source & { userId: string | null } {
  const authStatus = useAuth((s) => s.status)
  const userId = useAuth((s) => (s.status === 'signed-in' ? (s.user?.id ?? null) : null))
  const status = useAccountData((s) => s.status)
  const error = useAccountData((s) => s.error)
  if (SUPABASE_CONFIGURED && authStatus === 'loading') return { mode: 'browser', status: 'loading', error: '', retry: () => {}, userId: null }
  if (!userId) return { mode: 'browser', status: 'ready', error: '', retry: () => {}, userId: null }
  return { mode: 'account', status: STATUS[status], error, retry: () => void loadAccountData(userId), userId }
}

const sortDefaultFirst = (addresses: SavedAddress[], defaultId: string | null) =>
  [...addresses].sort((a, b) => Number(b.id === defaultId) - Number(a.id === defaultId))

export function useAddressBookData() {
  const source = useSource()
  const local = useAddressBook()
  const remote = useAccountData()
  const userId = source.userId
  if (source.mode === 'browser' || !userId) {
    return {
      ...source,
      addresses: sortDefaultFirst(local.addresses, local.defaultId),
      defaultId: local.defaultId,
      add: done((a: Address) => local.add(a)),
      update: done(local.update),
      remove: done(local.remove),
      setDefault: done(local.setDefault),
    }
  }
  return {
    ...source,
    addresses: sortDefaultFirst(remote.addresses, remote.defaultId),
    defaultId: remote.defaultId,
    add: (a: Address) => addAddress(userId, a),
    update: (id: string, a: Address) => updateAddress(id, a),
    remove: (id: string) => removeAddress(userId, id),
    setDefault: (id: string) => setDefaultAddress(userId, id),
  }
}

export function useOrdersData() {
  const source = useSource()
  const local = useOrders()
  const remote = useAccountData((s) => s.orders)
  if (source.mode === 'browser') {
    return {
      ...source,
      orders: local.orders,
      place: async (draft: Omit<Order, 'id' | 'placedAt'>): Promise<{ order?: Order; error?: string }> => ({ order: local.place(draft) }),
      cancel: done(local.cancel),
      requestReturn: done((orderId: string, productId: number, reason: ReturnReason) => local.requestReturn(orderId, productId, reason)),
    }
  }
  return {
    ...source,
    orders: remote,
    place: placeOrder,
    cancel: cancelOrder,
    requestReturn: requestReturnRemote,
  }
}
