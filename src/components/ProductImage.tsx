interface Props {
  src: string
  alt: string
  className?: string
  eager?: boolean
  /** False when a parent already draws the tile (the gallery frame): square, no background. */
  tile?: boolean
}

// Product photos have light backgrounds, so they always sit on a light tile,
// including in dark mode. The photo blends into whatever tile is behind it.
export function ProductImage({ src, alt, className = '', eager = false, tile = true }: Props) {
  return (
    <div className={`aspect-square p-3 ${tile ? 'rounded-lg bg-image-tile' : ''} ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={600}
        height={600}
        className="size-full object-contain mix-blend-multiply"
      />
    </div>
  )
}
