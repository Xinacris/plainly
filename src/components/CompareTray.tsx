import { Suspense } from 'react'
import { Link } from 'react-router'
import { compareDepartmentName, MAX_COMPARE, useCompare, useCompareProducts, useTrayVisible } from '../compare/compare'
import { useCatalog } from '../lib/catalog'
import { t } from '../i18n'
import { departmentName as nameOf, findDepartment } from '../lib/departments'
import { ConfirmDialog } from './ConfirmDialog'
import { ProductImage } from './ProductImage'
import { primaryButton } from './styles'

function FullNotice() {
  const fullNotice = useCompare((s) => s.fullNotice)
  return (
    <p aria-live="polite" className="text-sm font-medium text-warning empty:hidden">
      {fullNotice && t.compare.full(MAX_COMPARE)}
    </p>
  )
}

const departmentName = (slug: string | null | undefined) => {
  const department = findDepartment(slug)
  return department ? nameOf(department) : (slug ?? '')
}

// Adding a product from another department asks first, instead of failing silently.
function StartNewDialog() {
  const catalog = useCatalog()
  const pending = useCompare((s) => s.pending)
  const department = useCompare((s) => s.department)
  const startNew = useCompare((s) => s.startNew)
  const cancelPending = useCompare((s) => s.cancelPending)
  const product = catalog.find((p) => p.id === pending?.id)
  return (
    <ConfirmDialog
      open={Boolean(pending)}
      title={t.compare.startNewTitle}
      confirmLabel={t.compare.startNew}
      onConfirm={startNew}
      onCancel={cancelPending}
    >
      <p>{t.compare.startNewBody}</p>
      {product && (
        <p className="mt-2 text-muted">{t.compare.startNewDetail(departmentName(department), product.title, departmentName(pending?.department))}</p>
      )}
    </ConfirmDialog>
  )
}

// Once, after a saved selection that mixed departments was cut down to the first one's.
export function MixedNotice({ department }: { department: string }) {
  const mixed = useCompare((s) => s.mixedNotice)
  const dismiss = useCompare((s) => s.dismissMixedNotice)
  if (!mixed) return null
  return (
    <p role="status" className="text-sm">
      {t.compare.mixed(department)}{' '}
      <button type="button" onClick={dismiss} className="font-medium text-muted underline underline-offset-2 hover:text-text">
        {t.common.ok}
      </button>
    </p>
  )
}

function TrayContents() {
  const products = useCompareProducts()
  const department = compareDepartmentName(products)
  const remove = useCompare((s) => s.remove)
  const clear = useCompare((s) => s.clear)
  const needed = 2 - products.length

  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <ul className="flex gap-2" aria-label={t.compare.trayList}>
        {products.map((p) => (
          <li key={p.id} className="relative">
            <ProductImage src={p.thumbnail} alt={p.title} className="w-12 p-1 sm:w-14" />
            <button
              type="button"
              onClick={() => remove(p.id)}
              aria-label={t.compare.removeFrom(p.title)}
              className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border border-border-strong bg-surface text-muted hover:text-text"
            >
              <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </li>
        ))}
        {Array.from({ length: MAX_COMPARE - products.length }, (_, i) => (
          <li key={`empty-${i}`} aria-hidden="true" className="size-12 rounded-lg border-2 border-dashed border-border sm:size-14" />
        ))}
      </ul>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="font-semibold">{t.compare.comparingIn(department)}</span>
          <span className="whitespace-nowrap text-muted">
            {t.compare.countOf(products.length, MAX_COMPARE)}
          </span>
          <button type="button" onClick={clear} className="font-medium text-muted underline underline-offset-2 hover:text-text">
            {t.compare.clear}
          </button>
        </p>
        <FullNotice />
        <MixedNotice department={department} />
      </div>
      {/* Phones: a second row with a full-width action. From sm: inline at the end. */}
      <div className="w-full sm:w-auto">
        {needed > 0 && <p className="text-sm text-muted">{t.compare.addMore(needed)}</p>}
        {needed <= 0 && (
          <Link to="/compare" className={`${primaryButton} h-10 w-full sm:w-auto`}>
            {t.compare.go}
          </Link>
        )}
      </div>
      <StartNewDialog />
    </div>
  )
}

// Slides up from the bottom when it appears, unless reduced motion is preferred.
export function CompareTray() {
  const visible = useTrayVisible()
  if (!visible) return null
  return (
    <section
      aria-label={t.compare.region}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface shadow-[0_-4px_16px_rgb(0_0_0/0.08)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:translate-y-full"
    >
      <Suspense fallback={null}>
        <TrayContents />
      </Suspense>
    </section>
  )
}
