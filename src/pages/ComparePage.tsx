import { Suspense, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { compareDepartmentName, MAX_COMPARE, useCompare, useCompareProducts } from '../compare/compare'
import { MixedNotice } from '../components/CompareTray'
import { DateRange } from '../components/DateRange'
import { Price } from '../components/Price'
import { ProductImage } from '../components/ProductImage'
import { StatusMessage } from '../components/StatusMessage'
import { StockNote } from '../components/StockNote'
import { secondaryButton, textLink } from '../components/styles'
import type { Product } from '../lib/catalog'
import { estimateDelivery } from '../lib/delivery'
import { departmentOf } from '../lib/departments'
import { returnFact, warrantyFact } from '../lib/facts'
import { t } from '../i18n'
import { formatRating, reviewRating } from '../lib/format'
import { salePrice } from '../lib/pricing'
import { useDocumentTitle } from '../lib/useDocumentTitle'

interface Attribute {
  label: () => string
  /** Two products differ on this row when their keys differ. */
  key: (p: Product) => string
  render: (p: Product) => ReactNode
}

function stockKey(p: Product): string {
  if (p.stock <= 0) return 'out'
  if (p.availabilityStatus === 'Low Stock' && p.stock <= 5) return `low-${p.stock}`
  return 'in'
}

function Delivery({ product }: { product: Product }) {
  if (product.stock <= 0) return <span className="text-muted">{t.compare.notAvailable}</span>
  const estimate = estimateDelivery(product.shippingInformation)
  if (!estimate) return <>{product.shippingInformation}</>
  return <DateRange estimate={estimate} />
}

function Flagged({ text, flagged }: { text: string; flagged: boolean }) {
  return <span className={flagged ? 'font-semibold text-warning' : ''}>{text}</span>
}

// The same facts as the decision card, in the same words.
const ATTRIBUTES: Attribute[] = [
  { label: () => t.compare.rows.price, key: (p) => String(salePrice(p)), render: (p) => <Price product={p} /> },
  {
    label: () => t.compare.rows.rating,
    key: (p) => formatRating(reviewRating(p)),
    render: (p) => t.rating.outOf5(formatRating(reviewRating(p))),
  },
  { label: () => t.compare.rows.reviews, key: (p) => String(p.reviews.length), render: (p) => <span className="whitespace-nowrap">{t.common.reviews(p.reviews.length)}</span> },
  {
    label: () => t.compare.rows.delivery,
    key: (p) => (p.stock <= 0 ? 'none' : JSON.stringify(estimateDelivery(p.shippingInformation) ?? p.shippingInformation)),
    render: (p) => <Delivery product={p} />,
  },
  { label: () => t.compare.rows.returns, key: (p) => p.returnPolicy, render: (p) => <Flagged {...returnFact(p.returnPolicy)} /> },
  { label: () => t.compare.rows.warranty, key: (p) => p.warrantyInformation, render: (p) => <Flagged {...warrantyFact(p.warrantyInformation)} /> },
  { label: () => t.compare.rows.stock, key: stockKey, render: (p) => <StockNote product={p} fact /> },
]

function differs(attribute: Attribute, products: Product[]): boolean {
  return new Set(products.map(attribute.key)).size > 1
}

function DiffersLabel() {
  return <span className="ml-2 rounded bg-action px-1.5 py-0.5 text-xs font-semibold text-on-action">{t.compare.differs}</span>
}

function CompareTable({ products, onlyDifferences }: { products: Product[]; onlyDifferences: boolean }) {
  const remove = useCompare((s) => s.remove)
  const rows = ATTRIBUTES.map((a) => ({ ...a, differs: differs(a, products) })).filter((a) => a.differs || !onlyDifferences)
  const cols = products.length
  const cell = 'px-2 py-3 align-top text-sm sm:px-4 sm:text-base'
  const highlight = 'bg-action/10'

  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">{t.compare.caption(products.map((p) => p.title).join(', '))}</caption>
      <colgroup>
        <col className="hidden w-44 sm:table-column" />
        {products.map((p) => (
          <col key={p.id} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <td className="hidden sm:table-cell" />
          {products.map((p) => (
            <th key={p.id} scope="col" className={`${cell} text-left font-normal`}>
              <Link to={`/product/${p.id}`} tabIndex={-1} aria-hidden="true" className="block">
                <ProductImage src={p.thumbnail} alt="" className="p-2" />
              </Link>
              <Link to={`/product/${p.id}`} className="mt-2 block font-semibold break-words hover:text-action">
                {p.title}
              </Link>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="mt-1 text-sm font-medium text-muted underline underline-offset-2 hover:text-text"
              >
                {t.common.remove}<span className="sr-only"> {p.title}</span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      {rows.map((row) => (
        <tbody key={row.label()} className="border-t border-border" data-differs={row.differs || undefined}>
          {/* On phones the label gets its own full-width row above the values. */}
          <tr className="sm:hidden">
            <th scope="colgroup" colSpan={cols} className={`px-2 pt-3 text-left text-sm font-semibold ${row.differs ? highlight : ''}`}>
              {row.label()}
              {row.differs && <DiffersLabel />}
            </th>
          </tr>
          <tr className={row.differs ? highlight : ''}>
            <th scope="row" className={`${cell} hidden text-left font-semibold sm:table-cell`}>
              {row.label()}
              {row.differs && (
                <span className="block pt-1">
                  <DiffersLabel />
                </span>
              )}
            </th>
            {products.map((p) => (
              <td key={p.id} className={`${cell} break-words`}>
                {row.render(p)}
              </td>
            ))}
          </tr>
        </tbody>
      ))}
    </table>
  )
}

function CompareContents() {
  const clear = useCompare((s) => s.clear)
  const [onlyDifferences, setOnlyDifferences] = useState(false)
  const products = useCompareProducts()
  const departmentName = compareDepartmentName(products)
  // "Add one more" stays in the comparison's department.
  const addMoreUrl = products[0] ? `/search?department=${departmentOf(products[0].category)?.slug ?? ''}` : '/search'

  if (products.length < 2) {
    return (
      <StatusMessage
        title={products.length === 0 ? t.compare.nothingYet : t.compare.oneMore}
        action={
          <Link to={addMoreUrl} className={secondaryButton}>
            {products.length === 0 ? t.compare.browseProducts : t.compare.browseDepartment(departmentName)}
          </Link>
        }
      >
        {t.compare.howTo(MAX_COMPARE)}
      </StatusMessage>
    )
  }

  const differingCount = ATTRIBUTES.filter((a) => differs(a, products)).length
  return (
    <section className="mx-auto max-w-6xl px-2 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.compare.comparingIn(departmentName)}</h1>
          <MixedNotice department={departmentName} />
          <p className="mt-1 text-sm text-muted">
            {differingCount === 0 ? t.compare.allMatch : t.compare.someDiffer(differingCount, ATTRIBUTES.length)}
            {products.length < MAX_COMPARE && (
              <>
                {' '}
                {t.compare.youCan}{' '}
                <Link to={addMoreUrl} className={textLink}>
                  {t.compare.addOneMore}
                </Link>
                .
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyDifferences}
              onChange={(e) => setOnlyDifferences(e.target.checked)}
              className="size-4 accent-action"
            />
            {t.compare.onlyDiffers}
          </label>
          <button type="button" onClick={clear} className="text-sm font-medium text-muted underline underline-offset-2 hover:text-text">
            {t.common.clearAll}
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-surface">
        <CompareTable products={products} onlyDifferences={onlyDifferences} />
      </div>
    </section>
  )
}

export function ComparePage() {
  useDocumentTitle(t.compare.pageTitle)
  return (
    <Suspense fallback={<StatusMessage role="status" title={t.compare.loading} />}>
      <CompareContents />
    </Suspense>
  )
}
