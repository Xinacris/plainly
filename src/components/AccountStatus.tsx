import { Link, useLocation } from 'react-router'
import { signOut, useAuth } from '../auth/auth'
import { ACCOUNTS_ENABLED } from '../lib/accounts'

// Who's signed in, with Sign in / Sign out: the same block in the desktop Account
// menu and the phone menu. Hidden while accounts are switched off.
export function AccountStatus({ onDone, large = false }: { onDone: () => void; large?: boolean }) {
  const { pathname, search } = useLocation()
  const status = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  if (!ACCOUNTS_ENABLED || status === 'loading') return null
  const item = large ? 'flex h-12 items-center rounded-lg px-3 text-lg font-semibold' : 'block rounded-lg px-3 py-2 text-sm font-medium'
  if (status === 'signed-out') {
    const next = encodeURIComponent(pathname + search)
    return (
      <Link to={`/signin?next=${next}`} onClick={onDone} className={`${item} text-action hover:bg-bg`}>
        Sign in
      </Link>
    )
  }
  return (
    <div className="border-b border-border pb-1 mb-1">
      <p className="px-3 pt-2 text-xs text-muted">Signed in as</p>
      <SignedInEmail email={user?.email ?? ''} className={`px-3 pb-2 ${large ? 'text-base' : 'text-sm'}`} />
      <button
        type="button"
        onClick={async () => {
          onDone()
          await signOut()
        }}
        className={`${item} w-full text-left text-text hover:bg-bg hover:text-action`}
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
