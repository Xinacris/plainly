import type { Product } from './catalog'

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatPrice(amount: number): string {
  return priceFormat.format(amount)
}

// Ratings are truncated, never rounded up: 4.99 shows as 4.9.
export function formatRating(rating: number): string {
  return (Math.floor(rating * 10 + 1e-9) / 10).toFixed(1)
}

// DummyJSON's own `rating` field doesn't match the reviews it ships with, so the
// rating shown is the average of the reviews the user can actually read.
export function reviewRating(product: Product): number {
  const { reviews } = product
  if (reviews.length === 0) return 0
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function formatCategory(slug: string): string {
  const words = slug.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
