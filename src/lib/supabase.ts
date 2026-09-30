import type { SupabaseClient } from '@supabase/supabase-js'

// Only the project URL and the publishable key reach the browser. Everything a
// signed-in user can read or write is limited by row-level security in the
// database (see supabase/migrations/).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** False when the build has no Supabase settings: guest mode only, and account pages say so. */
export const SUPABASE_CONFIGURED = Boolean(url && key)
export const SUPABASE_URL = url ?? ''
export const SUPABASE_PUBLISHABLE_KEY = key ?? ''

// supabase-js is loaded on demand, in its own chunk, so guests never download it
// up front: browsing, the cart and guest checkout don't wait for it.
let client: Promise<SupabaseClient | null> | undefined
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!SUPABASE_CONFIGURED) return Promise.resolve(null)
  client ??= import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(url!, key!, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }),
    )
    .catch(() => null)
  return client
}

/** The words shown when the account service can't be reached; guest shopping keeps working. */
export const UNREACHABLE =
  'We couldn’t reach the account service. Browsing, your cart and guest checkout still work; try signing in again in a moment.'
