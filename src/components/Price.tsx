import type { Product } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { discountPercent, hasDiscount, salePrice } from '../lib/pricing'

interface Props {
  product: Product
  size?: 'card' | 'page'
}

// The price you pay, then the discount as a checkable fact: the % and the list
// price it's taken from. Plain text, no sticker.
export function Price({ product, size = 'card' }: Props) {
  const large = size === 'page'
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className={`font-bold tabular-nums ${large ? 'text-3xl' : 'text-lg'}`}>{formatPrice(salePrice(product))}</span>
        {hasDiscount(product) && (
          <span className={`font-semibold text-sale ${large ? '' : 'text-sm'}`}>{discountPercent(product)}% off</span>
        )}
      </p>
      {hasDiscount(product) && (
        <p className="text-sm text-muted">
          List price <s className="tabular-nums">{formatPrice(product.price)}</s>
        </p>
      )}
    </div>
  )
}
