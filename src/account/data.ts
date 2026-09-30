import { create } from 'zustand'
import { authMessage, isDemo, useAuth } from '../auth/auth'
import { orderStatus } from '../lib/orderStatus'
import { isOffline, OFFLINE } from '../lib/network'
import { getSupabase, UNREACHABLE } from '../lib/supabase'
import { trimAddress, useAddressBook, type SavedAddress } from '../orders/addresses'
import { newOrderId, useOrders, type Address, type Order, type OrderLine, type ReturnReason } from '../orders/orders'

// Signed in, addresses, orders and returns live in Supabase (limited to your own
// rows by RLS) and follow you across devices. This store is the in-memory copy
// of them for the current session; it's reloaded on sign-in and cleared on sign-out.
// Order and return statuses are still computed from timestamps on the client.

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AccountDataState {
  userId: string | null
  status: LoadStatus
  error: string
  addresses: SavedAddress[]
  defaultId: string | null
  /** The profile's name, for the phone menu; empty when none is set. */
  fullName: string
  orders: Order[]
  /** A short message after moving this browser's data in; shown once, then dismissed. */
  notice: string
}

export const useAccountData = create<AccountDataState>()(() => ({
  userId: null,
  status: 'idle',
  error: '',
  addresses: [],
  defaultId: null,
  fullName: '',
  orders: [],
  notice: '',
}))

type Row = Record<string, unknown>

function toAddress(row: Row): SavedAddress {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    line1: row.line1 as string,
    line2: (row.line2 as string) ?? '',
    city: row.city as string,
    region: row.region as string,
    postalCode: row.postal_code as string,
  }
}

function addressRow(a: Address): Row {
  const t = trimAddress(a)
  return { full_name: t.fullName, line1: t.line1, line2: t.line2, city: t.city, region: t.region, postal_code: t.postalCode }
}

function toOrder(row: Row, returns: Row[]): Order {
  const mine = returns.filter((r) => r.order_id === row.id)
  return {
    id: row.id as string,
    placedAt: row.placed_at as string,
    address: row.address as Address,
    lines: row.lines as OrderLine[],
    total: Number(row.total),
    ...(row.cancelled_at ? { cancelledAt: row.cancelled_at as string } : {}),
    ...(mine.length
      ? { returns: mine.map((r) => ({ productId: r.product_id as number, reason: r.reason as ReturnReason, requestedAt: r.requested_at as string })) }
      : {}),
  }
}

async function client() {
  // Nothing is sent while offline (or simulating it), so nothing half-changes.
  if (isOffline()) throw new Error(OFFLINE)
  const supabase = await getSupabase()
  if (!supabase) throw new Error(UNREACHABLE)
  return supabase
}

const current = () => useAccountData.getState()
const set = (partial: Partial<AccountDataState>) => useAccountData.setState(partial)

export async function loadAccountData(userId: string, { skipDemoRefresh = false } = {}): Promise<void> {
  set({ userId, status: 'loading', error: '' })
  try {
    const supabase = await client()
    const [addresses, profile, orders, returns] = await Promise.all([
      supabase.from('addresses').select('*').order('created_at', { ascending: true }),
      supabase.from('profiles').select('default_address_id, full_name').eq('id', userId).maybeSingle(),
      supabase.from('orders').select('*').order('placed_at', { ascending: false }),
      supabase.from('order_returns').select('*'),
    ])
    const error = addresses.error ?? profile.error ?? orders.error ?? returns.error
    if (error) throw error
    if (current().userId !== userId) return // signed out or switched meanwhile
    set({
      status: 'ready',
      addresses: (addresses.data ?? []).map(toAddress),
      defaultId: (profile.data?.default_address_id as string | null) ?? null,
      // Before the profile exists (it's made on first visit to Profile), the name given at sign-up.
      fullName: ((profile.data?.full_name || useAuth.getState().user?.user_metadata?.full_name || '') as string).trim(),
      orders: (orders.data ?? []).map((o) => toOrder(o, returns.data ?? [])),
    })
    if (!skipDemoRefresh && isDemo(useAuth.getState().user)) void refreshDemoOrders(userId)
  } catch (error) {
    if (current().userId === userId) set({ status: 'error', error: authMessage(error) })
  }
}

