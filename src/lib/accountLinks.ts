import { useAuth } from '../auth/auth'
import { t } from '../i18n'

// The Account entry's links, shared by the desktop menu and the phone menu.
// Orders and Addresses work signed in or not; Profile needs an account.
export function useAccountLinks(): { to: string; label: string }[] {
  const signedIn = useAuth((s) => s.status === 'signed-in')
  const base = [
    { to: '/orders', label: t.menu.orders },
    { to: '/addresses', label: t.menu.addresses },
  ]
  return signedIn ? [...base, { to: '/profile', label: t.menu.profile }] : base
}
