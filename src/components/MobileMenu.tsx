import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useAccountData } from '../account/data'
import { signOut, useAuth } from '../auth/auth'
import { t } from '../i18n'
import { useAccountLinks } from '../lib/accountLinks'
import { ACCOUNTS_ENABLED } from '../lib/accounts'
import { SignedInEmail } from './AccountStatus'
import { Drawer } from './Drawer'
import { takeReopenMenu } from '../i18n/switching'
import { LanguagePicker } from './LanguagePicker'
import { primaryButton } from './styles'
import { ThemeToggle } from './ThemeToggle'

function Icon({ children, className = 'size-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

const ICONS: Record<string, ReactNode> = {
  // A parcel.
  '/orders': <Icon><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></Icon>,
  // A map pin.
  '/addresses': <Icon><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" /><circle cx="12" cy="9" r="2.5" /></Icon>,
  // A person.
  '/profile': <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>,
}

// Who's signed in (an initial, the name, the email below), or a clear Sign in button.
// Name and email each stay on one line and get an ellipsis only when they don't fit.
function AccountArea({ onDone }: { onDone: () => void }) {
  const { pathname, search } = useLocation()
  const status = useAuth((s) => s.status)
  const email = useAuth((s) => s.user?.email ?? '')
  const name = useAccountData((s) => s.fullName)
  if (!ACCOUNTS_ENABLED || status === 'loading') return null
  if (status === 'signed-out') {
    return (
      <div className="rounded-xl bg-bg p-4">
        <p className="text-sm text-muted">{t.menu.signInPitch}</p>
        <Link to={`/signin?next=${encodeURIComponent(pathname + search)}`} onClick={onDone} className={`${primaryButton} mt-3 w-full`}>
          {t.menu.signIn}
        </Link>
      </div>
    )
  }
  const initial = (name || email).trim().charAt(0).toUpperCase()
  return (
    <div className="flex items-center gap-3 rounded-xl bg-bg p-3">
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-action text-lg font-bold text-on-action">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{t.menu.signedInAs}</p>
        {name ? (
          <>
            <p title={name} className="truncate font-semibold text-text">
              {name}
            </p>
            <SignedInEmail email={email} className="text-sm font-normal text-muted" />
          </>
        ) : (
          <SignedInEmail email={email} className="font-semibold" />
        )}
      </div>
    </div>
  )
}

// Phones only: a drawer from the right with the account, Orders, Addresses, Profile,
// the language and theme, and Sign out at the bottom.
export function MobileMenu() {
  const links = useAccountLinks()
  const signedIn = useAuth((s) => s.status === 'signed-in')
  // A language switch remounts the app; the menu it was made in opens again.
  const [open, setOpen] = useState(takeReopenMenu)
  const button = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)

  // The menu lives in a phones-only part of the header. If the screen grows past
  // sm while it's open (a phone turned sideways), close it; otherwise the page would
  // stay inert behind a modal that's no longer shown.
  useEffect(() => {
    const wide = window.matchMedia('(width >= 40rem)')
    const onChange = () => wide.matches && setOpen(false)
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [])

  const signOutRow = (
    <button
      type="button"
      onClick={async () => {
        close()
        await signOut()
      }}
      className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-left font-medium text-text hover:bg-bg hover:text-action"
    >
      <Icon><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></Icon>
      {t.menu.signOut}
    </button>
  )

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t.menu.title}
        className="grid size-10 place-items-center rounded-lg text-text hover:bg-bg hover:text-action"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <Drawer
        open={open}
        onClose={() => {
          close()
          // Reopened after a language switch, it has no opener to return to; the menu button is it.
          button.current?.focus()
        }}
        title={t.menu.title}
        footer={ACCOUNTS_ENABLED && signedIn ? signOutRow : undefined}
      >
        <AccountArea onDone={close} />
        <nav aria-label={t.menu.account} className="mt-3">
          <ul>
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end
                  onClick={close}
                  className={({ isActive }) =>
                    `flex h-12 items-center gap-3 rounded-lg px-3 font-medium hover:bg-bg ${isActive ? 'text-action' : 'text-text'}`
                  }
                >
                  {ICONS[l.to]}
                  <span className="flex-1">{l.label}</span>
                  <Icon className="size-4 text-muted"><path d="m9 6 6 6-6 6" /></Icon>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <h3 className="mt-6 mb-2 px-1 text-sm font-bold">{t.language.label}</h3>
        <LanguagePicker labelled />
        <h3 className="mt-6 mb-2 px-1 text-sm font-bold">{t.theme.label}</h3>
        <ThemeToggle labelled />
      </Drawer>
    </>
  )
}
