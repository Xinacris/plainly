import { Link } from 'react-router'
import type { Product } from '../lib/catalog'
import { CompareToggle } from './CompareToggle'
import { Price } from './Price'
import { ProductImage } from './ProductImage'
import { Rating } from './Rating'
import { StockNote } from './StockNote'

/** `className` sets extra sizing, e.g. a fixed width inside a scrolling row. */
export function ProductCard({ product, className = '' }: { product: Product; className?: string }) {
  return (
    <li className={`group relative flex flex-col rounded-xl border border-border bg-surface p-3 ${className}`}>
      <ProductImage src={product.thumbnail} alt="" />
      {/* Every line sits at the same height across a row: the brand line keeps its height
          without a brand, the title always takes two lines, and the price follows the
          rating directly. Cards stretch to the row's height; the leftover space goes at
          the bottom, below Compare. */}
      <div className="mt-3 flex flex-col gap-1">
        {/* lang="en": brands are English data, and Turkish uppercase would turn "i" into "İ". */}
        <p lang="en" aria-hidden={product.brand ? undefined : true} className="h-4 truncate text-xs leading-4 font-medium tracking-wide text-muted uppercase">
          {product.brand}
        </p>
        {/* Two lines exactly; longer titles get an ellipsis. The clamp is visual only, so the
            link's accessible name is the full title, which is also its tooltip. */}
        <h2 lang="en" className="line-clamp-2 min-h-[2lh] font-semibold leading-snug">
          {/* The stretched link makes the whole card clickable with one tab stop. */}
          <Link to={`/product/${product.id}`} title={product.title} className="after:absolute after:inset-0 after:rounded-xl group-hover:text-action">
            {product.title}
          </Link>
        </h2>
        <Rating product={product} compact />
        <div className="flex flex-col gap-0.5 pt-2">
          <Price product={product} />
          <StockNote product={product} exceptionsOnly />
        </div>
        <div className="mt-1">
          <CompareToggle product={product} />
        </div>
      </div>
    </li>
  )
}

export function ProductCardSkeleton() {
  return (
    <li aria-hidden="true" className="flex flex-col rounded-xl border border-border bg-surface p-3">
      <div className="aspect-square rounded-lg bg-border motion-safe:animate-pulse" />
      <div className="mt-3 h-4 w-3/4 rounded bg-border motion-safe:animate-pulse" />
      <div className="mt-2 h-4 w-1/2 rounded bg-border motion-safe:animate-pulse" />
      <div className="mt-4 h-5 w-1/3 rounded bg-border motion-safe:animate-pulse" />
    </li>
  )
}

export const gridClass = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5'
