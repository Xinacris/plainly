import { Suspense } from 'react'
import { Link } from 'react-router'
import { primaryButton } from '../components/styles'
import { useCatalog } from '../lib/catalog'

function BrowseAllLink() {
  const count = useCatalog().length
  return (
    <Link to="/search" className={primaryButton}>
      Browse all {count} products
    </Link>
  )
}

export function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">Shop without the noise</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Decide with facts, not noise. No sponsored results and no badges. Just the product, its price and what other
        buyers said.
      </p>
      <div className="mt-8">
        <Suspense
          fallback={
            <Link to="/search" className={primaryButton}>
              Browse all products
            </Link>
          }
        >
          <BrowseAllLink />
        </Suspense>
      </div>
    </section>
  )
}
