import { useEffect, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { DEPARTMENTS } from '../lib/departments'

const linkClass = 'block rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap hover:text-action'

// The department bar under the header. Scrolls sideways on narrow screens.
export function DepartmentNav() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const onSearch = pathname === '/search'
  const current = onSearch ? params.get('department') : null
  const allActive = onSearch && !current && [...params.keys()].length === 0
  const list = useRef<HTMLUListElement>(null)

  // On narrow screens, bring the current department into view within the bar
  // (scrollLeft only, so the page itself never jumps).
  useEffect(() => {
    const ul = list.current
    const active = ul?.querySelector<HTMLElement>('[aria-current="page"]')
    if (ul && active) ul.scrollLeft = active.offsetLeft - (ul.clientWidth - active.offsetWidth) / 2
  }, [current, allActive])

  return (
    <nav aria-label="Departments" className="border-t border-border">
      <ul ref={list} className="relative mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-3">
        <li>
          <Link to="/search" aria-current={allActive ? 'page' : undefined} className={`${linkClass} ${allActive ? 'text-action' : 'text-text'}`}>
            All products
          </Link>
        </li>
        {DEPARTMENTS.map((d) => {
          const active = current === d.slug
          return (
            <li key={d.slug}>
              <Link
                to={`/search?department=${d.slug}`}
                aria-current={active ? 'page' : undefined}
                className={`${linkClass} ${active ? 'text-action' : 'text-text'}`}
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
