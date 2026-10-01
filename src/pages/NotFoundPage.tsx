import { Link } from 'react-router'
import { FallenBarsArt } from '../components/FallenBarsArt'
import { SearchForm } from '../components/SearchForm'
import { textLink } from '../components/styles'
import { t } from '../i18n'
import { DEPARTMENTS, departmentName } from '../lib/departments'
import { useDocumentTitle } from '../lib/useDocumentTitle'

// The illustration (the logo's three bars, the middle one fallen over) is inline SVG,
// so it follows the theme; see FallenBarsArt.
export function NotFoundPage() {
  useDocumentTitle(t.notFound.docTitle)
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <FallenBarsArt className="mx-auto w-full max-w-xs text-action" />
      <h1 className="mt-6 text-center text-2xl font-bold tracking-tight">{t.notFound.heading}</h1>
      <p className="mt-2 text-center text-muted">{t.notFound.body}</p>
      <div className="mx-auto mt-6 max-w-md">
        <SearchForm inputId="not-found-search" landmarkLabel={t.notFound.searchLandmark} visibleLabel />
      </div>
      <nav aria-labelledby="not-found-departments" className="mt-8">
        <h2 id="not-found-departments" className="text-center text-sm font-bold">
          {t.notFound.departments}
        </h2>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {DEPARTMENTS.map((d) => (
            <li key={d.slug}>
              <Link
                to={`/search?department=${d.slug}`}
                className="inline-flex h-10 items-center rounded-full border border-border-strong bg-surface px-4 text-sm font-medium text-text hover:border-action hover:text-action"
              >
                {departmentName(d)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-8 text-center">
        <Link to="/" className={textLink}>
          {t.common.backToHome}
        </Link>
      </p>
    </div>
  )
}
