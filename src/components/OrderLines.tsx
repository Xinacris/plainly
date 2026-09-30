import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { t } from '../i18n'
import { formatPrice } from '../lib/format'
import type { Address, OrderLine } from '../orders/orders'
import { DateRange } from './DateRange'
import { ProductImage } from './ProductImage'
import { ReturnStatus } from './ReturnStatus'

function EstimateText({ line }: { line: OrderLine }) {
  if (!line.estimate) return <p className="text-sm text-muted">{t.delivery.none(line.shippingInformation)}</p>
  return (
    <p className="text-sm">
      <span className="text-muted">{t.delivery.estimated}</span>
      <DateRange estimate={line.estimate} />
    </p>
  )
}

// One list for checkout, confirmation and past orders, all fed from order-line snapshots.
// Placed orders pass `placedAt`, which adds each item's return window; the orders
// page adds per-item actions (returns) with `actions`.
export function OrderLines({ lines, placedAt, actions }: { lines: OrderLine[]; placedAt?: string; actions?: (line: OrderLine) => ReactNode }) {
  return (
    <ul className="divide-y divide-border">
      {lines.map((line) => (
        <li key={line.productId} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <ProductImage src={line.thumbnail} alt="" className="w-16 shrink-0 self-start p-1.5" />
          <div className="min-w-0 flex-1">
            <Link to={`/product/${line.productId}`} className="font-semibold hover:text-action">
              {line.title}
            </Link>
            <p className="flex justify-between gap-4">
              <span className="text-sm text-muted">
                {line.quantity} × {formatPrice(line.price)}
              </span>
              <span className="font-semibold tabular-nums">{formatPrice(line.price * line.quantity)}</span>
            </p>
            <EstimateText line={line} />
            {placedAt && <ReturnStatus policy={line.returnPolicy} placedAt={placedAt} />}
            {actions?.(line)}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function AddressBlock({ address }: { address: Address }) {
  return (
    <address className="not-italic">
      {address.fullName}
      <br />
      {address.line1}
      {address.line2 && (
        <>
          <br />
          {address.line2}
        </>
      )}
      <br />
      {address.city}, {address.region} {address.postalCode}
    </address>
  )
}
