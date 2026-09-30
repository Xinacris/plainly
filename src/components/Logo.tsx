// The Plainly mark: three rounded columns, i.e. facts laid out side by side.
// Rebuilt from design/gemini-logo-concept.jpeg (bars ~0.27 of the width each,
// gaps ~0.1, a touch wider than tall, small corner radius). Uses currentColor,
// so it follows the theme's action color. public/favicon.svg uses the same geometry.
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <rect x="0" width="6.6" height="22" rx="0.7" />
      <rect x="8.7" width="6.6" height="22" rx="0.7" />
      <rect x="17.4" width="6.6" height="22" rx="0.7" />
    </svg>
  )
}
