import { useState } from 'react'
import { localDataCounts, markAsked, moveLocalData, useAccountData, wasAsked } from '../account/data'
import { useAuth } from '../auth/auth'
import { t } from '../i18n'
import { useAddressBook } from '../orders/addresses'
import { useOrders } from '../orders/orders'
import { ConfirmDialog } from './ConfirmDialog'

function useLocalCounts() {
  const addresses = useAddressBook((s) => s.addresses.length)
  const orders = useOrders((s) => s.orders.length)
  return { addresses, orders, any: addresses + orders > 0 }
}

function describe({ addresses, orders }: { addresses: number; orders: number }): string {
  return t.moveData.describe(addresses, orders)
}

function useSignedInReady(): string | null {
  const userId = useAuth((s) => (s.status === 'signed-in' ? (s.user?.id ?? null) : null))
  const ready = useAccountData((s) => s.status === 'ready' && s.userId === userId)
  return userId && ready ? userId : null
}

async function move(userId: string) {
  const error = await moveLocalData(userId)
  if (error) useAccountData.setState({ notice: t.moveData.failed(error) })
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
      title={t.moveData.title}
      confirmLabel={t.moveData.confirm}
      cancelLabel={t.moveData.notNow}
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
      <p>{t.moveData.body(describe(localDataCounts()))}</p>
      <p className="mt-2 text-muted">{t.moveData.notNowNote}</p>
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
      {t.moveData.alsoHas(describe(counts))}{' '}
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
        {busy ? t.moveData.moving : t.moveData.moveThem}
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
          {t.common.dismiss}
        </button>
      </p>
    </div>
  )
}
