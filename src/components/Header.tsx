import { Link, NavLink } from 'react-router'
import { SearchForm } from './SearchForm'
import { ThemeToggle } from './ThemeToggle'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2 py-1.5 text-sm font-medium hover:text-action ${isActive ? 'text-action' : 'text-text'}`

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <img src="/favicon.svg" alt="" className="size-7" />
          Plainly
        </Link>

        {/* Full-width second row on small screens, inline on larger ones. */}
        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
          <SearchForm />
        </div>

        <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:ml-0">
          <NavLink to="/orders" className={navClass}>
            Orders
          </NavLink>
          <NavLink to="/cart" className={navClass}>
            Cart
          </NavLink>
        </nav>

        <ThemeToggle />
      </div>
    </header>
  )
}
