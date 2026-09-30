import { useRef } from 'react'
import { useNearViewport } from '../lib/useNearViewport'

interface Props {
  src: string
  alt: string
  className?: string
  /** In the first screen: load right away instead of when it comes near. */
  eager?: boolean
  /** The main product photo: also ask the browser to fetch it first. */
  priority?: boolean
  tile?: boolean
}

// The square box is sized before the photo arrives, so nothing shifts while it loads.
export function ProductImage({ src, alt, className = '', eager = false, priority = false, tile = true }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const load = useNearViewport(box, eager || priority)
  return (
    <div ref={box} className={`aspect-square p-3 ${tile ? 'rounded-lg bg-image-tile' : ''} ${className}`}>
      <img
        src={load ? src : undefined}
        alt={alt}
        loading={eager || priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        width={600}
        height={600}
        className={`size-full object-contain mix-blend-multiply ${load ? '' : 'opacity-0'}`}
      />
    </div>
  )
}
