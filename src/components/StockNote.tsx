import { t } from '../i18n'
import type { Product } from '../lib/catalog'

interface Props {
  product: Product
  /** On cards, "In stock" on every item is noise; only exceptions are shown. */
  exceptionsOnly?: boolean
  /** As a fact value (decision card, compare): the surrounding size, and "In stock" in the text color. */
  fact?: boolean
}

// Stock facts come straight from the data: nothing is shown as scarce unless it is.
export function StockNote({ product, exceptionsOnly = false, fact = false }: Props) {
  const size = fact ? '' : 'text-sm'
  if (product.stock <= 0) return <p className={`${size} font-semibold text-warning`}>{t.stock.out}</p>
  if (product.availabilityStatus === 'Low Stock' && product.stock <= 5)
    return <p className={`${size} font-semibold text-warning`}>{t.stock.only(product.stock)}</p>
  if (exceptionsOnly) return null
  return <p className={fact ? 'text-text' : 'text-sm text-muted'}>{t.stock.in}</p>
}
