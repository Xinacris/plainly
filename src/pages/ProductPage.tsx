import { Suspense, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Breadcrumbs, type Crumb } from '../components/Breadcrumbs'
import { DecisionCard } from '../components/DecisionCard'
import { Gallery } from '../components/Gallery'
import { Rating } from '../components/Rating'
import { StatusMessage } from '../components/StatusMessage'
import { secondaryButton } from '../components/styles'
import { useProduct, type Product } from '../lib/catalog'
import { TRANSIT } from '../lib/delivery'
import { departmentOf } from '../lib/departments'
import { formatCategory, formatRating, pluralize, reviewRating } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'

// Collapsible sections below the decision card. Native <details>, so they work
// with keyboard and screen readers without any script.
function Section({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold tracking-tight [&::-webkit-details-marker]:hidden">
        <h2>{title}</h2>
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted group-open:rotate-180 motion-safe:transition-transform" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  )
}

function Reviews({ product }: { product: Product }) {
  const count = product.reviews.length
  if (count === 0) return <p className="text-muted">No reviews yet.</p>
  return (
    <>
      <p className="text-sm text-muted">
        The rating of {formatRating(reviewRating(product))} is the average of these {pluralize(count, 'review')}. That’s
        too few to rely on by itself.
      </p>
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        {product.reviews.map((review, i) => (
          <li key={i} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-semibold">
              {review.rating} <span className="text-muted">out of 5</span>
            </p>
            <p className="mt-2">{review.comment}</p>
            <p className="mt-3 text-sm text-muted">{review.reviewerName}</p>
          </li>
        ))}
      </ul>
    </>
  )
}

function DetailList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[12rem_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-sm text-muted sm:text-base">{label}</dt>
          <dd className="mb-2 sm:mb-0">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Department › Category › Brand › Product. Each step opens the matching search:
// the brand step is the category filtered by that brand. No brand, no brand step.
function productCrumbs(product: Product): Crumb[] {
  const department = departmentOf(product.category)
  const params = new URLSearchParams()
  const crumbs: Crumb[] = []
  if (department) {
    params.set('department', department.slug)
    crumbs.push({ label: department.name, to: `/search?${params}` })
  }
  params.append('category', product.category)
  crumbs.push({ label: formatCategory(product.category), to: `/search?${params}` })
  if (product.brand) {
    params.append('brand', product.brand)
    crumbs.push({ label: product.brand, to: `/search?${params}` })
  }
  crumbs.push({ label: product.title })
  return crumbs
}

function ProductDetails({ id }: { id: number }) {
  const product = useProduct(id)
  useDocumentTitle(product?.title ?? 'Product not found')
  if (!product) {
    return (
      <StatusMessage
        title="Product not found"
        action={
          <Link to="/search" className={secondaryButton}>
            Browse all products
          </Link>
        }
      >
        We couldn’t find a product at this address.
      </StatusMessage>
    )
  }

  const details: [string, string][] = [
    ['Category', formatCategory(product.category)],
    ...(product.brand ? [['Brand', product.brand] as [string, string]] : []),
    ['SKU', product.sku],
  ]

  return (
    <article className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* grid-cols-1 (minmax(0, 1fr)) so the one-line breadcrumb truncates instead of widening the page. */}
      {/* Phones: photos first (people check it's the right product), then the title and the
          decision card. From md: photos on the left, title and card on the right. */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-y-5 lg:gap-x-12">
        <div className="md:col-start-1 md:row-span-2 md:row-start-1">
          <Gallery product={product} />
        </div>
        <div className="md:col-start-2 md:row-start-1">
          <Breadcrumbs items={productCrumbs(product)} />
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{product.title}</h1>
          <Rating product={product} className="mt-2" />
        </div>
        <div className="md:col-start-2 md:row-start-2">
          <DecisionCard product={product} />
        </div>
      </div>

      <div className="mt-10 border-t border-border">
        <Section title="Description" open>
          <p className="max-w-3xl leading-relaxed">{product.description}</p>
        </Section>
        <Section title={`Reviews (${product.reviews.length})`} open>
          <Reviews product={product} />
        </Section>
        <Section title="Shipping, returns and warranty">
          <DetailList
            rows={[
              ['Shipping', product.shippingInformation],
              ['Returns', product.returnPolicy],
              ['Warranty', product.warrantyInformation],
            ]}
          />
          <p className="mt-4 max-w-3xl text-sm text-muted">
            These are the seller’s own words. The delivery date above adds {TRANSIT.min}–{TRANSIT.max} business days in
            transit to the shipping time, which is our assumption, so it’s an estimate.
          </p>
        </Section>
        <Section title="Product details">
          <DetailList rows={details} />
        </Section>
      </div>
    </article>
  )
}

function ProductSkeleton() {
  return (
    <div aria-label="Loading product" className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
      <div className="aspect-square rounded-lg bg-border motion-safe:animate-pulse" />
      <div className="flex flex-col gap-3">
        <div className="h-4 w-1/3 rounded bg-border motion-safe:animate-pulse" />
        <div className="h-8 w-3/4 rounded bg-border motion-safe:animate-pulse" />
        <div className="h-8 w-1/4 rounded bg-border motion-safe:animate-pulse" />
      </div>
    </div>
  )
}

export function ProductPage() {
  const id = Number(useParams().id)
  return (
    <Suspense fallback={<ProductSkeleton />}>
      {/* Keyed so gallery position, quantity and messages reset when moving between products. */}
      <ProductDetails key={id} id={id} />
    </Suspense>
  )
}
