import { useRef, useState, type KeyboardEvent } from 'react'
import type { Product } from '../lib/catalog'
import { ProductImage } from './ProductImage'

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// One photo at a time in a native horizontal scroller with snap points: on phones
// you swipe it like a phone gallery, and the dots show (and set) the position. On
// desktop the scroller doesn't scroll by hand; the thumbnails and the ←/→ keys move
// it. Its scroll position is the single source of truth for which photo is shown.
export function Gallery({ product }: { product: Product }) {
  const images = product.images.length > 0 ? product.images : [product.thumbnail]
  const many = images.length > 1
  const [index, setIndex] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const thumbnails = useRef<HTMLUListElement>(null)
  // While a scroll we started (dot, thumbnail, arrow key) is on its way, this is where
  // it's going; the positions it passes through mustn't move the dots or the keys' base.
  const target = useRef<number | null>(null)

  const shownNow = () => {
    const el = scroller.current
    return el && el.clientWidth > 0 ? Math.round(el.scrollLeft / el.clientWidth) : 0
  }

  const goTo = (i: number, smooth: boolean) => {
    const el = scroller.current
    const next = Math.max(0, Math.min(images.length - 1, i))
    if (!el) return next
    setIndex(next)
    const animate = smooth && !prefersReducedMotion() && next !== shownNow()
    target.current = animate ? next : null
    el.scrollTo({ left: next * el.clientWidth, behavior: animate ? 'smooth' : 'auto' })
    return next
  }

  // A swipe updates the dots as it goes; a scroll we started only when it lands.
  const onScroll = () => {
    if (target.current !== null) return
    const shown = shownNow()
    if (shown !== index) setIndex(shown)
  }
  const onScrollEnd = () => {
    target.current = null
    setIndex(shownNow())
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
    if (!many || !step[e.key]) return
    e.preventDefault()
    const next = goTo((target.current ?? index) + step[e.key], true)
    // Arrowing from a thumbnail keeps focus on the thumbnails, on the new one.
    if (thumbnails.current?.contains(document.activeElement)) thumbnails.current.querySelectorAll('button')[next]?.focus()
  }

  const label = (i: number) => `Show image ${i + 1} of ${images.length}`

  return (
    <div onKeyDown={onKeyDown}>
      <div
        ref={scroller}
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
        role={many ? 'region' : undefined}
        aria-label={many ? `${product.title} photos, ${index + 1} of ${images.length}` : undefined}
        tabIndex={many ? 0 : undefined}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg [scrollbar-width:none] md:overflow-hidden [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div key={src} className="w-full shrink-0 snap-center">
            {/* About 40–45% of a phone's height, so the price still makes the first screen. */}
            <ProductImage
              src={src}
              alt={many ? `${product.title}, image ${i + 1} of ${images.length}` : product.title}
              eager={i === 0}
              className="max-h-[45dvh] p-6 md:max-h-none"
            />
          </div>
        ))}
      </div>

      {many && (
        <>
          {/* Phones: dots show the position and can be tapped. */}
          <ul className="mt-2 flex justify-center gap-1 md:hidden" aria-label="Choose a photo">
            {images.map((src, i) => (
              <li key={src}>
                <button type="button" onClick={() => goTo(i, true)} aria-label={label(i)} aria-pressed={i === index} className="grid size-6 place-items-center rounded-full">
                  <span className={`block size-2 rounded-full ${i === index ? 'bg-action' : 'bg-border-strong'}`} />
                </button>
              </li>
            ))}
          </ul>
          {/* Desktop: thumbnails, as before. */}
          <ul ref={thumbnails} className="mt-3 hidden flex-wrap gap-2 md:flex" aria-label="Product images">
            {images.map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => goTo(i, false)}
                  aria-label={label(i)}
                  aria-pressed={i === index}
                  className={`block w-16 rounded-lg border-2 ${i === index ? 'border-action' : 'border-transparent'}`}
                >
                  <ProductImage src={src} alt="" className="p-1" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
