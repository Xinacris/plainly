import { filterChips, NO_FILTERS, type Filters } from '../lib/filters'

export function FilterChips({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const chips = filterChips(filters)
  if (chips.length === 0) return null
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <ul aria-label="Applied filters" className="contents">
        {chips.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              onClick={() => onChange(chip.without)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-strong bg-surface pr-2.5 pl-3 text-sm hover:border-action hover:text-action"
            >
              <span className="sr-only">Remove filter: </span>
              {chip.label}
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      {chips.length > 1 && (
        <button type="button" onClick={() => onChange(NO_FILTERS)} className="h-9 px-1 text-sm font-medium text-muted underline underline-offset-2 hover:text-text">
          Clear all
        </button>
      )}
    </div>
  )
}
