import { useRef, useState, type KeyboardEvent } from 'react'
import { prefersReducedMotion } from '../a11y/display'
import { t } from '../i18n'
import type { Product } from '../lib/catalog'
import { ProductImage } from './ProductImage'


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
    // Already on its way there (e.g. → pressed again at the last photo): don't restart it.
    if (!el || target.current === next) return next
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
  // A scroll we started can be interrupted by another one; that "end" lands between
  // photos and mustn't reset the position. A real stop is always on a snap point.
  const onScrollEnd = () => {
    const el = scroller.current
    if (!el || el.clientWidth === 0) return
    const exact = el.scrollLeft / el.clientWidth
    if (target.current !== null && Math.abs(exact - Math.round(exact)) > 0.02) return
    target.current = null
    setIndex(Math.round(exact))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
    if (!many || !step[e.key]) return
    e.preventDefault()
    const next = goTo((target.current ?? index) + step[e.key], true)
    // Arrowing from a thumbnail keeps focus on the thumbnails, on the new one.
    if (thumbnails.current?.contains(document.activeElement)) thumbnails.current.querySelectorAll('button')[next]?.focus()
  }

  const label = (i: number) => t.gallery.show(i + 1, images.length)

  return (
    <div onKeyDown={onKeyDown}>
      <div
        ref={scroller}
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
        role={many ? 'region' : undefined}
        aria-label={many ? t.gallery.region(product.title, index + 1, images.length) : undefined}
        tabIndex={many ? 0 : undefined}
        // Keyboard users Tab here for ←/→ (and see the focus ring). A tap or click
        // shouldn't focus it: some browsers then draw the ring on touch.
        onMouseDown={(e) => e.preventDefault()}
        // The frame, not each slide, is the rounded light tile, and it clips the slides to
        // its corners: a swipe looks like one surface sliding, with no notch or seam where
        // two slides meet. isolate + translateZ(0) make iOS Safari clip scrolling content
        // to the radius (a mask would also clip the keyboard focus ring).
        className="isolate flex transform-[translateZ(0)] snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg bg-image-tile [scrollbar-width:none] md:overflow-hidden [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div key={src} className="w-full shrink-0 snap-center">
            {/* About 40–45% of a phone's height, so the price still makes the first screen.
                w-full matters: with an auto width, CSS carries the max-height across the
                aspect ratio into a max-width, and the tile shrank narrower than the slide,
                left-aligned. Now only the height is capped; the photo centers in the tile. */}
            <ProductImage
              src={src}
              alt={many ? t.gallery.image(product.title, i + 1, images.length) : product.title}
              priority={i === 0}
              tile={false}
              // At the largest text size a little less, so the price still makes the first screen.
              className="w-full max-h-[45dvh] p-6 in-data-[text=larger]:max-h-[36dvh] md:max-h-none"
            />
          </div>
        ))}
      </div>

      {many && (
        <>
          {/* Phones: dots show the position and can be tapped. */}
          <ul className="mt-2 flex justify-center gap-1 md:hidden" aria-label={t.gallery.dots}>
            {images.map((src, i) => (
              <li key={src}>
                <button type="button" onClick={() => goTo(i, true)} aria-label={label(i)} aria-pressed={i === index} className="grid size-6 place-items-center rounded-full">
                  <span className={`block size-2 rounded-full ${i === index ? 'bg-action' : 'bg-border-strong'}`} />
                </button>
              </li>
            ))}
          </ul>
          {/* Desktop: thumbnails, as before. */}
          <ul ref={thumbnails} className="mt-3 hidden flex-wrap gap-2 md:flex" aria-label={t.gallery.thumbnails}>
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
