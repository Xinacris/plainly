import type { Product } from './catalog'
import { inDepartment, type Department } from './departments'
import { reviewRating } from './format'
import { hasDiscount } from './pricing'

export type Tile =
  | { kind: 'category'; slug: string; count: number; image: string }
  | { kind: 'product'; product: Product }

const TILES = 4

const byRating = (a: Product, b: Product) => reviewRating(b) - reviewRating(a) || a.id - b.id

// Up to four category tiles, each pictured by its best-rated product. A department
// with fewer than four categories fills the rest with its best-rated products,
// skipping the ones already pictured.
export function departmentTiles(department: Department, catalog: Product[]): { count: number; tiles: Tile[] } {
  const products = catalog.filter((p) => inDepartment(p, department)).sort(byRating)
  const pictured = new Set<number>()
  const tiles: Tile[] = department.categories.slice(0, TILES).flatMap((slug) => {
    const inCategory = products.filter((p) => p.category === slug)
    if (inCategory.length === 0) return []
    pictured.add(inCategory[0].id)
    return [{ kind: 'category' as const, slug, count: inCategory.length, image: inCategory[0].thumbnail }]
  })
  const fill = products.filter((p) => !pictured.has(p.id) && p.stock > 0).slice(0, TILES - tiles.length)
  return { count: products.length, tiles: [...tiles, ...fill.map((product) => ({ kind: 'product' as const, product }))] }
}

const ROW_LENGTH = 12

/** In stock only: a row of things you can't buy would be noise. */
export function biggestDiscounts(catalog: Product[]): Product[] {
  return catalog
    .filter((p) => p.stock > 0 && hasDiscount(p))
    .sort((a, b) => b.discountPercentage - a.discountPercentage || a.id - b.id)
    .slice(0, ROW_LENGTH)
}

export function highestRated(catalog: Product[]): Product[] {
  return catalog.filter((p) => p.stock > 0 && p.reviews.length > 0).sort(byRating).slice(0, ROW_LENGTH)
}
