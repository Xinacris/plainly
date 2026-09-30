import { Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useCartToast, type CartToast as Toast } from '../cart/toast'
import { t } from '../i18n'
import { useCatalog } from '../lib/catalog'
import { ProductImage } from './ProductImage'
import { primaryButton, secondaryButton } from './styles'

const DISMISS_AFTER = 5000

function message(toast: Toast, title: string): string {
  const added = t.toast.announce(toast.added, title)
  return toast.total > toast.added ? `${added} ${t.toast.nowHave(toast.total)}` : added
}

function ToastCard({ toast }: { toast: Toast }) {
  const product = useCatalog().find((p) => p.id === toast.productId)
  const dismiss = useCartToast((s) => s.dismiss)
  const [paused, setPaused] = useState(false)

  // Auto-dismiss, paused while hovered or focused; every new add (new id) restarts it.
  useEffect(() => {
    if (paused) return
    const timer = setTimeout(dismiss, DISMISS_AFTER)
    return () => clearTimeout(timer)
  }, [toast.id, paused, dismiss])

  if (!product) return null
  const small = 'h-9 flex-1 px-3 text-sm'
  return (
    <section
      aria-label={t.toast.region}
      style={{ top: toast.top }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPaused(false)}
      // Phones: full width near the top, clear of the compare tray at the bottom.
      // Desktop: top right, lined up with the header's cart link.
      className="fixed inset-x-4 z-40 rounded-xl border border-border bg-surface p-3 shadow-lg sm:right-[max(1rem,calc((100vw-72rem)/2+1rem))] sm:left-auto sm:w-80 motion-safe:transition motion-safe:duration-200 motion-safe:starting:-translate-y-2 motion-safe:starting:opacity-0"
    >
      <div className="flex gap-3">
        <ProductImage src={product.thumbnail} alt="" className="w-14 shrink-0 self-start p-1" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">{t.toast.added(toast.added)}</p>
          <p className="text-text">{product.title}</p>
          {toast.total > toast.added && <p className="text-muted">{t.toast.nowHave(toast.total)}</p>}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.common.close}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-text"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Link to="/cart" onClick={dismiss} className={`${secondaryButton} ${small}`}>
          {t.common.viewCart}
        </Link>
        <Link to="/checkout" onClick={dismiss} className={`${primaryButton} ${small}`}>
          {t.common.checkout}
        </Link>
      </div>
    </section>
  )
}

// The live region is always mounted, so screen readers hear each add, politely;
// the visible card isn't read out as a whole.
function Announcement() {
  const toast = useCartToast((s) => s.toast)
  const product = useCatalog().find((p) => p.id === toast?.productId)
  return (
    <p aria-live="polite" className="sr-only">
      {toast && product ? message(toast, product.title) : ''}
    </p>
  )
}

export function CartToast() {
  const toast = useCartToast((s) => s.toast)
  return (
    <Suspense fallback={null}>
      <Announcement />
      {toast && <ToastCard key={toast.productId} toast={toast} />}
    </Suspense>
  )
}
