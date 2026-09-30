// Row-level security and demo-lock test, run against the plainly-test project:
//
//   node scripts/rls-test.mjs
//
// Reads VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and SUPABASE_TEST_SECRET_KEY
// from .env.test.local (gitignored). The secret key is used only here, to create and
// delete throwaway users; it never goes into the app build. No values are printed.
//
// User B tries to read, change, delete and impersonate user A's rows; every attempt
// must fail or see nothing. Anonymous requests must see nothing at all.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../src/lib/demo.js'

const env = Object.fromEntries(
  fs
    .readFileSync('.env.test.local', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.trim().replace(/^"(.*)"$/, '$1')]),
)
const url = env.VITE_SUPABASE_URL
if (!/mukpydnfpifbqhhakdda/.test(url)) throw new Error('rls-test only runs against plainly-test')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, env.SUPABASE_TEST_SECRET_KEY, options)
const client = () => createClient(url, env.VITE_SUPABASE_PUBLISHABLE_KEY, options)

let failures = 0
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`)
  if (!ok) failures++
}

const stamp = Date.now()
const password = `rls-${stamp}-Pw!`
const created = []
async function newUser(tag) {
  const email = `rls-${tag}-${stamp}@example.com`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${tag}: ${error.message}`)
  created.push(data.user.id)
  const c = client()
  const { error: signInError } = await c.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`sign in ${tag}: ${signInError.message}`)
  return { id: data.user.id, c }
}

const orderId = (n) => `PL-RLS${String(stamp).slice(-4)}${n}`.slice(0, 11).padEnd(11, '0')
const addressFields = { full_name: 'Ada Lovelace', line1: '1 Main St', city: 'Springfield', region: 'IL', postal_code: '62701' }
const line = { productId: 3, title: 'Powder Canister', thumbnail: '', price: 13.51, quantity: 1, shippingInformation: '', returnPolicy: '30 days return policy' }

