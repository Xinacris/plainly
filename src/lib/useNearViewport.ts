import { useEffect, useState, type RefObject } from 'react'

// Images load when they come within about half a phone screen of view. Native
// loading="lazy" starts much earlier (Chrome loads anything within 1,250–2,500px),
// which on the home page meant most of its 56 images on first load. The horizontal
// margin (scrollMargin, where supported) preloads the next card or photo in a
// sideways row; without it they load as they scroll in.
const MARGIN = '300px 0px'
const SCROLL_MARGIN = '0px 200px'

const callbacks = new WeakMap<Element, () => void>()
let observer: IntersectionObserver | null = null

function shared(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        callbacks.get(entry.target)?.()
        callbacks.delete(entry.target)
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: MARGIN, scrollMargin: SCROLL_MARGIN } as IntersectionObserverInit,
  )
  return observer
}

/** True once the element has come near the viewport; stays true. */
export function useNearViewport(ref: RefObject<Element | null>, skip = false): boolean {
  // Without IntersectionObserver (very old browsers), everything loads right away.
  const [near, setNear] = useState(() => skip || typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (near || !element) return
    const io = shared()
    if (!io) return
    callbacks.set(element, () => setNear(true))
    io.observe(element)
    return () => {
      callbacks.delete(element)
      io.unobserve(element)
    }
  }, [ref, near])
  return near || skip
}
