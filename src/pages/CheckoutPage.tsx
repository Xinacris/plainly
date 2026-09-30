import { Suspense, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { cartTotals, resolveCart, useCart, type ResolvedLine } from '../cart/cart'
import { AddressPicker, type AddressChoice } from '../components/AddressPicker'
import { OrderLines } from '../components/OrderLines'
import { StatusMessage } from '../components/StatusMessage'
import { primaryButton, secondaryButton } from '../components/styles'
import { useCatalog } from '../lib/catalog'
import { estimateDelivery, formatIsoDate, latestArrival, TRANSIT } from '../lib/delivery'
import { t } from '../i18n'
import { formatPrice } from '../lib/format'
import { salePrice } from '../lib/pricing'
import { validateAddress, type AddressErrors } from '../orders/address'
import { useAddressBookData, useOrdersData } from '../account/hooks'
import { trimAddress, type SavedAddress } from '../orders/addresses'
import { EMPTY_ADDRESS, type Address, type OrderLine } from '../orders/orders'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const section = 'rounded-xl border border-border bg-surface p-4 sm:p-6'
const sectionHeading = 'text-lg font-bold tracking-tight'

function addressOf({ id: _id, ...address }: SavedAddress): Address {
  return address
}

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
  const ordersData = useOrdersData()
  const removeMany = useCart((s) => s.removeMany)
  const book = useAddressBookData()
  const { addresses: saved, defaultId } = book
  // The default saved address is preselected (once they've loaded); with none saved,
  // a new one is typed in. An explicit pick wins.
  const [picked, setPicked] = useState<AddressChoice | null>(null)
  const choice: AddressChoice = picked ?? (defaultId ? { kind: 'saved', id: defaultId } : { kind: 'new' })
  const [placeError, setPlaceError] = useState('')
  const [draft, setDraft] = useState<Address>(EMPTY_ADDRESS)
  const [saveDraft, setSaveDraft] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const chosen = choice.kind === 'saved' ? saved.find((a) => a.id === choice.id) : undefined
  // A saved address deleted in another tab falls back to typing one in.
  const typing = !chosen
  const placing = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Errors only show after the first attempt, then update as the user types.
  const errors: AddressErrors = submitted && typing ? validateAddress(draft) : {}
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const arrivesBy = latestArrival(lines.map((l) => l.estimate))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const invalid = typing ? Object.keys(validateAddress(draft)) : []
    if (invalid.length) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${invalid[0]}"]`)?.focus()
      return
    }
    if (placing.current) return
    placing.current = true
    setPlaceError('')
    // The order keeps its own copy, so later edits in the address book never change it.
    const address = chosen ? addressOf(chosen) : trimAddress(draft)
    // Saving the address is part of what was asked for, so a failure stops here and says so.
    const saveError = typing && saveDraft ? await book.add(address) : null
    const { order, error } = saveError ? { order: undefined, error: saveError } : await ordersData.place({ address, lines, total })
    if (!order) {
      placing.current = false
      setPlaceError(t.checkout.notPlaced(error ?? ''))
      return
    }
    // Leave checkout before emptying the cart, so it never flashes "Your cart is empty".
    await navigate(`/orders/${order.id}/confirmation`, { replace: true })
    removeMany(lines.map((l) => l.productId))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-6">
        <section aria-labelledby="address-heading" className={section}>
          <h2 id="address-heading" className={sectionHeading}>
            {t.checkout.shippingAddress}
          </h2>
          {book.status === 'loading' && <p className="mt-3 text-muted">{t.checkout.loadingAddresses}</p>}
          {book.status === 'error' && (
            <p role="alert" className="mt-3 text-sm text-warning">
              {t.checkout.addressesError} {book.error}{' '}
              <button type="button" onClick={book.retry} className="font-medium underline underline-offset-2">
                {t.common.tryAgain}
              </button>
            </p>
          )}
          {book.status === 'ready' && (
            <AddressPicker
              saved={saved}
              defaultId={defaultId}
              choice={chosen ? choice : { kind: 'new' }}
              onChoose={setPicked}
              draft={draft}
              onDraftChange={setDraft}
              errors={errors}
              save={saveDraft}
              onSaveChange={setSaveDraft}
            />
          )}
        </section>

        <section aria-labelledby="delivery-heading" className={section}>
          <h2 id="delivery-heading" className={sectionHeading}>
            {t.checkout.itemsHeading}
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">{t.checkout.itemsNote(TRANSIT.min, TRANSIT.max)}</p>
          <OrderLines lines={lines} />
        </section>

        <section aria-labelledby="payment-heading" className={section}>
          <h2 id="payment-heading" className={sectionHeading}>
            {t.checkout.payment}
          </h2>
          <p className="mt-1">{t.checkout.paymentNote}</p>
        </section>
      </div>

      <aside aria-label={t.checkout.summary} className={`${section} lg:sticky lg:top-4`}>
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between gap-4">
            <dt>{t.checkout.itemsLine(itemCount)}</dt>
            <dd className="tabular-nums">{formatPrice(total)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-muted">
            <dt>{t.checkout.shippingTax}</dt>
            <dd>{t.checkout.noneInDemo}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-2 text-lg font-bold">
            <dt>{t.checkout.total}</dt>
            <dd className="tabular-nums">{formatPrice(total)}</dd>
          </div>
        </dl>
        {arrivesBy && (
          <p className="mt-3 text-sm text-muted">
            {t.checkout.arrivesBy} <span className="font-medium text-text">{formatIsoDate(arrivesBy)}</span>
            {lines.length > 1 && t.checkout.allItems}
          </p>
        )}
        {placeError && (
          <p role="alert" className="mt-3 text-sm text-warning">
            {placeError}
          </p>
        )}
        <button type="submit" disabled={book.status !== 'ready'} className={`${primaryButton} mt-4 w-full`}>
          {t.checkout.place}
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
        title={t.cartPage.empty}
        action={
          <Link to="/search" className={secondaryButton}>
            {t.common.browseAll}
          </Link>
        }
      >
        {t.checkout.emptyBody}
      </StatusMessage>
    )
  }

  const { itemCount } = cartTotals(resolved)
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t.checkout.title}</h1>
        <p className="text-sm text-muted">
          {t.common.items(itemCount)} ·{' '}
          <Link to="/cart" className="underline underline-offset-2 hover:text-text">
            {t.checkout.editCart}
          </Link>
        </p>
      </div>
      <CheckoutForm lines={resolved.map(toOrderLine)} />
    </section>
  )
}

export function CheckoutPage() {
  useDocumentTitle(t.checkout.title)
  return (
    <Suspense fallback={<StatusMessage role="status" title={t.checkout.loading} />}>
      <CheckoutContents />
    </Suspense>
  )
}
