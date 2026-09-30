import { Suspense } from 'react'
import { Link } from 'react-router'
import { cartTotals, maxQuantity, resolveCart, useCart, type ResolvedLine } from '../cart/cart'
import { ProductImage } from '../components/ProductImage'
import { QuantityStepper } from '../components/QuantityStepper'
import { StatusMessage } from '../components/StatusMessage'
import { primaryButton, secondaryButton } from '../components/styles'
import { useCatalog } from '../lib/catalog'
import { t } from '../i18n'
import { formatPrice } from '../lib/format'
import { salePrice } from '../lib/pricing'
import { useDocumentTitle } from '../lib/useDocumentTitle'

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
          <p className="text-sm text-muted">{t.cartPage.each(formatPrice(salePrice(product)))}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <QuantityStepper
              value={quantity}
              max={maxQuantity(product)}
              onChange={(q) => setQuantity(product.id, q)}
              label={product.title}
            />
            <button type="button" onClick={() => remove(product.id)} className="text-sm font-medium text-muted underline underline-offset-2 hover:text-text">
              {t.common.remove}<span className="sr-only"> {product.title}</span>
            </button>
          </div>
        </div>
        <p className="font-bold sm:text-right">{formatPrice(salePrice(product) * quantity)}</p>
      </div>
    </li>
  )
}

function CartContents() {
  const catalog = useCatalog()
  const lines = useCart((s) => s.lines)
  const resolved = resolveCart(lines, catalog)

  if (resolved.length === 0) {
    return (
      <StatusMessage
        title={t.cartPage.empty}
        action={
          <Link to="/search" className={secondaryButton}>
            {t.common.browseAll}
          </Link>
        }
      />
    )
  }

  const { itemCount, subtotal } = cartTotals(resolved)

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">{t.cartPage.title}</h1>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface px-4">
          {resolved.map((line) => (
            <CartRow key={line.productId} line={line} />
          ))}
        </ul>
        <aside aria-label={t.cartPage.summary} className="rounded-xl border border-border bg-surface p-4">
          <p className="flex justify-between gap-4">
            <span>{t.cartPage.subtotal(t.common.items(itemCount))}</span>
            <span className="font-bold">{formatPrice(subtotal)}</span>
          </p>
          <Link to="/checkout" className={`${primaryButton} mt-4 w-full`}>
            {t.cartPage.goToCheckout}
          </Link>
        </aside>
      </div>
    </section>
  )
}

export function CartPage() {
  useDocumentTitle(t.cartPage.title)
  return (
    <Suspense fallback={<StatusMessage role="status" title={t.cartPage.loading} />}>
      <CartContents />
    </Suspense>
  )
}
