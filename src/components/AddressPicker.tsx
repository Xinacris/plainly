import { useId } from 'react'
import { Link } from 'react-router'
import type { AddressErrors } from '../orders/address'
import type { SavedAddress } from '../orders/addresses'
import type { Address } from '../orders/orders'
import { AddressFields } from './AddressFields'
import { AddressBlock } from './OrderLines'

export type AddressChoice = { kind: 'saved'; id: string } | { kind: 'new' }

interface Props {
  saved: SavedAddress[]
  defaultId: string | null
  choice: AddressChoice
  onChoose: (choice: AddressChoice) => void
  draft: Address
  onDraftChange: (address: Address) => void
  errors: AddressErrors
  save: boolean
  onSaveChange: (save: boolean) => void
}

const card = 'flex cursor-pointer gap-3 rounded-lg border p-3 has-checked:border-action has-checked:ring-1 has-checked:ring-action'

// Checkout's address step: saved addresses as selectable cards (the default is
// preselected by the caller), or a new address typed inline and, if ticked, saved.
export function AddressPicker({ saved, defaultId, choice, onChoose, draft, onDraftChange, errors, save, onSaveChange }: Props) {
  const name = useId()
  const newForm = (
    <>
      <AddressFields value={draft} errors={errors} onChange={onDraftChange} />
      <label className="mt-4 flex min-h-9 cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={save} onChange={(e) => onSaveChange(e.target.checked)} className="size-4 accent-action" />
        Save this address for later
      </label>
    </>
  )

  if (saved.length === 0) return newForm

  return (
    <>
      <fieldset className="mt-4">
        <legend className="sr-only">Choose a shipping address</legend>
        <ul className="grid gap-3 sm:grid-cols-2">
          {saved.map((a) => (
            <li key={a.id}>
              <label className={`${card} border-border-strong`}>
                <input
                  type="radio"
                  name={name}
                  checked={choice.kind === 'saved' && choice.id === a.id}
                  onChange={() => onChoose({ kind: 'saved', id: a.id })}
                  className="mt-1 size-4 shrink-0 accent-action"
                />
                <span className="min-w-0 text-sm">
                  {a.id === defaultId && <span className="mb-1 block text-xs font-semibold text-action uppercase">Default</span>}
                  <AddressBlock address={a} />
                </span>
              </label>
            </li>
          ))}
          <li>
            <label className={`${card} h-full items-center border-dashed border-border-strong`}>
              <input
                type="radio"
                name={name}
                checked={choice.kind === 'new'}
                onChange={() => onChoose({ kind: 'new' })}
                className="size-4 shrink-0 accent-action"
              />
              <span className="text-sm font-semibold">Add a new address</span>
            </label>
          </li>
        </ul>
      </fieldset>
      {choice.kind === 'new' && newForm}
      <p className="mt-3 text-sm">
        <Link to="/addresses" className="font-medium text-action underline underline-offset-2 hover:text-action-hover">
          Manage addresses
        </Link>
      </p>
    </>
  )
}
