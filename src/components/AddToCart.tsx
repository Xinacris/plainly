import { useId, useState } from 'react'
import { Link } from 'react-router'
import { MAX_PER_LINE, maxQuantity, useCart, useCartQuantity } from '../cart/cart'
import { useCartToast } from '../cart/toast'
import { t } from '../i18n'
import type { Product } from '../lib/catalog'
import { Select } from './Select'
import { primaryButton, textLink } from './styles'

// Which limit applies, in words: the stock, or the per-item cap.
function limitReason(product: Product): string {
  return product.stock <= MAX_PER_LINE ? t.addToCart.onlyInStock(product.stock) : t.addToCart.limitPerItem(MAX_PER_LINE)
}

export function AddToCart({ product }: { product: Product }) {
  const add = useCart((s) => s.add)
  const showToast = useCartToast((s) => s.show)
  const inCart = useCartQuantity(product.id)
  const max = maxQuantity(product)
  const remaining = max - inCart
  const [quantity, setQuantity] = useState(1)
  const selectId = useId()

  if (product.stock <= 0) return null

  // The confirmation is the toast; this block keeps showing what's in the cart.
  const handleAdd = () => {
    const added = add(product.id, Math.min(quantity, remaining), max)
    if (added > 0) showToast(product.id, added, inCart + added)
    setQuantity(1)
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {remaining > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={selectId} className="text-sm text-muted">
              {t.addToCart.quantity}
            </label>
            {/* Only what can still be added, within stock and the per-item limit. */}
            <Select
              id={selectId}
              value={Math.min(quantity, remaining)}
              onChange={(e) => setQuantity(Number(e.target.value))}
            >
              {Array.from({ length: remaining }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </Select>
          </div>
          <button type="button" onClick={handleAdd} className={`${primaryButton} flex-1 sm:flex-none`}>
            {t.addToCart.add}
          </button>
        </div>
      )}
      {/* Persistent and live: what's already in the cart, and what's left to add. */}
      <div aria-live="polite" className="text-sm">
        {inCart > 0 && (
          <p>
            <span className="font-semibold">{t.addToCart.inCart(inCart)}</span>
            <span aria-hidden="true" className="text-muted">
              {' · '}
            </span>
            <Link to="/cart" className={textLink}>
              {t.common.viewCart}
            </Link>
          </p>
        )}
        {inCart > 0 && remaining > 0 && (
          <p className="text-muted">{t.addToCart.canAddMore(remaining, limitReason(product))}</p>
        )}
        {remaining <= 0 && (
          <p className="text-muted">{t.addToCart.maxed(limitReason(product))}</p>
        )}
      </div>
    </div>
  )
}
