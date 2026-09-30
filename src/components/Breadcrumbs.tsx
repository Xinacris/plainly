import { Fragment } from 'react'
import { Link } from 'react-router'

export interface Crumb {
  label: string
  /** Omitted on the last step, which is the current page. */
  to?: string
}

// One line at every width. When space runs out, the current page (which the h1
// right below repeats) shortens first, down to a few characters; only then do the
// other steps shorten. Truncation is visual only: the full text stays in the DOM
// (and a tooltip), so screen readers read it whole.
export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm whitespace-nowrap text-muted">
        {items.map((item, i) => (
          <Fragment key={`${i}-${item.label}`}>
            {i > 0 && (
              <li aria-hidden="true" className="shrink-0">
                ›
              </li>
            )}
            {/* The current step starts at zero width and takes the leftover space (at least
                3rem); the others keep their full width and only shrink if they alone overflow. */}
            <li className={item.to ? 'min-w-0 shrink' : 'min-w-12 flex-1 basis-0'}>
              {item.to && (
                <Link to={item.to} title={item.label} className="block truncate underline-offset-2 hover:text-action hover:underline">
                  {item.label}
                </Link>
              )}
              {!item.to && (
                <span aria-current="page" title={item.label} className="block truncate font-medium text-text">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
