import { Link } from 'react-router'
import { SearchForm } from '../components/SearchForm'
import { textLink } from '../components/styles'
import { DEPARTMENTS } from '../lib/departments'
import { useDocumentTitle } from '../lib/useDocumentTitle'

// The illustration (the logo's three bars, the middle one tipped over) sits on the
// same light tile as product photos; multiply blends its near-white background in.
export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-sm rounded-xl bg-image-tile p-4">
        <img src="/not-found.webp" alt="" width={800} height={597} className="aspect-[800/597] w-full mix-blend-multiply" />
      </div>
      <h1 className="mt-6 text-center text-2xl font-bold tracking-tight">This page isn’t here</h1>
      <p className="mt-2 text-center text-muted">
        The link may be old, or the address mistyped. Search for what you wanted, or start from a department.
      </p>
      <div className="mx-auto mt-6 max-w-md">
        <SearchForm inputId="not-found-search" landmarkLabel="Search products from this page" visibleLabel />
      </div>
      <nav aria-labelledby="not-found-departments" className="mt-8">
        <h2 id="not-found-departments" className="text-center text-sm font-bold">
          Shop by department
        </h2>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {DEPARTMENTS.map((d) => (
            <li key={d.slug}>
              <Link
                to={`/search?department=${d.slug}`}
                className="inline-flex h-10 items-center rounded-full border border-border-strong bg-surface px-4 text-sm font-medium text-text hover:border-action hover:text-action"
              >
                {d.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-8 text-center">
        <Link to="/" className={textLink}>
          Back to home
        </Link>
      </p>
    </div>
  )
}
