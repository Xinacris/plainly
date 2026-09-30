import type { Product } from './catalog'
import { t } from '../i18n'
import { DEPARTMENTS, departmentName, findDepartment } from './departments'
import { formatCategory, formatPrice, reviewRating } from './format'
import { onSale, saleLabel, salePrice } from './pricing'

// Filters live in the URL, so a filtered view can be shared, bookmarked and
// navigated with Back.
//
// The rule: what's picked in the top bar is *context* (where you are: heading and
// breadcrumb, kept by "Clear all"); what's picked on the page is a *filter* (a
// removable chip). Context params: department, view=sale. Filter params: dept,
// category (repeatable), brand (repeatable), min, max, rating, stock=in, sale=1.
export interface Filters {
  /** Context: a department slug from lib/departments.ts; unknown slugs are ignored. */
  department?: string
  /** Context: the "10%+ off" view opened from the bar. */
  saleView: boolean
  /** Filter: a department picked in the filter panel's first step (only without a department context). */
  departmentFilter?: string
  categories: string[]
  brands: string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStock: boolean
  /** Filter: only products at SALE_THRESHOLD% off or more, checked on the page. */
  sale: boolean
}

export const RATING_OPTIONS = [4, 3, 2, 1] as const

type Facet = 'context' | 'department' | 'departmentFilter' | 'category' | 'brand' | 'price' | 'rating' | 'stock' | 'sale'

function parsePrice(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function parseFilters(params: URLSearchParams): Filters {
  const rating = Number(params.get('rating'))
  // One context at a time: the sale view wins over a department, and makes the
  // sale filter redundant.
  const saleView = params.get('view') === 'sale'
  const department = saleView ? undefined : findDepartment(params.get('department'))?.slug
  return {
    saleView,
    department,
    // Inside a department context the panel lists its categories directly, so no department filter.
    departmentFilter: department ? undefined : findDepartment(params.get('dept'))?.slug,
    categories: params.getAll('category'),
    brands: params.getAll('brand'),
    minPrice: parsePrice(params.get('min')),
    maxPrice: parsePrice(params.get('max')),
    minRating: (RATING_OPTIONS as readonly number[]).includes(rating) ? rating : undefined,
    inStock: params.get('stock') === 'in',
    sale: !saleView && params.get('sale') === '1',
  }
}

/** Returns a copy of `params` with the filter params replaced; q and sort are kept. */
export function writeFilters(params: URLSearchParams, filters: Filters): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of ['view', 'department', 'dept', 'category', 'brand', 'min', 'max', 'rating', 'stock', 'sale']) next.delete(key)
  if (filters.saleView) next.set('view', 'sale')
  if (filters.department) next.set('department', filters.department)
  if (filters.departmentFilter) next.set('dept', filters.departmentFilter)
  filters.categories.forEach((c) => next.append('category', c))
  filters.brands.forEach((b) => next.append('brand', b))
  if (filters.minPrice !== undefined) next.set('min', String(filters.minPrice))
  if (filters.maxPrice !== undefined) next.set('max', String(filters.maxPrice))
  if (filters.minRating !== undefined) next.set('rating', String(filters.minRating))
  if (filters.inStock) next.set('stock', 'in')
  if (filters.sale) next.set('sale', '1')
  return next
}

export const NO_FILTERS: Filters = { saleView: false, categories: [], brands: [], inStock: false, sale: false }

/** "Clear all": drops every filter chosen on the page but keeps the context. */
export function clearedFilters(filters: Filters): Filters {
  return { ...NO_FILTERS, department: filters.department, saleView: filters.saleView }
}

/** `skip` leaves one facet out, so that facet's own counts show what choosing another option would give. */
export function matchesFilters(product: Product, filters: Filters, skip?: Facet): boolean {
  const price = salePrice(product)
  if (skip !== 'context' && filters.saleView && !onSale(product)) return false
  const department = findDepartment(filters.department)
  if (skip !== 'department' && department && !department.categories.includes(product.category)) return false
  const picked = findDepartment(filters.departmentFilter)
  if (skip !== 'departmentFilter' && picked && !picked.categories.includes(product.category)) return false
  if (skip !== 'category' && filters.categories.length && !filters.categories.includes(product.category)) return false
  if (skip !== 'brand' && filters.brands.length && !(product.brand && filters.brands.includes(product.brand))) return false
  if (skip !== 'price' && filters.minPrice !== undefined && price < filters.minPrice) return false
  if (skip !== 'price' && filters.maxPrice !== undefined && price > filters.maxPrice) return false
  if (skip !== 'rating' && filters.minRating !== undefined && reviewRating(product) < filters.minRating) return false
  if (skip !== 'stock' && filters.inStock && product.stock <= 0) return false
  if (skip !== 'sale' && filters.sale && !onSale(product)) return false
  return true
}

