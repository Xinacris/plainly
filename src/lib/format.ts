import { formatNumber, t } from '../i18n'
import type { Product } from './catalog'

// Prices stay in US dollars in both languages; the format follows the language.
export { formatPrice } from '../i18n'

// Ratings are truncated, never rounded up: 4.99 shows as 4.9 (4,9 in Turkish).
export function formatRating(rating: number): string {
  return formatNumber(Math.floor(rating * 10 + 1e-9) / 10, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// DummyJSON's own `rating` field doesn't match the reviews it ships with, so the
// rating shown is the average of the reviews the user can actually read.
export function reviewRating(product: Product): number {
  const { reviews } = product
  if (reviews.length === 0) return 0
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
}

/** A category's name in the current language; English makes the slug readable ("Mens shirts"). */
export function formatCategory(slug: string): string {
  const translated = t.categories[slug]
  if (translated) return translated
  const words = slug.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
