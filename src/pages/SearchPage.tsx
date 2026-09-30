import { Suspense, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { Breadcrumbs, type Crumb } from '../components/Breadcrumbs'
import { FilterChips, type ChipItem } from '../components/FilterChips'
import { FilterPanel } from '../components/FilterPanel'
import { ProductCard, ProductCardSkeleton, gridClass } from '../components/ProductCard'
import { StatusMessage } from '../components/StatusMessage'
import { primaryButton, secondaryButton, textLink } from '../components/styles'
import { useCatalog, type Product } from '../lib/catalog'
import { t } from '../i18n'
import { departmentName, findDepartment } from '../lib/departments'
import { clearedFilters, filterChips, matchesFilters, parseFilters, writeFilters, type Filters } from '../lib/filters'
import { saleLabel, SALE_URL } from '../lib/pricing'
import { isSortKey, searchProducts, SORT_KEYS, sortHits, sortLabel, type SortKey } from '../lib/search'
import { resolveQuery, type ResolvedQuery } from '../lib/spelling'
import { Select } from '../components/Select'
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

// Query, sort, context and filters all live in the URL. Changes replace the history
// entry, so Back leaves the search instead of undoing clicks.
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
  return { params, setParams, query, literal: params.get('literal') === '1', sort, setSort, filters, setFilters }
}

type SearchState = ReturnType<typeof useSearchState>

/** The same search with the words taken as typed: no category matching, no correction. */
function literalUrl(params: URLSearchParams, q: string): URLSearchParams {
  const next = new URLSearchParams(params)
  next.set('q', q)
  next.set('literal', '1')
  return next
}

function SortSelect({ sort, hasQuery, onChange }: { sort: SortKey; hasQuery: boolean; onChange: (s: SortKey) => void }) {
  const options = SORT_KEYS.filter((key) => hasQuery || key !== 'relevance')
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">{t.search.sortBy}</span>
      <Select
        value={sort}
        onChange={(e) => onChange(e.target.value as SortKey)}
        compact
      >
        {options.map((key) => (
          <option key={key} value={key}>
            {sortLabel(key)}
          </option>
        ))}
      </Select>
    </label>
  )
}

function ResultGrid({ products }: { products: Product[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const shown = products.slice(0, visible)
  return (
    <>
      <p role="status" className="mb-4 text-sm text-muted">
        {t.common.results(products.length)}
        {shown.length < products.length && t.search.showing(shown.length)}
      </p>
      <ul className={gridClass}>
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ul>
      {shown.length < products.length && (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className={secondaryButton}>
            {t.search.showMore(Math.min(PAGE_SIZE, products.length - shown.length))}
          </button>
        </div>
      )}
    </>
  )
}

// Context is what was picked in the top bar: a department or the sale view.
function contextLabel(filters: Filters): string | undefined {
  if (filters.saleView) return saleLabel()
  const department = findDepartment(filters.department)
  return department ? departmentName(department) : undefined
}

function contextUrl(filters: Filters): string {
  if (filters.saleView) return SALE_URL
  return `/search?department=${filters.department}`
}

function searchHeading(query: string, filters: Filters): string {
  if (query) return t.search.resultsFor(query)
  return contextLabel(filters) ?? t.header.allProducts
}

// Shown inside a context; the way back out is "All products".
function searchCrumbs(query: string, filters: Filters): Crumb[] | undefined {
  const context = contextLabel(filters)
  if (!context) return undefined
  if (!query) return [{ label: t.header.allProducts, to: '/search' }, { label: context }]
  return [
    { label: t.header.allProducts, to: `/search?q=${encodeURIComponent(query)}` },
    { label: context, to: contextUrl(filters) },
    { label: t.search.quoted(query) },
  ]
}

function PageHead({ query, filters, toolbar }: { query: string; filters: Filters; toolbar?: ReactNode }) {
  const heading = searchHeading(query, filters)
  const crumbs = searchCrumbs(query, filters)
  useDocumentTitle(heading)
  return (
    <>
      {crumbs && <Breadcrumbs items={crumbs} className="mb-2" />}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-bold tracking-tight break-words">{heading}</h1>
        {toolbar}
      </div>
    </>
  )
}

function FiltersButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={count > 0 ? t.search.filtersApplied(count) : t.search.filters}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-sm font-semibold hover:border-action hover:text-action lg:hidden"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      {t.search.filters}
      {count > 0 && (
        <span aria-hidden="true" className="min-w-5 rounded-full bg-action px-1.5 text-center text-xs leading-5 text-on-action tabular-nums">
          {count}
        </span>
      )}
    </button>
  )
}

