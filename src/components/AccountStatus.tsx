import { Link, useLocation } from 'react-router'
import { signOut, useAuth } from '../auth/auth'
import { ACCOUNTS_ENABLED } from '../lib/accounts'

// The top of the desktop Account menu and the phone menu: who's signed in, or a
// "Sign in" link. Hidden while accounts are switched off.
export function AccountHeader({ onDone, large = false }: { onDone: () => void; large?: boolean }) {
  const { pathname, search } = useLocation()
  const status = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  if (!ACCOUNTS_ENABLED || status === 'loading') return null
  if (status === 'signed-out') {
    const next = encodeURIComponent(pathname + search)
    const item = large ? 'flex h-12 items-center rounded-lg px-3 text-lg font-semibold' : 'block rounded-lg px-3 py-2 text-sm font-medium'
    return (
      <Link to={`/signin?next=${next}`} onClick={onDone} className={`${item} text-action hover:bg-bg`}>
        Sign in
      </Link>
    )
  }
  return (
    <div className="mb-1 border-b border-border pb-1">
      <p className="px-3 pt-2 text-xs text-muted">Signed in as</p>
      <SignedInEmail email={user?.email ?? ''} className={`px-3 pb-2 ${large ? 'text-base' : 'text-sm'}`} />
    </div>
  )
}

// The bottom of the menus, below a divider, when signed in.
export function SignOutButton({ onDone, className = '' }: { onDone: () => void; className?: string }) {
  const status = useAuth((s) => s.status)
  if (!ACCOUNTS_ENABLED || status !== 'signed-in') return null
  return (
    <div className="mt-1 border-t border-border pt-1">
      <button
        type="button"
        onClick={async () => {
          onDone()
          await signOut()
        }}
        className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-text hover:bg-bg hover:text-action ${className}`}
      >
        Sign out
      </button>
    </div>
  )
}

// The address on one line when it fits; only when it doesn't, an ellipsis. The full
// address stays in the text (screen readers read it whole) and in a tooltip.
export function SignedInEmail({ email, className = '' }: { email: string; className?: string }) {
  return (
    <p title={email} className={`truncate font-medium text-text ${className}`}>
      {email}
    </p>
  )
}
