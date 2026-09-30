import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAccountLinks } from '../lib/accountLinks'
import { AccountStatus } from './AccountStatus'

// Desktop header: a small disclosure menu. Opens on click or Enter/Space, closes on
// Escape (focus back to the button), on a click outside, when focus leaves it, or
// when you follow a link. With accounts on, it also shows who's signed in, with
// Sign in / Sign out.
export function AccountMenu() {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const { pathname } = useLocation()
  const links = useAccountLinks()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => !wrapper.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div
      ref={wrapper}
      className="relative"
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return
        setOpen(false)
        button.current?.focus()
      }}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium hover:text-action ${open ? 'text-action' : 'text-text'}`}
      >
        Account
        <svg viewBox="0 0 24 24" className={`size-4 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id={listId} className="absolute top-full right-0 z-40 mt-2 w-max max-w-96 min-w-56 rounded-xl border border-border bg-surface p-1 shadow-lg">
          <AccountStatus onDone={() => setOpen(false)} />
          <ul>
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                onClick={() => setOpen(false)}
                aria-current={pathname === l.to ? 'page' : undefined}
                className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-bg hover:text-action aria-[current=page]:text-action"
              >
                {l.label}
              </Link>
            </li>
          ))}
          </ul>
        </div>
      )}
    </div>
  )
}
