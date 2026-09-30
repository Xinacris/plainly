import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

interface Props {
  /** A second search on a page (the 404) needs its own input id and landmark name. */
  inputId?: string
  landmarkLabel?: string
  /** Shown above the box instead of only to screen readers. */
  visibleLabel?: boolean
}

export function SearchForm({ inputId = 'site-search', landmarkLabel, visibleLabel = false }: Props) {
  const [params] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  const navigate = useNavigate()

  // Keep the box in sync when the URL changes (back/forward, links).
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    setQuery(urlQuery)
  }

  return (
    <form
      role="search"
      aria-label={landmarkLabel}
      className={`flex w-full ${visibleLabel ? 'flex-wrap' : ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        const q = query.trim()
        navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
      }}
    >
      <label htmlFor={inputId} className={visibleLabel ? 'mb-1 w-full text-sm font-medium' : 'sr-only'}>
        Search products
      </label>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products"
        className="h-10 min-w-0 flex-1 rounded-l-lg border border-r-0 border-border-strong bg-surface px-3 text-text placeholder:text-muted"
      />
      <button
        type="submit"
        aria-label="Search"
        className="grid h-10 w-11 place-items-center rounded-r-lg bg-action text-on-action hover:bg-action-hover"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  )
}
