import { useEffect, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { DEPARTMENTS } from '../lib/departments'
import { SALE_LABEL, SALE_URL } from '../lib/pricing'

const linkBase = 'block rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap underline-offset-4'
// The current link is underlined as well as colored, so it isn't marked by color alone.
const linkClass = (active: boolean) => `${linkBase} hover:text-action ${active ? 'text-action underline decoration-2' : 'text-text'}`

// The department bar under the header. Scrolls sideways on narrow screens.
export function DepartmentNav() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const onSearch = pathname === '/search'
  const saleView = onSearch && params.get('view') === 'sale'
  const current = onSearch && !saleView ? params.get('department') : null
  // The bar marks the current context: a department, the sale view, or all products.
  const saleActive = saleView
  const allActive = onSearch && !current && !saleActive
  const list = useRef<HTMLUListElement>(null)

  // On narrow screens, bring the current department into view within the bar
  // (scrollLeft only, so the page itself never jumps).
  useEffect(() => {
    const ul = list.current
    const active = ul?.querySelector<HTMLElement>('[aria-current="page"]')
    if (ul && active) ul.scrollLeft = active.offsetLeft - (ul.clientWidth - active.offsetWidth) / 2
  }, [current, allActive, saleActive])

  return (
    <nav aria-label="Departments" className="border-t border-border">
      <ul ref={list} className="relative mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-3">
        <li>
          <Link to="/search" aria-current={allActive ? 'page' : undefined} className={linkClass(allActive)}>
            All products
          </Link>
        </li>
        {/* A filter, not a department: it opens the sale view with its removable chip. */}
        <li>
          <Link
            to={SALE_URL}
            aria-current={saleActive ? 'page' : undefined}
            className={`${linkBase} text-sale hover:underline ${saleActive ? 'underline decoration-2' : ''}`}
          >
            {SALE_LABEL}
          </Link>
        </li>
        {DEPARTMENTS.map((d) => {
          const active = current === d.slug
          return (
            <li key={d.slug}>
              <Link
                to={`/search?department=${d.slug}`}
                aria-current={active ? 'page' : undefined}
                className={linkClass(active)}
              >
                {d.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