// Follow the session: load on sign-in, clear on sign-out.
useAuth.subscribe((state, previous) => {
  const id = state.status === 'signed-in' ? state.user?.id ?? null : null
  const before = previous.status === 'signed-in' ? previous.user?.id ?? null : null
  if (id === before && !(id && current().status === 'idle')) return
  if (id) void loadAccountData(id)
  else set({ userId: null, status: 'idle', error: '', addresses: [], defaultId: null, fullName: '', orders: [], notice: '' })
})

// The demo account's Preparing and Shipped orders only last minutes (the status is
// simulated from timestamps). When the demo signs in with nothing on its way, its two
// fixed live orders are re-dated by a database function that only the demo account
// may call, so nothing new is created and the shared account never piles up orders.
async function refreshDemoOrders(userId: string): Promise<void> {
  const now = Date.now()
  if (current().orders.some((o) => ['preparing', 'shipped'].includes(orderStatus(o, now)))) return
  try {
    const supabase = await client()
    const { error } = await supabase.rpc('refresh_demo_orders')
    if (!error) await loadAccountData(userId, { skipDemoRefresh: true })
  } catch {
    // Not essential: the demo still works without it.
  }
}

/** Runs an account write; returns a plain-language error, or null when it worked. */
async function attempt(write: () => Promise<void>): Promise<string | null> {
  try {
    await write()
    return null
  } catch (error) {
    return authMessage(error)
  }
}

async function setDefaultRemote(userId: string, defaultId: string | null) {
  const supabase = await client()
  const { error } = await supabase.from('profiles').upsert({ id: userId, default_address_id: defaultId })
  if (error) throw error
  set({ defaultId })
}

// Addresses ------------------------------------------------------------------

export function addAddress(userId: string, address: Address): Promise<string | null> {
  return attempt(async () => {
    const supabase = await client()
    const { data, error } = await supabase.from('addresses').insert(addressRow(address)).select().single()
    if (error) throw error
    set({ addresses: [...current().addresses, toAddress(data)] })
    // The first address saved becomes the default.
    if (!current().defaultId) await setDefaultRemote(userId, data.id as string)
  })
}

export function updateAddress(id: string, address: Address): Promise<string | null> {
  return attempt(async () => {
    const supabase = await client()
    const { data, error } = await supabase.from('addresses').update(addressRow(address)).eq('id', id).select().single()
    if (error) throw error
    set({ addresses: current().addresses.map((a) => (a.id === id ? toAddress(data) : a)) })
  })
}

export function removeAddress(userId: string, id: string): Promise<string | null> {
  return attempt(async () => {
    const supabase = await client()
    const { error } = await supabase.from('addresses').delete().eq('id', id)
    if (error) throw error
    const rest = current().addresses.filter((a) => a.id !== id)
    const wasDefault = current().defaultId === id
    set({ addresses: rest, ...(wasDefault ? { defaultId: null } : {}) })
    // The database clears the default; the next address in the list takes over.
    if (wasDefault && rest[0]) await setDefaultRemote(userId, rest[0].id)
  })
}

export function setDefaultAddress(userId: string, id: string): Promise<string | null> {
  return attempt(() => setDefaultRemote(userId, id))
}

// Orders ---------------------------------------------------------------------

export async function placeOrder(draft: Omit<Order, 'id' | 'placedAt'>): Promise<{ order?: Order; error?: string }> {
  const order: Order = { ...draft, id: newOrderId(), placedAt: new Date().toISOString() }
  const error = await attempt(async () => {
    const supabase = await client()
    const { error: insertError } = await supabase
      .from('orders')
      .insert({ id: order.id, placed_at: order.placedAt, address: order.address, lines: order.lines, total: order.total })
    if (insertError) throw insertError
    set({ orders: [order, ...current().orders] })
  })
  return error ? { error } : { order }
}

export function cancelOrder(orderId: string): Promise<string | null> {
  return attempt(async () => {
    const supabase = await client()
    const cancelledAt = new Date().toISOString()
    const { data, error } = await supabase.from('orders').update({ cancelled_at: cancelledAt }).eq('id', orderId).select('id')
    if (error) throw error
    // The database only allows it while Preparing; nothing updated means it has shipped.
    if (!data?.length) throw new Error('This order has already shipped, so it can’t be cancelled.')
    set({ orders: current().orders.map((o) => (o.id === orderId ? { ...o, cancelledAt } : o)) })
  })
}

