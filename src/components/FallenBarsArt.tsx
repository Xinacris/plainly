// The 404 illustration: the logo's three bars, the middle one fallen over and lying
// flat on the ground in front of the others. Redrawn as SVG from
// design/gemini-404-concept.jpeg so it follows the theme: the bars are currentColor
// (the action green, mint in dark mode) and the ground shadow is the muted token.
// Same proportions as LogoMark (bar 6.6 × 22, gap 2.1), scaled up.
export function FallenBarsArt({ className = '' }: { className?: string }) {
  const bar = { width: 22, height: 73, rx: 2.3 }
  return (
    <svg viewBox="0 0 240 170" aria-hidden="true" focusable="false" className={className}>
      <ellipse cx="126" cy="152" rx="96" ry="9" className="fill-muted" opacity="0.18" />
      <g fill="currentColor">
        {/* Left and right bars standing, with the middle one's place empty between them. */}
        <rect x="76" y="46" {...bar} />
        <rect x="134" y="46" {...bar} />
        {/* The middle bar, lying on its side on the ground in front of them, a little
            askew. Flat and apart from the others, it can't read as a letter's stroke
            (tilted at 45° between them, the three read as an "N"). */}
        <rect x="106" y="126" width={bar.height} height={bar.width} rx={bar.rx} transform="rotate(3 106 148)" />
      </g>
    </svg>
  )
}
