import { authMessage } from '../auth/auth'
import { t } from '../i18n'
import { isOffline, offlineMessage } from '../lib/network'
import { getSupabase, unreachable } from '../lib/supabase'
import { useAccountData } from './data'

export interface Profile {
  fullName: string
  phone: string
  defaultAddressId: string | null
}

type Result<T> = { ok: true; value: T } | { ok: false; message: string }

const failed = (error: unknown): { ok: false; message: string } => ({ ok: false, message: authMessage(error) })

// Loads the signed-in user's profile, creating it on first use (no database
// trigger: the row is made by the user themselves, under RLS).
export async function loadProfile(userId: string, fallbackName: string): Promise<Result<Profile>> {
  if (isOffline()) return { ok: false, message: offlineMessage() }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, message: unreachable() }
  try {
    const { data, error } = await supabase.from('profiles').select('full_name, phone, default_address_id').eq('id', userId).maybeSingle()
    if (error) return failed(error)
    if (data) return { ok: true, value: { fullName: data.full_name, phone: data.phone, defaultAddressId: data.default_address_id } }
    const { error: insertError } = await supabase.from('profiles').insert({ id: userId, full_name: fallbackName })
    if (insertError && insertError.code !== '23505') return failed(insertError) // 23505: created meanwhile in another tab
    return { ok: true, value: { fullName: fallbackName, phone: '', defaultAddressId: null } }
  } catch (error) {
    return failed(error)
  }
}

export async function saveProfile(userId: string, fullName: string, phone: string): Promise<string | null> {
  if (isOffline()) return offlineMessage()
  const supabase = await getSupabase()
  if (!supabase) return unreachable()
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: fullName.trim(), phone: phone.trim(), updated_at: new Date().toISOString() })
    if (error) return authMessage(error)
    useAccountData.setState({ fullName: fullName.trim() }) // the phone menu shows it
    return null
  } catch (error) {
    return authMessage(error)
  }
}

export async function changePassword(password: string): Promise<string | null> {
  if (isOffline()) return offlineMessage()
  const supabase = await getSupabase()
  if (!supabase) return unreachable()
  try {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? authMessage(error) : null
  } catch (error) {
    return authMessage(error)
  }
}

/** Phone numbers: digits with the usual separators, up to 40 characters. */
export function phoneError(phone: string): string | null {
  const value = phone.trim()
  if (!value) return null
  if (value.length > 40 || !/^\+?[0-9 ()./-]{4,}$/.test(value)) return t.profile.phoneInvalid
  return null
}
