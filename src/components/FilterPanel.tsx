import { useEffect, useId, useRef, useState } from 'react'
import type { Product } from '../lib/catalog'
import { findDepartment } from '../lib/departments'
import {
  brandOptions,
  categoryOptions,
  countWith,
  departmentOptions,
  withoutDepartmentFilter,
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

// Without a department context the category filter takes two steps: pick a
// department (a filter, with its own chip), then its categories. Inside a
// department context it lists that department's categories directly.
function CategoryFilter({ products, filters, onChange }: Props) {
  const categories = categoryOptions(products, filters)
  const picked = findDepartment(filters.departmentFilter)
  const fieldset = useRef<HTMLFieldSetElement>(null)
  // After switching steps, focus the control that replaced the one just used,
  // so keyboard users aren't dropped at the top of the page.
  const focusAfterStep = useRef<string | null>(null)
  useEffect(() => {
    if (!focusAfterStep.current) return
    fieldset.current?.querySelector<HTMLElement>(focusAfterStep.current)?.focus()
    focusAfterStep.current = null
  }, [filters.departmentFilter])
  const toggleCategory = (c: string) => onChange({ ...filters, categories: toggle(filters.categories, c) })

  if (filters.department) {
    if (categories.length === 0) return null
    return (
      <fieldset>
        <legend className={legend}>Category</legend>
        <CheckboxList options={categories} selected={filters.categories} onToggle={toggleCategory} />
      </fieldset>
    )
  }

  if (picked) {
    return (
      <fieldset ref={fieldset}>
        <legend className={legend}>Category</legend>
        <button
          type="button"
          data-step-back
          onClick={() => {
            focusAfterStep.current = `[data-department="${picked.slug}"]`
            onChange(withoutDepartmentFilter(filters))
          }}
          className="mb-1 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-action underline underline-offset-2 hover:text-action-hover"
        >
          <span aria-hidden="true">‹</span> All departments
        </button>
        <p className="py-1 text-sm font-semibold">{picked.name}</p>
        <CheckboxList options={categories} selected={filters.categories} onToggle={toggleCategory} />
      </fieldset>
    )
  }

  const departments = departmentOptions(products, filters)
  // Categories picked without a department (e.g. from an old link) stay visible, so they can be unticked.
  const loose = categories.filter((o) => filters.categories.includes(o.value))
  if (departments.length === 0 && loose.length === 0) return null
  return (
    <fieldset ref={fieldset}>
      <legend className={legend}>Category</legend>
      {loose.length > 0 && <CheckboxList options={loose} selected={filters.categories} onToggle={toggleCategory} />}
      <ul>
        {departments.map((d) => (
          <li key={d.value}>
            <button
              type="button"
              data-department={d.value}
              onClick={() => {
                focusAfterStep.current = '[data-step-back]'
                onChange({ ...filters, departmentFilter: d.value })
              }}
              className={`${optionRow} w-full text-left hover:text-action`}
            >
              <span className="min-w-0">{d.label}</span>
              <span className={count}>{d.count}</span>
              <span aria-hidden="true" className="text-muted">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
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

      <CategoryFilter products={products} filters={filters} onChange={onChange} />

      <BrandFilter
        options={brands}
        selected={filters.brands}
        onToggle={(b) => onChange({ ...filters, brands: toggle(filters.brands, b) })}
      />
    </div>
  )
}
