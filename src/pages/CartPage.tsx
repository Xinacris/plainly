import { Suspense } from 'react'
import { Link } from 'react-router'
import { maxQuantity, useCart, type CartLine } from '../cart/cart'
import { ProductImage } from '../components/ProductImage'
import { QuantityStepper } from '../components/QuantityStepper'
import { StatusMessage } from '../components/StatusMessage'
import { secondaryButton } from '../components/styles'
import { useCatalog, type Product } from '../lib/catalog'
import { formatPrice, pluralize } from '../lib/format'

interface ResolvedLine extends CartLine {
  product: Product
}

function CartRow({ line }: { line: ResolvedLine }) {
  const { product, quantity } = line
  const setQuantity = useCart((s) => s.setQuantity)
  const remove = useCart((s) => s.remove)
  return (
    <li className="flex gap-4 py-4">
      <Link to={`/product/${product.id}`} className="w-20 shrink-0 sm:w-28" tabIndex={-1} aria-hidden="true">
        <ProductImage src={product.thumbnail} alt="" className="p-2" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="min-w-0">
          <Link to={`/product/${product.id}`} className="font-semibold hover:text-action">
            {product.title}
          </Link>
          <p className="text-sm text-muted">{formatPrice(product.price)} each</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <QuantityStepper
              value={quantity}
              max={maxQuantity(product)}
              onChange={(q) => setQuantity(product.id, q)}
              label={product.title}
            />
            <button type="button" onClick={() => remove(product.id)} className="text-sm font-medium text-muted underline underline-offset-2 hover:text-text">
              Remove<span className="sr-only"> {product.title}</span>
            </button>
          </div>
        </div>
        <p className="font-bold sm:text-right">{formatPrice(product.price * quantity)}</p>
      </div>
    </li>
  )
}

function CartContents() {
  const catalog = useCatalog()
  const lines = useCart((s) => s.lines)
  // Lines whose product is gone or out of stock are skipped, and stored quantities
  // are clamped to what can actually be bought.
  const resolved: ResolvedLine[] = lines.flatMap((line) => {
    const product = catalog.find((p) => p.id === line.productId)
    if (!product || maxQuantity(product) === 0) return []
    return [{ ...line, product, quantity: Math.min(line.quantity, maxQuantity(product)) }]
  })

  if (resolved.length === 0) {
    return (
      <StatusMessage
        title="Your cart is empty"
        action={
          <Link to="/search" className={secondaryButton}>
            Browse all products
          </Link>
        }
      />
    )
  }

  const itemCount = resolved.reduce((sum, l) => sum + l.quantity, 0)
  const subtotal = resolved.reduce((sum, l) => sum + l.product.price * l.quantity, 0)

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Cart</h1>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface px-4">
          {resolved.map((line) => (
            <CartRow key={line.productId} line={line} />
          ))}
        </ul>
        <aside aria-label="Order summary" className="rounded-xl border border-border bg-surface p-4">
          <p className="flex justify-between gap-4">
            <span>Subtotal ({pluralize(itemCount, 'item')})</span>
            <span className="font-bold">{formatPrice(subtotal)}</span>
          </p>
        </aside>
      </div>
    </section>
  )
}

export function CartPage() {
  return (
    <Suspense fallback={<StatusMessage role="status" title="Loading your cart…" />}>
      <CartContents />
    </Suspense>
  )
}
