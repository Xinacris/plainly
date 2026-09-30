import { useId, useState } from 'react'
import type { Product } from '../lib/catalog'
import {
  brandOptions,
  categoryOptions,
  countWith,
  RATING_OPTIONS,
  type FacetOption,
  type Filters,
} from '../lib/filters'
import { SALE_LABEL } from '../lib/pricing'

interface Props {
  /** The products the query matched, before filters. Counts are computed from these. */
  products: Product[]
  filters: Filters
  onChange: (filters: Filters) => void
}

const legend = 'mb-2 text-sm font-bold'
const optionRow = 'flex min-h-9 cursor-pointer items-center gap-2 text-sm'
const count = 'ml-auto text-muted tabular-nums'
const BRANDS_SHOWN = 8

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function CheckboxList({ options, selected, onToggle }: { options: FacetOption[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <ul>
      {options.map((o) => (
        <li key={o.value}>
          <label className={optionRow}>
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} className="size-4 accent-action" />
            <span className="min-w-0">{o.label}</span>
            <span className={count}>{o.count}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}

function BrandFilter({ options, selected, onToggle }: { options: FacetOption[]; selected: string[]; onToggle: (v: string) => void }) {
  const [showAll, setShowAll] = useState(false)
  if (options.length === 0) return null
  // Selected brands always stay visible, even past the cut-off.
  const shown = showAll ? options : options.filter((o, i) => i < BRANDS_SHOWN || selected.includes(o.value))
  const hidden = options.length - shown.length
  return (
    <fieldset>
      <legend className={legend}>Brand</legend>
      <CheckboxList options={shown} selected={selected} onToggle={onToggle} />
      {(hidden > 0 || showAll) && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
          className="mt-1 text-sm font-medium text-action underline underline-offset-2 hover:text-action-hover"
        >
          {showAll ? 'Show fewer brands' : `Show all ${options.length} brands`}
        </button>
      )}
    </fieldset>
  )
}

function PriceInput({ label, value, onCommit }: { label: string; value?: number; onCommit: (v?: number) => void }) {
  const id = useId()
  const urlText = value === undefined ? '' : String(value)
  const [text, setText] = useState(urlText)
  const [synced, setSynced] = useState(urlText)
  // Follow the URL when it changes elsewhere (a chip removed, Back pressed).
  if (urlText !== synced) {
    setSynced(urlText)
    setText(urlText)
  }
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <div className="flex h-10 items-center rounded-lg border border-border-strong bg-surface px-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action">
        <span aria-hidden="true" className="text-muted">
          $
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={text}
          onChange={(e) => {
            const next = e.target.value
            setText(next)
            if (next === '') onCommit(undefined)
            else if (Number(next) >= 0) onCommit(Number(next))
          }}
          className="w-full min-w-0 bg-transparent px-1 text-text outline-none"
        />
      </div>
    </div>
  )
}

export function FilterPanel({ products, filters, onChange }: Props) {
  // Unique per panel: the sidebar and the mobile sheet must not share one radio group.
  const ratingName = useId()
  const categories = categoryOptions(products, filters)
  const brands = brandOptions(products, filters)
  const inStockCount = countWith(products, filters, { inStock: true })
  const saleCount = countWith(products, filters, { sale: true })
  const priceInverted =
    filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className={legend}>Availability</legend>
        <label className={optionRow}>
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={() => onChange({ ...filters, inStock: !filters.inStock })}
            className="size-4 accent-action"
          />
          In stock only
          <span className={count}>{inStockCount}</span>
        </label>
      </fieldset>

      {/* In the sale view the rule is the context itself, so the checkbox would only contradict it. */}
      {!filters.saleView && (
        <fieldset>
          <legend className={legend}>Discount</legend>
          <label className={optionRow}>
            <input
              type="checkbox"
              checked={filters.sale}
              onChange={() => onChange({ ...filters, sale: !filters.sale })}
              className="size-4 accent-action"
            />
            {SALE_LABEL}
            <span className={count}>{saleCount}</span>
          </label>
        </fieldset>
      )}

      <fieldset>
        <legend className={legend}>Price you pay</legend>
        <div className="flex gap-2">
          <PriceInput label="Min" value={filters.minPrice} onCommit={(minPrice) => onChange({ ...filters, minPrice })} />
          <PriceInput label="Max" value={filters.maxPrice} onCommit={(maxPrice) => onChange({ ...filters, maxPrice })} />
        </div>
        {priceInverted && <p className="mt-2 text-sm text-warning">The minimum is higher than the maximum.</p>}
      </fieldset>

      <fieldset>
        <legend className={legend}>Rating</legend>
        <ul>
          <li>
            <label className={optionRow}>
              <input
                type="radio"
                name={ratingName}
                checked={filters.minRating === undefined}
                onChange={() => onChange({ ...filters, minRating: undefined })}
                className="size-4 accent-action"
              />
              Any rating
            </label>
          </li>
          {RATING_OPTIONS.map((r) => (
            <li key={r}>
              <label className={optionRow}>
                <input
                  type="radio"
                  name={ratingName}
                  checked={filters.minRating === r}
                  onChange={() => onChange({ ...filters, minRating: r })}
                  className="size-4 accent-action"
                />
                {r} and up
                <span className={count}>{countWith(products, filters, { minRating: r })}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {categories.length > 0 && (
        <fieldset>
          <legend className={legend}>Category</legend>
          <CheckboxList
            options={categories}
            selected={filters.categories}
            onToggle={(c) => onChange({ ...filters, categories: toggle(filters.categories, c) })}
          />
        </fieldset>
      )}

      <BrandFilter
        options={brands}
        selected={filters.brands}
        onToggle={(b) => onChange({ ...filters, brands: toggle(filters.brands, b) })}
      />
    </div>
  )
}
