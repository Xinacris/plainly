import { useState } from 'react'
import { localDataCounts, markAsked, moveLocalData, useAccountData, wasAsked } from '../account/data'
import { useAuth } from '../auth/auth'
import { pluralize } from '../lib/format'
import { useAddressBook } from '../orders/addresses'
import { useOrders } from '../orders/orders'
import { ConfirmDialog } from './ConfirmDialog'

function useLocalCounts() {
  const addresses = useAddressBook((s) => s.addresses.length)
  const orders = useOrders((s) => s.orders.length)
  return { addresses, orders, any: addresses + orders > 0 }
}

function describe({ addresses, orders }: { addresses: number; orders: number }): string {
  return [addresses ? pluralize(addresses, 'saved address', 'saved addresses') : '', orders ? pluralize(orders, 'order') : '']
    .filter(Boolean)
    .join(' and ')
}

function useSignedInReady(): string | null {
  const userId = useAuth((s) => (s.status === 'signed-in' ? (s.user?.id ?? null) : null))
  const ready = useAccountData((s) => s.status === 'ready' && s.userId === userId)
  return userId && ready ? userId : null
}

async function move(userId: string) {
  const error = await moveLocalData(userId)
  if (error) useAccountData.setState({ notice: `Couldn’t move this browser’s data: ${error} It’s still here; try again from Addresses or Orders.` })
}

// On the first sign-in in a browser that has addresses or orders, offer once to
// move them into the account. "Not now" is remembered for this account here.
export function MoveDataPrompt() {
  const userId = useSignedInReady()
  const counts = useLocalCounts()
  const [answered, setAnswered] = useState<string | null>(null)
  const open = Boolean(userId && counts.any && answered !== userId && !wasAsked(userId))
  return (
    <ConfirmDialog
      open={open}
      title="Move this browser’s data into your account?"
      confirmLabel="Move them"
      cancelLabel="Not now"
      onConfirm={() => {
        if (!userId) return
        setAnswered(userId)
        markAsked(userId)
        void move(userId)
      }}
      onCancel={() => {
        if (!userId) return
        setAnswered(userId)
        markAsked(userId)
      }}
    >
      <p>
        This browser has {describe(localDataCounts())} from before you signed in. Moving them makes them follow you to your
        other devices. Anything already in your account isn’t duplicated.
      </p>
      <p className="mt-2 text-muted">If you choose Not now, they stay in this browser and show again when you’re signed out.</p>
    </ConfirmDialog>
  )
}

// On Addresses and Orders: the same offer, whenever this browser still has data.
export function LocalDataNotice() {
  const userId = useSignedInReady()
  const counts = useLocalCounts()
  const [busy, setBusy] = useState(false)
  if (!userId || !counts.any) return null
  return (
    <p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
      This browser also has {describe(counts)} from before you signed in.{' '}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await move(userId)
          setBusy(false)
        }}
        className="font-medium text-action underline underline-offset-2 hover:text-action-hover"
      >
        {busy ? 'Moving…' : 'Move them into your account'}
      </button>
    </p>
  )
}

// The result of a move, once.
export function AccountNotice() {
  const notice = useAccountData((s) => s.notice)
  if (!notice) return null
  return (
    <div role="status" className="border-b border-border bg-surface">
      <p className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-2 text-sm">
        <span>{notice}</span>
        <button
          type="button"
          onClick={() => useAccountData.setState({ notice: '' })}
          className="shrink-0 font-medium text-action underline underline-offset-2"
        >
          Dismiss
        </button>
      </p>
    </div>
  )
}
