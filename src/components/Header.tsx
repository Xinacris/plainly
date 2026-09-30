import { Link, NavLink } from 'react-router'
import { useCartCount } from '../cart/cart'
import { t } from '../i18n'
import { AccountMenu } from './AccountMenu'
import { DepartmentNav } from './DepartmentNav'
import { LogoMark } from './Logo'
import { MiniCart } from './MiniCart'
import { MobileMenu } from './MobileMenu'
import { LanguagePicker } from './LanguagePicker'
import { SearchForm } from './SearchForm'
import { ThemeToggle } from './ThemeToggle'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2 py-1.5 text-sm font-medium hover:text-action ${isActive ? 'text-action' : 'text-text'}`

// Phones: a cart icon with the count, so the cart stays one tap away.
function CartIconLink() {
  const count = useCartCount()
  return (
    <NavLink
      to="/cart"
      aria-label={t.header.cartLabel(count)}
      className={({ isActive }) => `relative grid size-10 place-items-center rounded-lg hover:bg-bg hover:text-action ${isActive ? 'text-action' : 'text-text'}`}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
        <circle cx="10" cy="20.5" r="1" />
        <circle cx="17" cy="20.5" r="1" />
      </svg>
      {count > 0 && (
        <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-action px-1 text-center text-xs leading-5 font-bold text-on-action tabular-nums">
          {count}
        </span>
      )}
    </NavLink>
  )
}

// Desktop: the cart link, with a preview of the cart on hover or keyboard focus.
function CartLink() {
  const count = useCartCount()
  return (
    <MiniCart>
      {({ expanded, controls }) => (
        <NavLink
          to="/cart"
          className={navClass}
          aria-label={t.header.cartLabel(count)}
          aria-expanded={expanded}
          aria-controls={expanded ? controls : undefined}
        >
          <span className="flex items-center gap-1.5">
            {t.header.cart}
            {count > 0 && (
              <span aria-hidden="true" className="min-w-5 rounded-full bg-action px-1.5 text-center text-xs leading-5 font-bold text-on-action tabular-nums">
                {count}
              </span>
            )}
          </span>
        </NavLink>
      )}
    </MiniCart>
  )
}

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <Link to="/" aria-label={t.header.home} className="flex items-center gap-2 rounded-md text-action hover:text-action-hover">
          <LogoMark className="h-6 w-auto" />
          <span className="text-xl leading-none font-semibold">Plainly</span>
        </Link>

        {/* Phones: logo with cart and menu on row 1, full-width search on row 2.
            From sm, the desktop links and the language and theme pickers, still with
            search on its own row (at 640px it would be squeezed to a sliver).
            From md up, one row: logo, search, Orders, Account, Cart, language, theme. */}
        <div className="order-last w-full min-w-0 md:order-none md:w-auto md:flex-1 md:basis-0">
          <SearchForm />
        </div>

        <nav aria-label={t.header.main} className="hidden items-center gap-1 sm:ml-auto sm:flex md:ml-0">
          <NavLink to="/orders" className={navClass}>
            {t.header.orders}
          </NavLink>
          <AccountMenu />
          <CartLink />
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <LanguagePicker />
          <ThemeToggle />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:hidden">
          <CartIconLink />
          <MobileMenu />
        </div>
      </div>
      <DepartmentNav />
    </header>
  )
}
