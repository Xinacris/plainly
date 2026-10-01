import { t } from '../i18n'
import type { Product } from '../lib/catalog'
import { formatRating, reviewRating } from '../lib/format'

// `compact` (cards and product rows): "★ 5.0 (3)", which never wraps; the count's
// word would break onto its own line on narrow cards, especially in Turkish. The full
// form ("★ 5.0 · 3 reviews") is for the product page, where there's room; the count and
// its word stay together there. Either way screen readers hear one full label.
export function Rating({ product, className = '', compact = false }: { product: Product; className?: string; compact?: boolean }) {
  const count = product.reviews.length
  if (count === 0) return <p className={`text-sm text-muted ${className}`}>{t.rating.none}</p>
  const value = formatRating(reviewRating(product))
  return (
    <p className={`flex items-center gap-1 text-sm ${compact ? 'whitespace-nowrap' : 'flex-wrap'} ${className}`}>
      <span className="sr-only">{compact ? t.rating.short(value, count) : t.rating.spoken(value, count)}</span>
      <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-text" fill="currentColor" aria-hidden="true">
        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
      </svg>
      <span aria-hidden="true" className="font-semibold">
        {value}
      </span>
      {compact ? (
        <span aria-hidden="true" className="text-muted tabular-nums">
          ({count})
        </span>
      ) : (
        <span aria-hidden="true" className="whitespace-nowrap text-muted">
          · {t.common.reviews(count)}
        </span>
      )}
    </p>
  )
}
