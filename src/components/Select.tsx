import type { SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Classes for the wrapper, e.g. its width. */
  wrapperClassName?: string
  /** 40px tall instead of 44px, for toolbars. */
  compact?: boolean
}

// A native <select> (keyboard, screen readers and phone pickers all work as usual)
// with only the closed control restyled: the browser's arrow is replaced by one
// chevron, inset from the edge and drawn in the theme's color (currentColor, so it
// also shows in forced-colors / high-contrast mode).
export function Select({ wrapperClassName = '', compact = false, className = '', children, ...props }: Props) {
  return (
    <span className={`relative inline-flex ${wrapperClassName}`}>
      <select
        {...props}
        className={`${compact ? 'h-10' : 'h-11'} w-full appearance-none rounded-lg border border-border-strong bg-surface pr-10 pl-3 text-text ${className}`}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 8 5 5 5-5" />
      </svg>
    </span>
  )
}