// Always says when the words searched aren't the words typed, with a one-click way back.
function CorrectionNote({ resolved, typed, params }: { resolved: ResolvedQuery; typed: string; params: URLSearchParams }) {
  if (!resolved.corrected) return null
  return (
    <p role="status" className="mb-3 text-sm">
      {t.search.correction} <strong className="font-semibold">{resolved.corrected}</strong>
      <span aria-hidden="true" className="text-muted">
        {' · '}
      </span>
      <Link to={`/search?${literalUrl(params, typed)}`} className={textLink}>
        {t.search.insteadFor(typed)}
      </Link>
    </p>
  )
}

function SearchResults({ state }: { state: SearchState }) {
  const { params, setParams, query, literal, sort, setSort, filters, setFilters } = state
  const catalog = useCatalog()
  const [sheetOpen, setSheetOpen] = useState(false)
  const resolved = useMemo(() => resolveQuery(query, literal, catalog), [query, literal, catalog])
  const { intent } = resolved

  // Filter counts are computed from what the query matched, before filters. A query
  // understood as a category matches that category instead of its words.
  const hits = useMemo(() => {
    if (!intent) return searchProducts(catalog, resolved.text)
    return searchProducts(catalog, '').filter((h) => intent.categories.includes(h.product.category))
  }, [catalog, resolved.text, intent])
  const matched = useMemo(() => hits.map((h) => h.product), [hits])
  const results = useMemo(() => sortHits(hits.filter((h) => matchesFilters(h.product, filters)), sort), [hits, filters, sort])

  // Page filters and the query's category are chips; context isn't. Removing the
  // category chip keeps the (corrected) words but searches them as text.
  const dropIntent = () => setParams(literalUrl(params, resolved.text))
  const chips: ChipItem[] = [
    ...(intent ? [{ key: 'intent', label: t.search.intentChip(intent.label, resolved.text), onRemove: dropIntent }] : []),
    ...filterChips(filters).map((c) => ({ key: c.key, label: c.label, onRemove: () => setFilters(c.without) })),
  ]
  const clearAll = () => {
    const next = writeFilters(params, clearedFilters(filters))
    setParams(intent ? literalUrl(next, resolved.text) : next)
  }

  if (hits.length === 0) {
    return (
      <>
        <PageHead query={query} filters={filters} />
        <StatusMessage
          role="status"
          level="h2"
          title={t.search.noMatch(query)}
          action={
            <Link to="/search" className={secondaryButton}>
              {t.common.browseAll}
            </Link>
          }
        >
          {t.search.fewerWords}
        </StatusMessage>
      </>
    )
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <FiltersButton count={chips.length} onClick={() => setSheetOpen(true)} />
      <SortSelect sort={sort} hasQuery={Boolean(query)} onChange={setSort} />
    </div>
  )
  const panel = <FilterPanel products={matched} filters={filters} onChange={setFilters} />

  return (
    <>
      <PageHead query={resolved.text} filters={filters} toolbar={toolbar} />
      <div className={layoutClass}>
        <aside aria-label={t.search.filters} className="hidden lg:block">
          {panel}
        </aside>

        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={t.search.filters}
          footer={
            <div className="flex gap-3">
              {chips.length > 0 && (
                <button type="button" onClick={clearAll} className={secondaryButton}>
                  {t.common.clearAll}
                </button>
              )}
              <button type="button" onClick={() => setSheetOpen(false)} className={`${primaryButton} flex-1`}>
                {t.search.showResults(results.length)}
              </button>
            </div>
          }
        >
          {panel}
        </BottomSheet>

        <div className="min-w-0">
          <CorrectionNote resolved={resolved} typed={query} params={params} />
          <FilterChips chips={chips} onClearAll={clearAll} />
          {results.length === 0 && (
            <StatusMessage
              role="status"
              level="h2"
              title={t.search.noFilterMatch}
              action={
                <button type="button" onClick={clearAll} className={secondaryButton}>
                  {t.search.clearAllFilters}
                </button>
              }
            >
              {t.search.removeOrClear}
            </StatusMessage>
          )}
          {/* Keyed so "Show more" starts over whenever the result set changes. */}
          {results.length > 0 && (
            <ResultGrid key={`${resolved.text}|${Boolean(intent)}|${sort}|${writeFilters(new URLSearchParams(), filters)}`} products={results} />
          )}
        </div>
      </div>
    </>
  )
}

function ResultsSkeleton() {
  return (
    <div className={layoutClass}>
      <div className="hidden lg:block" />
      <ul className={gridClass} aria-label={t.search.loadingProducts}>
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </ul>
    </div>
  )
}

export function SearchPage() {
  const state = useSearchState()
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Until the catalog loads, the heading shows the query as typed. */}
      <Suspense
        fallback={
          <>
            <PageHead query={state.query} filters={state.filters} />
            <ResultsSkeleton />
          </>
        }
      >
        <SearchResults state={state} />
      </Suspense>
    </section>
  )
}
