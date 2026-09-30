import { Suspense, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ProductCard, ProductCardSkeleton, gridClass } from '../components/ProductCard'
import { StatusMessage } from '../components/StatusMessage'
import { secondaryButton } from '../components/styles'
import { useCatalog } from '../lib/catalog'
import { pluralize } from '../lib/format'
import { isSortKey, searchProducts, sortHits, sortLabels, type SortKey } from '../lib/search'

const PAGE_SIZE = 24

function useSearchState() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q')?.trim() ?? ''
  const rawSort = params.get('sort')
  const defaultSort: SortKey = query ? 'relevance' : 'rating'
  // "Relevance" means nothing without a query, so it falls back to the default.
  const sort = isSortKey(rawSort) && (rawSort !== 'relevance' || query) ? rawSort : defaultSort

  const setSort = (next: SortKey) => {
    const updated = new URLSearchParams(params)
    if (next === defaultSort) updated.delete('sort')
    else updated.set('sort', next)
    setParams(updated, { replace: true })
  }
  return { query, sort, setSort }
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

function Results({ query, sort }: { query: string; sort: SortKey }) {
  const catalog = useCatalog()
  const products = useMemo(() => sortHits(searchProducts(catalog, query), sort), [catalog, query, sort])
  const [visible, setVisible] = useState(PAGE_SIZE)

  if (products.length === 0) {
    return (
      <StatusMessage
        role="status"
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

function ResultsSkeleton() {
  return (
    <ul className={gridClass} aria-label="Loading products">
      {Array.from({ length: 10 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </ul>
  )
}

export function SearchPage() {
  const { query, sort, setSort } = useSearchState()
  const heading = query ? `Results for “${query}”` : 'All products'
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-bold tracking-tight break-words">{heading}</h1>
        <SortSelect sort={sort} hasQuery={Boolean(query)} onChange={setSort} />
      </div>
      <Suspense fallback={<ResultsSkeleton />}>
        {/* Keyed so "Show more" starts over when the query or sort changes. */}
        <Results key={`${query}|${sort}`} query={query} sort={sort} />
      </Suspense>
    </section>
  )
}
