import { Suspense, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { FilterChips } from '../components/FilterChips'
import { FilterPanel } from '../components/FilterPanel'
import { ProductCard, ProductCardSkeleton, gridClass } from '../components/ProductCard'
import { StatusMessage } from '../components/StatusMessage'
import { primaryButton, secondaryButton } from '../components/styles'
import { useCatalog, type Product } from '../lib/catalog'
import { findDepartment } from '../lib/departments'
import { filterChips, matchesFilters, NO_FILTERS, parseFilters, writeFilters, type Filters } from '../lib/filters'
import { pluralize } from '../lib/format'
import { isSortKey, searchProducts, sortHits, sortLabels, type SortKey } from '../lib/search'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const PAGE_SIZE = 24
const layoutClass = 'lg:grid lg:grid-cols-[14rem_1fr] lg:gap-8'

// React Router applies URL updates as a transition, so a control that reads only
// the URL would briefly snap back after a click. The new params are kept locally
// and shown right away, until the URL catches up (or changes some other way).
function useImmediateSearchParams() {
  const [urlParams, setUrlParams] = useSearchParams()
  const urlKey = urlParams.toString()
  const [seenKey, setSeenKey] = useState(urlKey)
  const [pending, setPending] = useState<URLSearchParams | null>(null)
  if (urlKey !== seenKey) {
    setSeenKey(urlKey)
    setPending(null)
  }
  const update = (next: URLSearchParams) => {
    setPending(next)
    // A filter or sort change keeps your scroll position; ScrollRestoration would reset it.
    setUrlParams(next, { replace: true, preventScrollReset: true })
  }
  return [pending ?? urlParams, update] as const
}

// Query, sort and filters all live in the URL. Changes replace the history entry,
// like the sort already did, so Back leaves the search instead of undoing clicks.
function useSearchState() {
  const [params, setParams] = useImmediateSearchParams()
  const query = params.get('q')?.trim() ?? ''
  const rawSort = params.get('sort')
  const defaultSort: SortKey = query ? 'relevance' : 'rating'
  // "Relevance" means nothing without a query, so it falls back to the default.
  const sort = isSortKey(rawSort) && (rawSort !== 'relevance' || query) ? rawSort : defaultSort
  const filters = parseFilters(params)

  const setSort = (next: SortKey) => {
    const updated = new URLSearchParams(params)
    if (next === defaultSort) updated.delete('sort')
    else updated.set('sort', next)
    setParams(updated)
  }
  const setFilters = (next: Filters) => setParams(writeFilters(params, next))
  return { query, sort, setSort, filters, setFilters }
}

function SortSelect({ sort, hasQuery, onChange }: { sort: SortKey; hasQuery: boolean; onChange: (s: SortKey) => void }) {
  const options = (Object.keys(sortLabels) as SortKey[]).filter((key) => hasQuery || key !== 'relevance')
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort by</span>
      <select
        value={sort}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="h-10 rounded-lg border border-border-strong bg-surface px-2 text-text"
      >
        {options.map((key) => (
          <option key={key} value={key}>
            {sortLabels[key]}
          </option>
        ))}
      </select>
    </label>
  )
}

function ResultGrid({ products }: { products: Product[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const shown = products.slice(0, visible)
  return (
    <>
      <p role="status" className="mb-4 text-sm text-muted">
        {pluralize(products.length, 'result')}
        {shown.length < products.length && ` · showing ${shown.length}`}
      </p>
      <ul className={gridClass}>
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ul>
      {shown.length < products.length && (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className={secondaryButton}>
            Show {Math.min(PAGE_SIZE, products.length - shown.length)} more
          </button>
        </div>
      )}
    </>
  )
}

interface BodyProps {
  query: string
  sort: SortKey
  filters: Filters
  setFilters: (f: Filters) => void
  sheetOpen: boolean
  setSheetOpen: (open: boolean) => void
}

function SearchBody({ query, sort, filters, setFilters, sheetOpen, setSheetOpen }: BodyProps) {
  const catalog = useCatalog()
  // Filter counts are computed from what the query matched, before filters.
  const hits = useMemo(() => searchProducts(catalog, query), [catalog, query])
  const matched = useMemo(() => hits.map((h) => h.product), [hits])
  const results = useMemo(
    () => sortHits(hits.filter((h) => matchesFilters(h.product, filters)), sort),
    [hits, filters, sort],
  )

  if (hits.length === 0) {
    return (
      <StatusMessage
        role="status"
        level="h2"
        title={`No products match “${query}”`}
        action={
          <Link to="/search" className={secondaryButton}>
            Browse all products
          </Link>
        }
      >
        Try fewer or different words.
      </StatusMessage>
    )
  }

  const panel = <FilterPanel products={matched} filters={filters} onChange={setFilters} />
  const clearFilters = () => setFilters(NO_FILTERS)
  const hasFilters = filterChips(filters).length > 0

  return (
    <div className={layoutClass}>
      <aside aria-label="Filters" className="hidden lg:block">
        {panel}
      </aside>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-3">
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={secondaryButton}>
                Clear all
              </button>
            )}
            <button type="button" onClick={() => setSheetOpen(false)} className={`${primaryButton} flex-1`}>
              Show {pluralize(results.length, 'result')}
            </button>
          </div>
        }
      >
        {panel}
      </BottomSheet>

      <div className="min-w-0">
        <FilterChips filters={filters} onChange={setFilters} />
        {results.length === 0 && (
          <StatusMessage
            role="status"
            level="h2"
            title="No products match these filters"
            action={
              <button type="button" onClick={clearFilters} className={secondaryButton}>
                Clear all filters
              </button>
            }
          >
            Remove a filter above, or clear them all.
          </StatusMessage>
        )}
        {/* Keyed so "Show more" starts over whenever the result set changes. */}
        {results.length > 0 && (
          <ResultGrid key={`${query}|${sort}|${writeFilters(new URLSearchParams(), filters)}`} products={results} />
        )}
      </div>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className={layoutClass}>
      <div className="hidden lg:block" />
      <ul className={gridClass} aria-label="Loading products">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </ul>
    </div>
  )
}

function searchHeading(query: string, filters: Filters): string {
  if (query) return `Results for “${query}”`
  return findDepartment(filters.department)?.name ?? 'All products'
}

export function SearchPage() {
  const { query, sort, setSort, filters, setFilters } = useSearchState()
  const [sheetOpen, setSheetOpen] = useState(false)
  const heading = searchHeading(query, filters)
  useDocumentTitle(heading)
  const activeCount = filterChips(filters).length

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-bold tracking-tight break-words">{heading}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-label={activeCount > 0 ? `Filters, ${activeCount} applied` : 'Filters'}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-sm font-semibold hover:border-action hover:text-action lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filters
            {activeCount > 0 && (
              <span aria-hidden="true" className="min-w-5 rounded-full bg-action px-1.5 text-center text-xs leading-5 text-on-action tabular-nums">
                {activeCount}
              </span>
            )}
          </button>
          <SortSelect sort={sort} hasQuery={Boolean(query)} onChange={setSort} />
        </div>
      </div>
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchBody
          query={query}
          sort={sort}
          filters={filters}
          setFilters={setFilters}
          sheetOpen={sheetOpen}
          setSheetOpen={setSheetOpen}
        />
      </Suspense>
    </section>
  )
}
