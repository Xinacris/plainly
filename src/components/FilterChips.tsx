export interface ChipItem {
  key: string
  label: string
  onRemove: () => void
}

export function FilterChips({ chips, onClearAll }: { chips: ChipItem[]; onClearAll: () => void }) {
  if (chips.length === 0) return null
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <ul aria-label="Applied filters" className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              onClick={chip.onRemove}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-strong bg-surface py-1 pr-2.5 pl-3 text-left text-sm hover:border-action hover:text-action"
            >
              <span className="sr-only">Remove filter: </span>
              {chip.label}
              <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      {chips.length > 1 && (
        <button type="button" onClick={onClearAll} className="h-9 px-1 text-sm font-medium text-muted underline underline-offset-2 hover:text-text">
          Clear all
        </button>
      )}
    </div>
  )
}
