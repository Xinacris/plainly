import type { Product } from '../lib/catalog'
import { formatRating, pluralize, reviewRating } from '../lib/format'

export function Rating({ product, className = '' }: { product: Product; className?: string }) {
  const count = product.reviews.length
  if (count === 0) return <p className={`text-sm text-muted ${className}`}>No reviews yet</p>
  const value = formatRating(reviewRating(product))
  return (
    <p className={`flex items-center gap-1 text-sm ${className}`}>
      <span className="sr-only">{`Rated ${value} out of 5 from ${pluralize(count, 'review')}`}</span>
      <svg viewBox="0 0 20 20" className="size-4 text-text" fill="currentColor" aria-hidden="true">
        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
      </svg>
      <span aria-hidden="true" className="font-semibold">
        {value}
      </span>
      <span aria-hidden="true" className="text-muted">
        · {pluralize(count, 'review')}
      </span>
    </p>
  )
}
