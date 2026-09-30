import type { Product } from './catalog'
import { reviewRating } from './format'

export type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'rating'

export const sortLabels: Record<SortKey, string> = {
  relevance: 'Relevance',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  rating: 'Highest rated',
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/-/g, ' ')
}

// Drop a trailing "s" so "phones" finds "phone" and "shoes" finds "shoe".
function tokenize(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t))
}

function tokenScore(product: Product, token: string): number {
  const title = normalize(product.title)
  if (title.split(' ').some((word) => word.startsWith(token))) return 10
  if (title.includes(token)) return 6
  if (product.brand && normalize(product.brand).includes(token)) return 5
  if (normalize(product.category).includes(token)) return 4
  if (product.description.toLowerCase().includes(token)) return 1
  return 0
}

export interface SearchHit {
  product: Product
  score: number
}

// Every token must match somewhere; title matches outrank brand, category, then description.
export function searchProducts(products: Product[], query: string): SearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return products.map((product) => ({ product, score: 0 }))
  const hits: SearchHit[] = []
  for (const product of products) {
    let score = 0
    for (const token of tokens) {
      const s = tokenScore(product, token)
      if (s === 0) {
        score = 0
        break
      }
      score += s
    }
    if (score > 0) hits.push({ product, score })
  }
  return hits
}

const byTitle = (a: SearchHit, b: SearchHit) => a.product.title.localeCompare(b.product.title)

const comparators: Record<SortKey, (a: SearchHit, b: SearchHit) => number> = {
  relevance: (a, b) => b.score - a.score || reviewRating(b.product) - reviewRating(a.product) || byTitle(a, b),
  'price-asc': (a, b) => a.product.price - b.product.price || byTitle(a, b),
  'price-desc': (a, b) => b.product.price - a.product.price || byTitle(a, b),
  rating: (a, b) => reviewRating(b.product) - reviewRating(a.product) || byTitle(a, b),
}

export function sortHits(hits: SearchHit[], sort: SortKey): Product[] {
  return [...hits].sort(comparators[sort]).map((h) => h.product)
}

export function isSortKey(value: string | null): value is SortKey {
  return value !== null && value in sortLabels
}
