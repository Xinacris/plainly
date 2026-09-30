import type { ReactNode } from 'react'
import type { Product } from '../lib/catalog'
import { estimateDelivery, TRANSIT } from '../lib/delivery'
import { returnFact, warrantyFact, type Fact } from '../lib/facts'
import { AddToCart } from './AddToCart'
import { CompareButton } from './CompareToggle'
import { DateRange } from './DateRange'
import { Price } from './Price'
import { StockNote } from './StockNote'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

function FactText({ fact }: { fact: Fact }) {
  if (!fact.flagged) return <p>{fact.text}</p>
  return (
    <p className="flex items-center gap-1.5 font-semibold text-warning">
      <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M10 1.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4Zm0 11.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm0-8a1 1 0 0 0-1 1v4.6a1 1 0 1 0 2 0V6.2a1 1 0 0 0-1-1Z" />
      </svg>
      {fact.text}
    </p>
  )
}

function Delivery({ product }: { product: Product }) {
  if (product.stock <= 0) return <p className="text-muted">Not available while out of stock</p>
  const estimate = estimateDelivery(product.shippingInformation)
  if (!estimate) return <p>{product.shippingInformation}</p>
  return (
    <>
      <p>
        <DateRange estimate={estimate} />
      </p>
      <p className="text-sm text-muted">
        Estimate: {product.shippingInformation.toLowerCase()}, plus {TRANSIT.min}–{TRANSIT.max} business days in transit.
      </p>
    </>
  )
}

// The facts that decide a purchase, together and above the fold (decision #5).
export function DecisionCard({ product }: { product: Product }) {
  return (
    <section aria-label="Price and key facts" className="rounded-xl border border-border bg-surface p-4">
      <Price product={product} size="page" />
      <dl className="mt-3 divide-y divide-border border-t border-border">
        <Row label="Delivery">
          <Delivery product={product} />
        </Row>
        <Row label="Returns">
          <FactText fact={returnFact(product.returnPolicy)} />
        </Row>
        <Row label="Warranty">
          <FactText fact={warrantyFact(product.warrantyInformation)} />
        </Row>
        <Row label="Stock">
          <StockNote product={product} fact />
        </Row>
      </dl>
      <AddToCart product={product} />
      <div className="mt-3">
        <CompareButton product={product} />
      </div>
    </section>
  )
}
