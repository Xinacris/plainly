// The 404 illustration: the logo mark itself, at its proportions and corner radius,
// with the middle bar replaced by a dashed outline of where it should be. Something
// is missing from its place, matching "This page isn't here", without reading as a
// letter or a face. The bars are currentColor (the action green, mint in dark mode);
// the outline is the muted token. Geometry as LogoMark (src/components/Logo.tsx).
// Source concept: design/gemini-404-concept.jpeg.
export function MissingBarArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="-1 -1 26 24" aria-hidden="true" focusable="false" className={className}>
      <rect x="0" width="6.6" height="22" rx="0.7" fill="currentColor" />
      {/* Inset by half the stroke, so the outline's outer edge is the missing bar's. */}
      <rect x="9" y="0.3" width="6" height="21.4" rx="0.4" fill="none" strokeWidth="0.6" strokeDasharray="1.4 1" className="stroke-muted" />
      <rect x="17.4" width="6.6" height="22" rx="0.7" fill="currentColor" />
    </svg>
  )
}
