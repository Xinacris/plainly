import { useRef, useState, type FormEvent } from 'react'
import { AddressFields } from '../components/AddressFields'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AddressBlock } from '../components/OrderLines'
import { primaryButton, secondaryButton } from '../components/styles'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { validateAddress, type AddressErrors } from '../orders/address'
import { useAddressBookData } from '../account/hooks'
import { LocalDataNotice } from '../components/MoveDataPrompt'
import { StatusMessage } from '../components/StatusMessage'
import type { SavedAddress } from '../orders/addresses'
import { EMPTY_ADDRESS, type Address } from '../orders/orders'

const linkButton = 'text-sm font-medium text-action underline underline-offset-2 hover:text-action-hover'

// Add or edit, with the same validation as checkout: errors after the first
// attempt, and focus on the first field that needs fixing.
function AddressForm({ initial, submitLabel, onSubmit, onCancel }: { initial: Address; submitLabel: string; onSubmit: (a: Address) => void | Promise<void>; onCancel: () => void }) {
  const [value, setValue] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const errors: AddressErrors = submitted ? validateAddress(value) : {}

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const invalid = Object.keys(validateAddress(value))
    if (invalid.length) {
      form.current?.querySelector<HTMLInputElement>(`[name="${invalid[0]}"]`)?.focus()
      return
    }
    onSubmit(value)
  }

  return (
    <form ref={form} onSubmit={handleSubmit} noValidate>
      <AddressFields value={value} errors={errors} onChange={setValue} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" className={primaryButton}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  )
}

interface CardProps {
  address: SavedAddress
  isDefault: boolean
  onDelete: () => void
  /** Each returns true when it worked; the page shows any error. */
  onUpdate: (id: string, address: Address) => Promise<boolean>
  onMakeDefault: (id: string) => void
}

function AddressCard({ address, isDefault, onDelete, onUpdate, onMakeDefault }: CardProps) {
  const [editing, setEditing] = useState(false)
  const { id: _id, ...fields } = address

  if (editing) {
    return (
      <li className="rounded-xl border border-action bg-surface p-4 sm:col-span-2">
        <h2 className="font-bold">Edit address</h2>
        <AddressForm
          initial={fields}
          submitLabel="Save changes"
          onSubmit={async (next) => {
            if (await onUpdate(address.id, next)) setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="flex flex-col rounded-xl border border-border bg-surface p-4">
      {isDefault && <p className="mb-1 text-xs font-semibold text-action uppercase">Default</p>}
      <AddressBlock address={address} />
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3">
        <button type="button" onClick={() => setEditing(true)} className={linkButton}>
          Edit<span className="sr-only"> address for {address.fullName}</span>
        </button>
        <button type="button" onClick={onDelete} className={linkButton}>
          Delete<span className="sr-only"> address for {address.fullName}</span>
        </button>
        {!isDefault && (
          <button type="button" onClick={() => onMakeDefault(address.id)} className={linkButton}>
            Make default<span className="sr-only"> ({address.fullName})</span>
          </button>
        )}
      </div>
    </li>
  )
}

export function AddressesPage() {
  useDocumentTitle('Addresses')
  const book = useAddressBookData()
  const { addresses, defaultId } = book
  const [actionError, setActionError] = useState('')
  // Runs an address change; in an account it can fail (e.g. the service is unreachable).
  const run = async (change: Promise<string | null>) => {
    const error = await change
    setActionError(error ?? '')
    return !error
  }
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<SavedAddress | null>(null)

  if (book.status === 'loading') return <StatusMessage role="status" title="Loading your addresses…" />
  if (book.status === 'error') {
    return (
      <StatusMessage
        role="alert"
        title="Your addresses couldn’t load"
        action={
          <button type="button" onClick={book.retry} className={primaryButton}>
            Try again
          </button>
        }
      >
        {book.error}
      </StatusMessage>
    )
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Addresses</h1>
          <p className="mt-1 text-sm text-muted">
            {book.mode === 'account' ? 'Saved to your account, so they follow you across devices.' : 'Saved in this browser only.'}{' '}
            Checkout preselects the default. Past orders keep their own copy, so changes here never alter them.
          </p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={primaryButton}>
            Add an address
          </button>
        )}
      </div>

      <LocalDataNotice />
      {actionError && (
        <p role="alert" className="mt-4 rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning">
          {actionError}
        </p>
      )}

      {adding && (
        <div className="mt-4 rounded-xl border border-action bg-surface p-4">
          <h2 className="font-bold">New address</h2>
          <AddressForm
            initial={EMPTY_ADDRESS}
            submitLabel="Save address"
            onSubmit={async (address) => {
              if (await run(book.add(address))) setAdding(false)
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {addresses.length === 0 && !adding && (
        <p className="mt-8 rounded-xl border border-dashed border-border-strong p-6 text-center text-muted">
          No saved addresses yet. Add one here, or tick “Save this address for later” at checkout.
        </p>
      )}

      {addresses.length > 0 && (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              isDefault={a.id === defaultId}
              onDelete={() => setDeleting(a)}
              onUpdate={(id, next) => run(book.update(id, next))}
              onMakeDefault={(id) => void run(book.setDefault(id))}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this address?"
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) void run(book.remove(deleting.id))
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      >
        {deleting && (
          <>
            <AddressBlock address={deleting} />
            <p className="mt-2 text-muted">
              {deleting.id === defaultId && addresses.length > 1 ? 'The next address becomes your default. ' : ''}
              Past orders keep their own copy of this address.
            </p>
          </>
        )}
      </ConfirmDialog>
    </section>
  )
}
