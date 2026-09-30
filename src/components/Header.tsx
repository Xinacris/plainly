import { Link, NavLink } from 'react-router'
import { useCartCount } from '../cart/cart'
import { pluralize } from '../lib/format'
import { DepartmentNav } from './DepartmentNav'
import { LogoMark } from './Logo'
import { SearchForm } from './SearchForm'
import { ThemeToggle } from './ThemeToggle'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2 py-1.5 text-sm font-medium hover:text-action ${isActive ? 'text-action' : 'text-text'}`

function CartLink() {
  const count = useCartCount()
  return (
    <NavLink to="/cart" className={navClass} aria-label={`Cart, ${pluralize(count, 'item')}`}>
      <span className="flex items-center gap-1.5">
        Cart
        {count > 0 && (
          <span aria-hidden="true" className="min-w-5 rounded-full bg-action px-1.5 text-center text-xs leading-5 font-bold text-on-action tabular-nums">
            {count}
          </span>
        )}
      </span>
    </NavLink>
  )
}

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <Link to="/" aria-label="Plainly, home" className="flex items-center gap-2 rounded-md text-action hover:text-action-hover">
          <LogoMark className="h-6 w-auto" />
          <span className="text-xl leading-none font-semibold">Plainly</span>
        </Link>

        {/* On phones, search and the theme toggle share a second row, so the first
            row fits logo, Orders and Cart down to 320 px. Inline from sm up. */}
        <div className="order-last min-w-0 flex-1 basis-40 sm:order-none sm:basis-0">
          <SearchForm />
        </div>

        <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:ml-0">
          <NavLink to="/orders" className={navClass}>
            Orders
          </NavLink>
          <CartLink />
        </nav>

        <div className="order-last sm:order-none">
          <ThemeToggle />
        </div>
      </div>
      <DepartmentNav />
    </header>
  )
}
