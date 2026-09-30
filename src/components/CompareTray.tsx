import { Suspense } from 'react'
import { Link } from 'react-router'
import { MAX_COMPARE, useCompare, useTrayVisible } from '../compare/compare'
import { useCatalog } from '../lib/catalog'
import { pluralize } from '../lib/format'
import { ProductImage } from './ProductImage'
import { primaryButton } from './styles'

function FullNotice() {
  const fullNotice = useCompare((s) => s.fullNotice)
  return (
    <p aria-live="polite" className="text-sm font-medium text-warning empty:hidden">
      {fullNotice && `You can compare up to ${MAX_COMPARE}. Remove one to add another.`}
    </p>
  )
}

function TrayContents() {
  const catalog = useCatalog()
  const ids = useCompare((s) => s.ids)
  const remove = useCompare((s) => s.remove)
  const clear = useCompare((s) => s.clear)
  const products = ids.flatMap((id) => catalog.filter((p) => p.id === id))
  const needed = 2 - products.length

  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <ul className="flex gap-2" aria-label="Products to compare">
        {products.map((p) => (
          <li key={p.id} className="relative">
            <ProductImage src={p.thumbnail} alt={p.title} className="w-12 p-1 sm:w-14" />
            <button
              type="button"
              onClick={() => remove(p.id)}
              aria-label={`Remove ${p.title} from compare`}
              className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border border-border-strong bg-surface text-muted hover:text-text"
            >
              <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </li>
        ))}
        {Array.from({ length: MAX_COMPARE - products.length }, (_, i) => (
          <li key={`empty-${i}`} aria-hidden="true" className="size-12 rounded-lg border-2 border-dashed border-border sm:size-14" />
        ))}
      </ul>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="font-semibold whitespace-nowrap">
            Compare {products.length} of {MAX_COMPARE}
          </span>
          <button type="button" onClick={clear} className="font-medium text-muted underline underline-offset-2 hover:text-text">
            Clear
          </button>
        </p>
        <FullNotice />
      </div>
      {/* Phones: a second row with a full-width action. From sm: inline at the end. */}
      <div className="w-full sm:w-auto">
        {needed > 0 && <p className="text-sm text-muted">Add {pluralize(needed, 'more product')} to compare</p>}
        {needed <= 0 && (
          <Link to="/compare" className={`${primaryButton} h-10 w-full sm:w-auto`}>
            Compare
          </Link>
        )}
      </div>
    </div>
  )
}

// Slides up from the bottom when it appears, unless reduced motion is preferred.
export function CompareTray() {
  const visible = useTrayVisible()
  if (!visible) return null
  return (
    <section
      aria-label="Compare"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface shadow-[0_-4px_16px_rgb(0_0_0/0.08)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:translate-y-full"
    >
      <Suspense fallback={null}>
        <TrayContents />
      </Suspense>
    </section>
  )
}
