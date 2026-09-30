import { t } from '../i18n'
import type { Address } from './orders'

export type AddressErrors = Partial<Record<keyof Address, string>>

interface FieldSpec {
  name: keyof Address
  autoComplete: string
  required: boolean
  /** Grid span on wider screens. */
  wide?: boolean
}

// Order matters: validation focuses the first invalid field in this order.
export const ADDRESS_FIELDS: FieldSpec[] = [
  { name: 'fullName', autoComplete: 'name', required: true, wide: true },
  { name: 'line1', autoComplete: 'address-line1', required: true, wide: true },
  { name: 'line2', autoComplete: 'address-line2', required: false, wide: true },
  { name: 'city', autoComplete: 'address-level2', required: true },
  { name: 'region', autoComplete: 'address-level1', required: true },
  { name: 'postalCode', autoComplete: 'postal-code', required: true },
]

export const fieldLabel = (name: keyof Address): string => t.address[name]

export function validateAddress(address: Address): AddressErrors {
  const errors: AddressErrors = {}
  for (const field of ADDRESS_FIELDS) {
    if (field.required && !address[field.name].trim()) errors[field.name] = t.address.required[field.name]
  }
  return errors
}
