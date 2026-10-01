import { Suspense, useId } from 'react'
import { Link } from 'react-router'
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard'
import { ProductImage } from '../components/ProductImage'
import { textLink } from '../components/styles'
import { useCatalog, type Product } from '../lib/catalog'
import { t } from '../i18n'
import { DEPARTMENTS, departmentName, type Department } from '../lib/departments'
import { formatCategory, formatPrice } from '../lib/format'
import { biggestDiscounts, departmentTiles, highestRated, type Tile } from '../lib/home'
import { SALE_URL, salePrice } from '../lib/pricing'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function TileLink({ tile, department, eager }: { tile: Tile; department: Department; eager: boolean }) {
  if (tile.kind === 'category') {
    // The card is the department, so its tiles open it as context with the category filtered.
    return (
      <Link to={`/search?department=${department.slug}&category=${tile.slug}`} className="group block">
        <ProductImage src={tile.image} alt="" eager={eager} className="p-2" />
        <span className="mt-1 block text-sm font-medium group-hover:text-action">{formatCategory(tile.slug)}</span>
      </Link>
    )
  }
  const { product } = tile
  return (
    <Link to={`/product/${product.id}`} className="group block">
      <ProductImage src={product.thumbnail} alt="" eager={eager} className="p-2" />
      <span className="mt-1 block text-sm font-medium group-hover:text-action">{product.title}</span>
      <span className="block text-sm text-muted tabular-nums">{formatPrice(salePrice(product))}</span>
    </Link>
  )
}

// The first card is in the first screen at every width, so its photos load right away.
function DepartmentCard({ department, catalog, first }: { department: Department; catalog: Product[]; first: boolean }) {
  const { count, tiles } = departmentTiles(department, catalog)
  const headingId = useId()
  return (
    <li className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <h2 id={headingId} className="flex flex-wrap items-baseline gap-x-2 text-lg font-bold tracking-tight">
        {departmentName(department)}
        <span className="text-sm font-normal text-muted">{t.common.products(count)}</span>
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <li key={tile.kind === 'category' ? tile.slug : tile.product.id}>
            <TileLink tile={tile} department={department} eager={first} />
          </li>
        ))}
      </ul>
      <Link to={`/search?department=${department.slug}`} className={`${textLink} mt-auto self-start pt-4 text-sm`}>
        {t.common.seeAll}<span className="sr-only">{t.home.seeAllIn(departmentName(department))}</span>
      </Link>
    </li>
  )
}

function ProductRow({ title, note, seeAll, products }: { title: string; note: string; seeAll: string; products: Product[] }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id={headingId} className="text-xl font-bold tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-muted">{note}</p>
        </div>
        <Link to={seeAll} className={`${textLink} text-sm`}>
          {t.common.seeAll}<span className="sr-only">{t.home.seeAllRow(title)}</span>
        </Link>
      </div>
      {/* Scrolls sideways; tabbing through the cards scrolls it too. The row runs to
          the screen's edges, but its padding puts the first card on the same left line
          as the heading, and scroll-padding makes every snap land on that line too. */}
      <ul className=" mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto pb-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} className="w-44 shrink-0 snap-start sm:w-52" />
        ))}
      </ul>
    </section>
  )
}

// The note is computed, so it stays true if the data ever has more reviews.
function reviewNote(products: Product[]): string {
  const counts = new Set(products.map((p) => p.reviews.length))
  const [only] = counts
  if (counts.size === 1) return t.home.ratedNoteSame(only)
  return t.home.ratedNoteMixed
}

function HomeContents() {
  const catalog = useCatalog()
  const rated = highestRated(catalog)
  return (
    <>
      <section aria-label={t.home.departments}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEPARTMENTS.map((d, i) => (
            <DepartmentCard key={d.slug} department={d} catalog={catalog} first={i === 0} />
          ))}
        </ul>
      </section>
      <ProductRow
        title={t.home.discountsTitle}
        note={t.home.discountsNote}
        seeAll={SALE_URL}
        products={biggestDiscounts(catalog)}
      />
      <ProductRow title={t.home.ratedTitle} note={reviewNote(rated)} seeAll="/search?sort=rating" products={rated} />
    </>
  )
}

function HomeSkeleton() {
  return (
    <ul aria-label={t.home.loadingDepartments} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </ul>
  )
}

export function HomePage() {
  useDocumentTitle()
  return (
    <>
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-2 text-sm">
          {/* One line at every width: phones get the heading alone. */}
          <h1 className="inline font-semibold">{t.home.heading}</h1>{' '}
          <span className="hidden text-muted sm:inline">{t.home.tagline}</span>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Suspense fallback={<HomeSkeleton />}>
          <HomeContents />
        </Suspense>
      </div>
    </>
  )
}
