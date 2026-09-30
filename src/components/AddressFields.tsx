import { useId } from 'react'
import { ADDRESS_FIELDS, fieldLabel, type AddressErrors } from '../orders/address'
import type { Address } from '../orders/orders'

interface Props {
  value: Address
  errors: AddressErrors
  onChange: (value: Address) => void
}

export function AddressFields({ value, errors, onChange }: Props) {
  const id = useId()
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      {ADDRESS_FIELDS.map((field) => {
        const inputId = `${id}-${field.name}`
        const error = errors[field.name]
        return (
          <div key={field.name} className={`flex flex-col gap-1 ${field.wide ? 'sm:col-span-3' : ''}`}>
            <label htmlFor={inputId} className="text-sm font-medium">
              {fieldLabel(field.name)}
            </label>
            <input
              id={inputId}
              name={field.name}
              autoComplete={`shipping ${field.autoComplete}`}
              required={field.required}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              value={value[field.name]}
              onChange={(e) => onChange({ ...value, [field.name]: e.target.value })}
              className={`h-11 rounded-lg border bg-surface px-3 text-text ${error ? 'border-warning' : 'border-border-strong'}`}
            />
            {error && (
              <p id={`${inputId}-error`} className="text-sm text-warning">
                {error}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