export function requestReturnRemote(orderId: string, productId: number, reason: ReturnReason): Promise<string | null> {
  return attempt(async () => {
    const supabase = await client()
    const requestedAt = new Date().toISOString()
    const { error } = await supabase.from('order_returns').insert({ order_id: orderId, product_id: productId, reason, requested_at: requestedAt })
    if (error) throw error
    set({
      orders: current().orders.map((o) =>
        o.id === orderId ? { ...o, returns: [...(o.returns ?? []), { productId, reason, requestedAt }] } : o,
      ),
    })
  })
}

// Moving this browser's data into the account -----------------------------------

const same = (a: Address, b: Address) =>
  (['fullName', 'line1', 'line2', 'city', 'region', 'postalCode'] as const).every(
    (k) => a[k].trim().toLowerCase() === b[k].trim().toLowerCase(),
  )

export function localDataCounts(): { addresses: number; orders: number } {
  return { addresses: useAddressBook.getState().addresses.length, orders: useOrders.getState().orders.length }
}

const askedKey = (userId: string) => `plainly-move-asked:${userId}`

export function wasAsked(userId: string): boolean {
  try {
    return localStorage.getItem(askedKey(userId)) === '1'
  } catch {
    return true // no storage: don't nag
  }
}

export function markAsked(userId: string): void {
  try {
    localStorage.setItem(askedKey(userId), '1')
  } catch {
    // ignore: at worst the offer shows again
  }
}

/**
 * Moves this browser's addresses, orders and returns into the account. Safe to run
 * twice: orders and returns keep their ids and duplicates are ignored; an address
 * already in the account (same id, or the same details) is skipped. The browser's
 * copy is cleared only once everything is in.
 */
export async function moveLocalData(userId: string): Promise<string | null> {
  const localAddresses = useAddressBook.getState().addresses
  const localDefault = useAddressBook.getState().defaultId
  const localOrders = useOrders.getState().orders
  const error = await attempt(async () => {
    const supabase = await client()
    const existing = current().addresses
    const fresh = localAddresses.filter((a) => !existing.some((e) => e.id === a.id || same(e, a)))
    if (fresh.length) {
      const { error: addressError } = await supabase
        .from('addresses')
        .upsert(fresh.map((a) => ({ id: a.id, ...addressRow(a) })), { onConflict: 'id', ignoreDuplicates: true })
      if (addressError) throw addressError
    }
    if (localOrders.length) {
      const rows = localOrders.map((o) => ({
        id: o.id,
        placed_at: o.placedAt,
        address: o.address,
        lines: o.lines,
        total: o.total,
        cancelled_at: o.cancelledAt ?? null,
      }))
      const { error: orderError } = await supabase.from('orders').upsert(rows, { onConflict: 'user_id,id', ignoreDuplicates: true })
      if (orderError) throw orderError
      const returns = localOrders.flatMap((o) =>
        (o.returns ?? []).map((r) => ({ order_id: o.id, product_id: r.productId, reason: r.reason, requested_at: r.requestedAt })),
      )
      if (returns.length) {
        const { error: returnError } = await supabase
          .from('order_returns')
          .upsert(returns, { onConflict: 'user_id,order_id,product_id', ignoreDuplicates: true })
        if (returnError) throw returnError
      }
    }
    // Keep the browser's default if the account has none yet.
    if (!current().defaultId && localDefault && [...existing, ...fresh].some((a) => a.id === localDefault)) {
      await setDefaultRemote(userId, localDefault)
    }
  })
  if (error) return error
  useAddressBook.setState({ addresses: [], defaultId: null })
  useOrders.setState({ orders: [] })
  markAsked(userId)
  await loadAccountData(userId)
  const parts = [
    localAddresses.length ? `${localAddresses.length} address${localAddresses.length === 1 ? '' : 'es'}` : '',
    localOrders.length ? `${localOrders.length} order${localOrders.length === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  set({ notice: `Moved ${parts.join(' and ')} from this browser into your account.` })
  return null
}