export interface FacetOption {
  value: string
  label: string
  count: number
}

// Options that would give no results are hidden, unless they're selected.
function options(
  products: Product[],
  filters: Filters,
  facet: 'category' | 'brand',
  selected: string[],
  valueOf: (p: Product) => string | undefined,
  labelOf: (value: string) => string,
): FacetOption[] {
  const counts = new Map<string, number>(selected.map((v) => [v, 0]))
  for (const p of products) {
    const value = valueOf(p)
    if (value && matchesFilters(p, filters, facet)) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts].map(([value, count]) => ({ value, label: labelOf(value), count }))
}

/** The filter panel's first step: departments with how many results each would give. */
export function departmentOptions(products: Product[], filters: Filters): FacetOption[] {
  return DEPARTMENTS.map((d) => ({
    value: d.slug,
    label: departmentName(d),
    count: products.filter((p) => d.categories.includes(p.category) && matchesFilters(p, filters, 'departmentFilter')).length,
  })).filter((o) => o.count > 0)
}

/** Leaving a picked department also drops the categories that were picked inside it. */
export function withoutDepartmentFilter(filters: Filters): Filters {
  const picked = findDepartment(filters.departmentFilter)
  return {
    ...filters,
    departmentFilter: undefined,
    categories: filters.categories.filter((c) => !picked?.categories.includes(c)),
  }
}

export function categoryOptions(products: Product[], filters: Filters): FacetOption[] {
  return options(products, filters, 'category', filters.categories, (p) => p.category, formatCategory).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
}

/** Most common brands first, since there are 60+. */
export function brandOptions(products: Product[], filters: Filters): FacetOption[] {
  return options(products, filters, 'brand', filters.brands, (p) => p.brand, (b) => b).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  )
}

/** How many products there would be with `change` applied, e.g. a different minimum rating. */
export function countWith(products: Product[], filters: Filters, change: Partial<Filters>): number {
  return products.filter((p) => matchesFilters(p, { ...filters, ...change })).length
}

export interface Chip {
  key: string
  label: string
  without: Filters
}

function priceLabel({ minPrice, maxPrice }: Filters): string {
  if (minPrice !== undefined && maxPrice !== undefined) return t.filters.chipPriceRange(formatPrice(minPrice), formatPrice(maxPrice))
  if (minPrice !== undefined) return t.filters.chipPriceMin(formatPrice(minPrice))
  return t.filters.chipPriceMax(formatPrice(maxPrice ?? 0))
}

/** One removable chip per filter chosen on the page, each carrying the filters without it.
 *  The department isn't one: it's where you are (heading and breadcrumb), not a filter. */
export function filterChips(filters: Filters): Chip[] {
  const picked = findDepartment(filters.departmentFilter)
  const chips: Chip[] = [
    // "department" in the label: Beauty and Groceries each hold a category with the same name.
    ...(picked ? [{ key: 'dept', label: t.filters.chipDepartment(departmentName(picked)), without: withoutDepartmentFilter(filters) }] : []),
    ...filters.categories.map((c) => ({
      key: `category:${c}`,
      label: formatCategory(c),
      without: { ...filters, categories: filters.categories.filter((x) => x !== c) },
    })),
    ...filters.brands.map((b) => ({
      key: `brand:${b}`,
      label: b,
      without: { ...filters, brands: filters.brands.filter((x) => x !== b) },
    })),
  ]
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    chips.push({ key: 'price', label: priceLabel(filters), without: { ...filters, minPrice: undefined, maxPrice: undefined } })
  }
  if (filters.minRating !== undefined) {
    chips.push({ key: 'rating', label: t.filters.chipRating(filters.minRating), without: { ...filters, minRating: undefined } })
  }
  if (filters.inStock) chips.push({ key: 'stock', label: t.filters.chipInStock, without: { ...filters, inStock: false } })
  if (filters.sale) chips.push({ key: 'sale', label: saleLabel(), without: { ...filters, sale: false } })
  return chips
}
