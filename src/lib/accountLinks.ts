import { useAuth } from '../auth/auth'

// The Account entry's links, shared by the desktop menu and the phone menu.
// Orders and Addresses work signed in or not; Profile needs an account.
const BASE = [
  { to: '/orders', label: 'Orders' },
  { to: '/addresses', label: 'Addresses' },
]

export const ACCOUNT_LINKS = BASE

export function useAccountLinks(): { to: string; label: string }[] {
  const signedIn = useAuth((s) => s.status === 'signed-in')
  return signedIn && PROFILE_READY ? [...BASE, { to: '/profile', label: 'Profile' }] : BASE
}

// The profile page arrives in the next checkpoint; until then it isn't linked.
const PROFILE_READY = false
