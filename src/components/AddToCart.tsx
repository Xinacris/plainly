import { useId, useState } from 'react'
import { Link } from 'react-router'
import { maxQuantity, useCart, useCartQuantity } from '../cart/cart'
import type { Product } from '../lib/catalog'
import { primaryButton, textLink } from './styles'

export function AddToCart({ product }: { product: Product }) {
  const add = useCart((s) => s.add)
  const inCart = useCartQuantity(product.id)
  const max = maxQuantity(product)
  const remaining = max - inCart
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const selectId = useId()

  if (product.stock <= 0) return null

  const handleAdd = () => {
    const added = add(product.id, Math.min(quantity, remaining), max)
    setMessage(`Added ${added} to your cart.`)
    setQuantity(1)
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {remaining > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={selectId} className="text-sm text-muted">
              Quantity
            </label>
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
      {remaining <= 0 && (
        <p className="text-sm text-muted">You have the most you can buy ({max}) in your cart.</p>
      )}
      <div aria-live="polite" className="text-sm">
        {message && (
          <p>
            {message}{' '}
            <Link to="/cart" className={textLink}>
              View cart
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
