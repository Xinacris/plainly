import { Suspense, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { cartTotals, resolveCart, useCart, type ResolvedLine } from '../cart/cart'
import { AddressFields } from '../components/AddressFields'
import { OrderLines } from '../components/OrderLines'
import { StatusMessage } from '../components/StatusMessage'
import { primaryButton, secondaryButton } from '../components/styles'
import { useCatalog } from '../lib/catalog'
import { estimateDelivery, formatIsoDate, latestArrival, TRANSIT } from '../lib/delivery'
import { formatPrice, pluralize } from '../lib/format'
import { salePrice } from '../lib/pricing'
import { validateAddress, type AddressErrors } from '../orders/address'
import { EMPTY_ADDRESS, useLastAddress, useOrders, type Address, type OrderLine } from '../orders/orders'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const section = 'rounded-xl border border-border bg-surface p-4 sm:p-6'
const sectionHeading = 'text-lg font-bold tracking-tight'

function toOrderLine({ product, quantity }: ResolvedLine): OrderLine {
  return {
    productId: product.id,
    title: product.title,
    thumbnail: product.thumbnail,
    price: salePrice(product),
    quantity,
    shippingInformation: product.shippingInformation,
    returnPolicy: product.returnPolicy,
    estimate: estimateDelivery(product.shippingInformation),
  }
}

function CheckoutForm({ lines }: { lines: OrderLine[] }) {
  const navigate = useNavigate()
  const place = useOrders((s) => s.place)
  const removeMany = useCart((s) => s.removeMany)
  const lastAddress = useLastAddress()
  const [address, setAddress] = useState<Address>(lastAddress ?? EMPTY_ADDRESS)
  const [submitted, setSubmitted] = useState(false)
  const placing = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Errors only show after the first attempt, then update as the user types.
  const errors: AddressErrors = submitted ? validateAddress(address) : {}
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const arrivesBy = latestArrival(lines.map((l) => l.estimate))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const invalid = Object.keys(validateAddress(address))
    if (invalid.length) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${invalid[0]}"]`)?.focus()
      return
    }
    if (placing.current) return
    placing.current = true
    const trimmed = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v.trim()])) as Address
    const order = place({ address: trimmed, lines, total })
    // Leave checkout before emptying the cart, so it never flashes "Your cart is empty".
    await navigate(`/orders/${order.id}/confirmation`, { replace: true })
    removeMany(lines.map((l) => l.productId))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-6">
        <section aria-labelledby="address-heading" className={section}>
          <h2 id="address-heading" className={sectionHeading}>
            Shipping address
          </h2>
          {lastAddress && <p className="mt-1 text-sm text-muted">Filled in from your last order.</p>}
          <AddressFields value={address} errors={errors} onChange={setAddress} />
        </section>

        <section aria-labelledby="delivery-heading" className={section}>
          <h2 id="delivery-heading" className={sectionHeading}>
            Items and delivery estimates
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Each estimate is the item’s shipping time from its product listing plus {TRANSIT.min}–{TRANSIT.max} business
            days in transit, which is our assumption. They’re estimates, not promises.
          </p>
          <OrderLines lines={lines} />
        </section>

        <section aria-labelledby="payment-heading" className={section}>
          <h2 id="payment-heading" className={sectionHeading}>
            Payment
          </h2>
          <p className="mt-1">
            Payment is simulated. Plainly is a demo store: there’s no card to enter and nothing is charged.
          </p>
        </section>
      </div>

      <aside aria-label="Order summary" className={`${section} lg:sticky lg:top-4`}>
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between gap-4">
            <dt>Items ({itemCount})</dt>
            <dd className="tabular-nums">{formatPrice(total)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-muted">
            <dt>Shipping and tax</dt>
            <dd>None in this demo</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-2 text-lg font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(total)}</dd>
          </div>
        </dl>
        {arrivesBy && (
          <p className="mt-3 text-sm text-muted">
            Estimated to arrive by <span className="font-medium text-text">{formatIsoDate(arrivesBy)}</span>
            {lines.length > 1 && ' (all items)'}
          </p>
        )}
        <button type="submit" className={`${primaryButton} mt-4 w-full`}>
          Place order
        </button>
      </aside>
    </form>
  )
}

function CheckoutContents() {
  const catalog = useCatalog()
  const cartLines = useCart((s) => s.lines)
  const resolved = resolveCart(cartLines, catalog)

  if (resolved.length === 0) {
    return (
      <StatusMessage
        title="Your cart is empty"
        action={
          <Link to="/search" className={secondaryButton}>
            Browse all products
          </Link>
        }
      >
        Add something to your cart to check out.
      </StatusMessage>
    )
  }

  const { itemCount } = cartTotals(resolved)
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted">
          {pluralize(itemCount, 'item')} ·{' '}
          <Link to="/cart" className="underline underline-offset-2 hover:text-text">
            Edit cart
          </Link>
        </p>
      </div>
      <CheckoutForm lines={resolved.map(toOrderLine)} />
    </section>
  )
}

export function CheckoutPage() {
  useDocumentTitle('Checkout')
  return (
    <Suspense fallback={<StatusMessage role="status" title="Loading checkout…" />}>
      <CheckoutContents />
    </Suspense>
  )
}
