import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Address } from './orders'

// The address book lives in this browser, like the cart. Orders keep their own
// copy of the address, so editing or deleting one here never changes a past order.
export interface SavedAddress extends Address {
  id: string
}

interface AddressBookState {
  addresses: SavedAddress[]
  defaultId: string | null
  /** The first address saved becomes the default. Returns the new id. */
  add: (address: Address, makeDefault?: boolean) => string
  update: (id: string, address: Address) => void
  /** Deleting the default makes the next one in the list (the default is listed first) the default. */
  remove: (id: string) => void
  setDefault: (id: string) => void
}

export function trimAddress(address: Address): Address {
  return Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v.trim()])) as unknown as Address
}

export const useAddressBook = create<AddressBookState>()(
  persist(
    (set, get) => ({
      addresses: [],
      defaultId: null,
      add: (address, makeDefault = false) => {
        const id = crypto.randomUUID()
        const { addresses, defaultId } = get()
        set({ addresses: [...addresses, { ...trimAddress(address), id }], defaultId: makeDefault || !defaultId ? id : defaultId })
        return id
      },
      update: (id, address) => set(({ addresses }) => ({ addresses: addresses.map((a) => (a.id === id ? { ...trimAddress(address), id } : a)) })),
      remove: (id) =>
        set(({ addresses, defaultId }) => {
          const rest = addresses.filter((a) => a.id !== id)
          if (defaultId !== id) return { addresses: rest }
          // The default is listed first, so the next one is the first of the rest.
          return { addresses: rest, defaultId: rest[0]?.id ?? null }
        }),
      setDefault: (id) => set({ defaultId: id }),
    }),
    { name: 'plainly-addresses', version: 1 },
  ),
)

/** Saved addresses with the default first, then in the order they were added. */
export function useSortedAddresses(): { addresses: SavedAddress[]; defaultId: string | null } {
  const addresses = useAddressBook((s) => s.addresses)
  const defaultId = useAddressBook((s) => s.defaultId)
  const sorted = [...addresses].sort((a, b) => Number(b.id === defaultId) - Number(a.id === defaultId))
  return { addresses: sorted, defaultId }
}
