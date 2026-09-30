import { useCompare, useInCompare } from '../compare/compare'
import type { Product } from '../lib/catalog'
import { secondaryButton } from './styles'

function Box({ checked }: { checked: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0" aria-hidden="true">
      <rect x="2" y="2" width="16" height="16" rx="3" fill={checked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" />
      {checked && <path d="m6 10 3 3 5-6" fill="none" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

// On cards: a compact toggle that sits above the card's stretched link.
export function CompareToggle({ product }: { product: Product }) {
  const checked = useInCompare(product.id)
  const toggle = useCompare((s) => s.toggle)
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => toggle(product.id)}
      className={`relative z-10 inline-flex min-h-9 items-center gap-2 self-start rounded-md text-sm font-medium ${checked ? 'text-action' : 'text-muted hover:text-text'}`}
    >
      <Box checked={checked} />
      Compare<span className="sr-only"> {product.title}</span>
    </button>
  )
}

// On the product page: a full-width secondary button with its state in the label.
export function CompareButton({ product }: { product: Product }) {
  const checked = useInCompare(product.id)
  const toggle = useCompare((s) => s.toggle)
  return (
    <button type="button" onClick={() => toggle(product.id)} className={`${secondaryButton} w-full gap-2`}>
      <Box checked={checked} />
      {checked ? 'Added to compare' : 'Add to compare'}
    </button>
  )
}
