import { Suspense, useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { maxQuantity, useCart, useCartQuantity } from '../cart/cart'
import { ProductImage } from '../components/ProductImage'
import { Rating } from '../components/Rating'
import { StatusMessage } from '../components/StatusMessage'
import { StockNote } from '../components/StockNote'
import { primaryButton, secondaryButton, textLink } from '../components/styles'
import { useProduct, type Product } from '../lib/catalog'
import { formatCategory, formatPrice, formatRating, pluralize, reviewRating } from '../lib/format'

function Gallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0)
  const { images } = product
  return (
    <div>
      <ProductImage src={images[index] ?? product.thumbnail} alt={product.title} eager className="p-6" />
      {images.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Product images">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-pressed={i === index}
                className={`block w-16 rounded-lg border-2 ${i === index ? 'border-action' : 'border-transparent'}`}
              >
                <ProductImage src={src} alt="" className="p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AddToCart({ product }: { product: Product }) {
  const add = useCart((s) => s.add)
  const inCart = useCartQuantity(product.id)
  const max = maxQuantity(product)
  const remaining = max - inCart
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const selectId = useId()

  if (product.stock <= 0) return null

  const handleAdd = () => {
    const added = add(product.id, Math.min(quantity, remaining), max)
    setMessage(`Added ${added} to your cart.`)
    setQuantity(1)
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {remaining > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={selectId} className="text-sm text-muted">
              Quantity
            </label>
            <select
              id={selectId}
              value={Math.min(quantity, remaining)}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="h-11 rounded-lg border border-border-strong bg-surface px-3 text-text"
            >
              {Array.from({ length: remaining }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={handleAdd} className={`${primaryButton} flex-1 sm:flex-none`}>
            Add to cart
          </button>
        </div>
      )}
      {remaining <= 0 && (
        <p className="text-sm text-muted">You have the most you can buy ({max}) in your cart.</p>
      )}
      <div aria-live="polite" className="text-sm">
        {message && (
          <p>
            {message}{' '}
            <Link to="/cart" className={textLink}>
              View cart
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

function Reviews({ product }: { product: Product }) {
  const count = product.reviews.length
  if (count === 0) return null
  return (
    <section aria-labelledby="reviews-heading" className="mt-12 border-t border-border pt-8">
      <h2 id="reviews-heading" className="text-xl font-bold tracking-tight">
        Reviews
      </h2>
      <p className="mt-1 text-sm text-muted">
        The rating of {formatRating(reviewRating(product))} is the average of these {pluralize(count, 'review')}. That’s
        too few to rely on by itself.
      </p>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
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
    </section>
  )
}

function ProductDetails({ id }: { id: number }) {
  const product = useProduct(id)
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

  return (
    <article className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <Gallery product={product} />
        <div>
          <p className="text-sm text-muted">
            {formatCategory(product.category)}
            {product.brand && ` · ${product.brand}`}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{product.title}</h1>
          <Rating product={product} className="mt-2" />
          <p className="mt-4 text-3xl font-bold">{formatPrice(product.price)}</p>
          <div className="mt-2">
            <StockNote product={product} />
          </div>
          <AddToCart product={product} />
          <p className="mt-8 leading-relaxed">{product.description}</p>
        </div>
      </div>
      <Reviews product={product} />
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
