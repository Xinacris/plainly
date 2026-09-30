import { t } from '../i18n'

interface Props {
  value: number
  max: number
  onChange: (value: number) => void
  label: string
}

export function QuantityStepper({ value, max, onChange, label }: Props) {
  const button =
    'grid size-9 place-items-center rounded-md text-lg font-semibold hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div role="group" aria-label={t.quantity.group(label)} className="inline-flex items-center rounded-lg border border-border-strong bg-surface">
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={t.quantity.decrease}>
        −
      </button>
      <output aria-live="polite" className="w-8 text-center font-semibold tabular-nums">
        {value}
      </output>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t.quantity.increase}>
        +
      </button>
    </div>
  )
}
