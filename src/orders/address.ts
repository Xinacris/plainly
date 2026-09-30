import type { Address } from './orders'

export type AddressErrors = Partial<Record<keyof Address, string>>

interface FieldSpec {
  name: keyof Address
  label: string
  autoComplete: string
  required: boolean
  /** Grid span on wider screens. */
  wide?: boolean
}

// Order matters: validation focuses the first invalid field in this order.
export const ADDRESS_FIELDS: FieldSpec[] = [
  { name: 'fullName', label: 'Full name', autoComplete: 'name', required: true, wide: true },
  { name: 'line1', label: 'Street address', autoComplete: 'address-line1', required: true, wide: true },
  { name: 'line2', label: 'Apartment, suite, etc. (optional)', autoComplete: 'address-line2', required: false, wide: true },
  { name: 'city', label: 'City', autoComplete: 'address-level2', required: true },
  { name: 'region', label: 'State or region', autoComplete: 'address-level1', required: true },
  { name: 'postalCode', label: 'ZIP or postal code', autoComplete: 'postal-code', required: true },
]

// "Full name" → "full name", but "ZIP or postal code" keeps its acronym.
const inSentence = (label: string) => (/^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label)

export function validateAddress(address: Address): AddressErrors {
  const errors: AddressErrors = {}
  for (const field of ADDRESS_FIELDS) {
    if (field.required && !address[field.name].trim()) errors[field.name] = `Enter your ${inSentence(field.label)}.`
  }
  return errors
}
