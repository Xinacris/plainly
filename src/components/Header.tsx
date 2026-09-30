import { Link, NavLink } from 'react-router'
import { useCartCount } from '../cart/cart'
import { pluralize } from '../lib/format'
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
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <img src="/favicon.svg" alt="" className="size-7" />
          Plainly
        </Link>

        {/* Full-width second row on small screens, inline on larger ones. */}
        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
          <SearchForm />
        </div>

        <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:ml-0">
          {/* Orders is added when checkout ships: no links to pages that don't exist yet. */}
          <CartLink />
        </nav>

        <ThemeToggle />
      </div>
    </header>
  )
}
