import { Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { cartTotals, resolveCart, useCart } from '../cart/cart'
import { useCartToast } from '../cart/toast'
import { useCatalog } from '../lib/catalog'
import { formatPrice, pluralize } from '../lib/format'
import { salePrice } from '../lib/pricing'
import { ErrorBoundary } from './ErrorBoundary'
import { ProductImage } from './ProductImage'
import { primaryButton, secondaryButton } from './styles'

const OPEN_DELAY = 150
const CLOSE_DELAY = 300

function Contents({ close }: { close: () => void }) {
  const catalog = useCatalog()
  const lines = resolveCart(useCart((s) => s.lines), catalog)
  if (lines.length === 0) {
    return (
      <div className="p-4 text-sm">
        <p className="font-semibold">Your cart is empty</p>
        <Link to="/search" onClick={close} className="mt-2 inline-block font-medium text-action underline underline-offset-2">
          Browse all products
        </Link>
      </div>
    )
  }
  const { itemCount, subtotal } = cartTotals(lines)
  const small = 'h-9 flex-1 px-3 text-sm'
  return (
    <div className="p-3">
      <ul className="max-h-72 divide-y divide-border overflow-y-auto">
        {lines.map(({ product, quantity }) => (
          <li key={product.id} className="flex gap-3 py-2 text-sm first:pt-0">
            <ProductImage src={product.thumbnail} alt="" className="w-12 shrink-0 self-start p-1" />
            <div className="min-w-0 flex-1">
              <Link to={`/product/${product.id}`} onClick={close} className="font-medium hover:text-action">
                {product.title}
              </Link>
              <p className="flex justify-between gap-2 text-muted">
                <span>Qty {quantity}</span>
                <span className="text-text tabular-nums">{formatPrice(salePrice(product) * quantity)}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
        <span>Subtotal ({pluralize(itemCount, 'item')})</span>
        <span className="font-bold tabular-nums">{formatPrice(subtotal)}</span>
      </p>
      <div className="mt-3 flex gap-2">
        <Link to="/cart" onClick={close} className={`${secondaryButton} ${small}`}>
          View cart
        </Link>
        <Link to="/checkout" onClick={close} className={`${primaryButton} ${small}`}>
          Checkout
        </Link>
      </div>
    </div>
  )
}

// A preview of the cart under the header's cart link (desktop header only).
// Mouse: opens after a short delay and closes after a slightly longer one, so passing
// over doesn't flicker and moving into the panel keeps it open. Keyboard: opens on
// keyboard focus, Escape closes and returns focus to the link. Touch: never opens;
// a tap simply follows the link to the cart.
export function MiniCart({ children }: { children: (props: { expanded: boolean; controls: string }) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wrapper = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const { pathname } = useLocation()
  const dismissToast = useCartToast((s) => s.dismiss)

  const later = (next: boolean, delay: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(next), delay)
  }
  const close = () => {
    clearTimeout(timer.current)
    setOpen(false)
  }

  // Never both at once: the preview replaces the toast (it shows the same news).
  useEffect(() => {
    if (open) dismissToast()
  }, [open, dismissToast])
  // A navigation (including a tap through to the cart) closes it.
  useEffect(() => close, [pathname])
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div
      ref={wrapper}
      className="relative"
      onPointerEnter={(e) => e.pointerType === 'mouse' && later(true, OPEN_DELAY)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && later(false, CLOSE_DELAY)}
      onFocus={(e) => {
        clearTimeout(timer.current)
        // Keyboard focus only: a tap can focus the link too, and must not open it.
        if (e.target.matches(':focus-visible') || wrapper.current?.querySelector('[data-mini-cart]')?.contains(e.target)) setOpen(true)
      }}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && close()}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return
        close()
        wrapper.current?.querySelector<HTMLElement>('a[href="/cart"]')?.focus()
      }}
    >
      {children({ expanded: open, controls: panelId })}
      {open && (
        <div
          id={panelId}
          data-mini-cart
          role="region"
          aria-label="Cart preview"
          className="absolute top-full right-0 z-40 mt-2 w-80 rounded-xl border border-border bg-surface shadow-lg"
        >
          <ErrorBoundary onReset={() => {}} fallback={() => <p className="p-4 text-sm">Couldn’t load your cart right now.</p>}>
            <Suspense fallback={<p className="p-4 text-sm text-muted">Loading your cart…</p>}>
              <Contents close={close} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </div>
  )
}
