import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import { BottomSheet } from './BottomSheet'
import { ThemeToggle } from './ThemeToggle'

// Phones only: Orders and the theme choice, in the same sheet as the filters
// (focus trapped, Escape closes, focus returns to the menu button).
export function MobileMenu() {
  const [open, setOpen] = useState(false)

  // The menu lives in a phones-only part of the header. If the screen grows past
  // sm while it's open (a phone turned sideways), close it; otherwise the page would
  // stay inert behind a modal that's no longer shown.
  useEffect(() => {
    const wide = window.matchMedia('(width >= 40rem)')
    const onChange = () => wide.matches && setOpen(false)
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [])
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Menu"
        className="grid size-10 place-items-center rounded-lg text-text hover:bg-bg hover:text-action"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Menu">
        <nav aria-label="Menu">
          <NavLink
            to="/orders"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex h-12 items-center rounded-lg px-3 text-lg font-semibold hover:bg-bg ${isActive ? 'text-action' : 'text-text'}`
            }
          >
            Orders
          </NavLink>
        </nav>
        <h3 className="mt-6 mb-2 px-1 text-sm font-bold">Theme</h3>
        <ThemeToggle labelled />
      </BottomSheet>
    </>
  )
}
