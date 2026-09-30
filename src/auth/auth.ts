import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { DEMO_EMAIL } from '../lib/demo.js'
import { t } from '../i18n'
import { isOffline, offlineMessage } from '../lib/network'
import { getSupabase, SUPABASE_CONFIGURED, unreachable } from '../lib/supabase'

// The session lives in this browser (Supabase keeps it in localStorage) and is
// read without a network call, so a slow or unreachable account service never
// holds up browsing, the cart or guest checkout.
type Status = 'loading' | 'signed-out' | 'signed-in'

interface AuthState {
  status: Status
  user: User | null
  session: Session | null
}

export const useAuth = create<AuthState>()(() => ({
  status: SUPABASE_CONFIGURED ? 'loading' : 'signed-out',
  user: null,
  session: null,
}))

function apply(session: Session | null) {
  useAuth.setState({ status: session ? 'signed-in' : 'signed-out', user: session?.user ?? null, session })
}

// Starts once the app has loaded; until then the header shows neither Sign in nor Sign out.
void getSupabase().then((supabase) => {
  if (!supabase) return apply(null)
  supabase.auth
    .getSession()
    .then(({ data }) => apply(data.session))
    .catch(() => apply(null))
  supabase.auth.onAuthStateChange((_event, session) => apply(session))
})

export function isDemo(user: User | null | undefined): boolean {
  return user?.email === DEMO_EMAIL
}

export function useUser(): User | null {
  return useAuth((s) => s.user)
}

/** A plain-language message for an auth error, never a raw code. */
export function authMessage(error: unknown): string {
  if (isOffline()) return offlineMessage()
  const e = error as { message?: string; status?: number; name?: string; code?: string } | null
  const message = e?.message ?? ''
  if (!e || e.name === 'AuthRetryableFetchError' || /fetch|network|Failed to/i.test(message) || e.status === 0) return unreachable()
  if (e.code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return t.auth.errors.invalid
  if (e.code === 'user_already_exists' || /already registered/i.test(message)) return t.auth.errors.exists
  if (e.code === 'weak_password' || /password should be/i.test(message)) return t.auth.errors.weak
  if (e.code === 'over_request_rate_limit' || e.status === 429) return t.auth.errors.rateLimit
  if (e.code === 'same_password') return t.auth.errors.samePassword
  return message || t.auth.errors.generic
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (isOffline()) return offlineMessage()
  const supabase = await getSupabase()
  if (!supabase) return unreachable()
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? authMessage(error) : null
  } catch (error) {
    return authMessage(error)
  }
}

export async function signUp(fullName: string, email: string, password: string): Promise<string | null> {
  if (isOffline()) return offlineMessage()
  const supabase = await getSupabase()
  if (!supabase) return unreachable()
  try {
    // Email confirmation is off in this demo (it can't send email), so this signs you in.
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } })
    if (error) return authMessage(error)
    if (!data.session) return t.auth.errors.needsConfirmation
    return null
  } catch (error) {
    return authMessage(error)
  }
}

export async function signInWithGoogle(next: string): Promise<string | null> {
  if (isOffline()) return offlineMessage()
  const supabase = await getSupabase()
  if (!supabase) return unreachable()
  try {
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    return error ? authMessage(error) : null
  } catch (error) {
    return authMessage(error)
  }
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase()
  if (!supabase) return
  // Local sign-out clears this browser's session even if the service is unreachable.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => apply(null))
}

/** Which sign-in methods the project has switched on, read from the public auth settings. */
export async function providerSettings(url: string, key: string): Promise<{ google: boolean } | null> {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    if (!res.ok) return null
    const settings = (await res.json()) as { external?: { google?: boolean } }
    return { google: Boolean(settings.external?.google) }
  } catch {
    return null
  }
}