try {
  const a = await newUser('a')
  const b = await newUser('b')

  // A's own data.
  const { data: addr, error: addrErr } = await a.c.from('addresses').insert(addressFields).select().single()
  check(!addrErr && addr.user_id === a.id, 'A adds an address (user_id filled in from the session)')
  const { error: profErr } = await a.c.from('profiles').insert({ id: a.id, full_name: 'A', default_address_id: addr.id })
  check(!profErr, 'A creates a profile with a default address')
  const delivered = { id: orderId(1), placed_at: new Date(Date.now() - 10 * 60_000).toISOString(), address: addressFields, lines: [line], total: 13.51 }
  // Every row sets placed_at: in a multi-row insert supabase-js sends NULL, not the default, for a missing key.
  const fresh = { id: orderId(2), placed_at: new Date().toISOString(), address: addressFields, lines: [line], total: 13.51 }
  const { error: ordErr } = await a.c.from('orders').insert([delivered, fresh])
  check(!ordErr, `A adds two orders${ordErr ? `: ${ordErr.message}` : ''}`)
  const { error: retErr } = await a.c.from('order_returns').insert({ order_id: delivered.id, product_id: 3, reason: 'Arrived damaged' })
  check(!retErr, `A requests a return on a delivered order${retErr ? `: ${retErr.message}` : ''}`)
  const { error: earlyRet } = await a.c.from('order_returns').insert({ order_id: fresh.id, product_id: 3, reason: 'Other' })
  check(Boolean(earlyRet), 'A cannot return from an order that has not been delivered')

  // B sees none of it.
  for (const table of ['addresses', 'profiles', 'orders', 'order_returns']) {
    const { data, error } = await b.c.from(table).select('*')
    check(!error && data.length === 0, `B reads nothing from ${table}`)
  }
  const { data: bUpdate } = await b.c.from('addresses').update({ city: 'Hacked' }).eq('id', addr.id).select()
  const { data: stillA } = await a.c.from('addresses').select('city').eq('id', addr.id).single()
  check((bUpdate ?? []).length === 0 && stillA.city === 'Springfield', "B cannot change A's address")
  await b.c.from('addresses').delete().eq('id', addr.id)
  const { data: afterDelete } = await a.c.from('addresses').select('id').eq('id', addr.id)
  check(afterDelete.length === 1, "B cannot delete A's address")
  const { error: impersonate } = await b.c.from('addresses').insert({ ...addressFields, user_id: a.id })
  check(Boolean(impersonate), "B cannot add an address under A's id")
  const { error: profileAsA } = await b.c.from('profiles').insert({ id: a.id, full_name: 'B as A' })
  check(Boolean(profileAsA), "B cannot create a profile for A")
  const { error: foreignDefault } = await b.c.from('profiles').insert({ id: b.id, default_address_id: addr.id })
  check(Boolean(foreignDefault), "B cannot make A's address their default")
  const { error: orderAsA } = await b.c.from('orders').insert({ ...fresh, id: orderId(3), user_id: a.id })
  check(Boolean(orderAsA), "B cannot add an order under A's id")
  const { data: bCancel } = await b.c.from('orders').update({ cancelled_at: new Date().toISOString() }).eq('id', fresh.id).select()
  check((bCancel ?? []).length === 0, "B cannot cancel A's order")
  const { error: bReturn } = await b.c.from('order_returns').insert({ user_id: a.id, order_id: delivered.id, product_id: 4, reason: 'Other' })
  check(Boolean(bReturn), "B cannot request a return on A's order")

  // Anonymous: nothing at all.
  for (const table of ['addresses', 'profiles', 'orders', 'order_returns']) {
    const { data, error } = await client().from(table).select('*')
    check(Boolean(error) || data.length === 0, `anonymous requests read nothing from ${table}`)
  }

  // A's own rules: cancel only while preparing, and only cancelled_at can change.
  const { data: cancelOld } = await a.c.from('orders').update({ cancelled_at: new Date().toISOString() }).eq('id', delivered.id).select()
  check((cancelOld ?? []).length === 0, 'A cannot cancel an order after the 2-minute Preparing window')
  const { data: cancelNew, error: cancelErr } = await a.c.from('orders').update({ cancelled_at: new Date().toISOString() }).eq('id', fresh.id).select()
  check(!cancelErr && cancelNew.length === 1, 'A can cancel an order while it is preparing')
  const { error: totalErr } = await a.c.from('orders').update({ total: 0 }).eq('id', delivered.id)
  check(Boolean(totalErr), "A cannot change an order's total (only cancelled_at is updatable)")
  const { error: dupErr } = await a.c.from('orders').insert(delivered)
  check(Boolean(dupErr), 'the same order id cannot be added twice (no duplicates when moving data)')

  // The demo account's credentials are locked, even through the API directly.
  let demoId
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 })
  demoId = existing.users.find((u) => u.email === DEMO_EMAIL)?.id
  if (!demoId) {
    const { data, error } = await admin.auth.admin.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true })
    if (error) throw new Error(`create demo: ${error.message}`)
    demoId = data.user.id
  }
  const demo = client()
  const { error: demoSignIn } = await demo.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
  check(!demoSignIn, `the demo account signs in${demoSignIn ? `: ${demoSignIn.message}` : ''}`)
  const { error: demoPw } = await demo.auth.updateUser({ password: `changed-${stamp}` })
  check(Boolean(demoPw), "the demo account's password cannot be changed")
  const { error: demoEmail } = await demo.auth.updateUser({ email: `taken-${stamp}@example.com` })
  check(Boolean(demoEmail), "the demo account's email cannot be changed")
  const { error: demoAgain } = await client().auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
  check(!demoAgain, 'the demo password still works afterwards')
  // Re-dating the demo's live orders: only the demo account may call it.
  const { error: rpcAsUser } = await a.c.rpc('refresh_demo_orders')
  check(Boolean(rpcAsUser), 'a normal user cannot call refresh_demo_orders')
  const { error: rpcAnon } = await client().rpc('refresh_demo_orders')
  check(Boolean(rpcAnon), 'an anonymous visitor cannot call refresh_demo_orders')
  const { error: rpcDemo } = await demo.rpc('refresh_demo_orders')
  check(!rpcDemo, `the demo account can refresh its live orders${rpcDemo ? `: ${rpcDemo.message}` : ''}`)
  const { error: userPw } = await a.c.auth.updateUser({ password: `${password}-new` })
  check(!userPw, 'a normal user can still change their own password')
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id)
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll RLS checks passed')
process.exit(failures ? 1 : 0)
