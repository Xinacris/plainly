import { useId, useState } from 'react'
import { Link } from 'react-router'
import { MAX_PER_LINE, maxQuantity, useCart, useCartQuantity } from '../cart/cart'
import { useCartToast } from '../cart/toast'
import type { Product } from '../lib/catalog'
import { primaryButton, textLink } from './styles'

// Which limit applies, in words: the stock, or the per-item cap.
function limitReason(product: Product): string {
  return product.stock <= MAX_PER_LINE ? `only ${product.stock} in stock` : `limit ${MAX_PER_LINE} per item`
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
              Quantity
            </label>
            {/* Only what can still be added, within stock and the per-item limit. */}
            <select
              id={selectId}
              value={Math.min(quantity, remaining)}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="h-11 rounded-lg border border-border-strong bg-surface px-3 text-text"
            >
              {Array.from({ length: remaining }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={handleAdd} className={`${primaryButton} flex-1 sm:flex-none`}>
            Add to cart
          </button>
        </div>
      )}
      {/* Persistent and live: what's already in the cart, and what's left to add. */}
      <div aria-live="polite" className="text-sm">
        {inCart > 0 && (
          <p>
            <span className="font-semibold">{inCart} in your cart</span>
            <span aria-hidden="true" className="text-muted">
              {' · '}
            </span>
            <Link to="/cart" className={textLink}>
              View cart
            </Link>
          </p>
        )}
        {inCart > 0 && remaining > 0 && (
          <p className="text-muted">
            You can add up to {remaining} more ({limitReason(product)}).
          </p>
        )}
        {remaining <= 0 && (
          <p className="text-muted">You can’t add more: that’s the most you can buy ({limitReason(product)}).</p>
        )}
      </div>
    </div>
  )
}
