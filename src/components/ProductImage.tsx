interface Props {
  src: string
  alt: string
  className?: string
  eager?: boolean
}

// Product photos have light backgrounds, so they always sit on a light tile,
// including in dark mode.
export function ProductImage({ src, alt, className = '', eager = false }: Props) {
  return (
    <div className={`aspect-square rounded-lg bg-image-tile p-3 ${className}`}>
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
