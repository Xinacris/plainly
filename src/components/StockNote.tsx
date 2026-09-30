import type { Product } from '../lib/catalog'

interface Props {
  product: Product
  /** On cards, "In stock" on every item is noise; only exceptions are shown. */
  exceptionsOnly?: boolean
}

// Stock facts come straight from the data: nothing is shown as scarce unless it is.
export function StockNote({ product, exceptionsOnly = false }: Props) {
  if (product.stock <= 0) return <p className="text-sm font-semibold text-warning">Out of stock</p>
  if (product.availabilityStatus === 'Low Stock' && product.stock <= 5)
    return <p className="text-sm font-semibold text-warning">Only {product.stock} left</p>
  if (exceptionsOnly) return null
  return <p className="text-sm text-muted">In stock</p>
}
