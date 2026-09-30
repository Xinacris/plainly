// Creates the shared demo account if it's missing and resets its data, so
// reviewers always find it usable. Run every 3 days by the keep-alive workflow
// (which also keeps the free Supabase project from pausing), or by hand:
//
//   SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/demo-reset.mjs
//   node scripts/demo-reset.mjs --env=.env.test.local     (plainly-test)
//
// The secret key is read from the environment (a GitHub Actions secret in CI) or
// a gitignored env file, and is never printed: the script logs counts only.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../src/lib/demo.js'
import { estimateDelivery } from '../src/lib/delivery.ts'

const envFile = process.argv.find((a) => a.startsWith('--env='))?.split('=')[1]
let url = process.env.SUPABASE_URL
let secret = process.env.SUPABASE_SECRET_KEY
if (envFile) {
  const env = Object.fromEntries(
    fs
      .readFileSync(envFile, 'utf8')
      .split('\n')
      .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map(([, k, v]) => [k, v.trim().replace(/^"(.*)"$/, '$1')]),
  )
  url = env.VITE_SUPABASE_URL
  secret = env.SUPABASE_TEST_SECRET_KEY
}
if (!url || !secret) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY.')
  process.exit(1)
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
const fail = (what, error) => {
  console.error(`${what} failed: ${error?.message ?? error}`)
  process.exit(1)
}

// 1. The demo user: created once, email confirmed so no email is ever sent. Its
// password can't change (the demo_credentials_guard migration), so it's never reset.
let demoId
for (let page = 1; !demoId; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) fail('Listing users', error)
  demoId = data.users.find((u) => u.email === DEMO_EMAIL)?.id
  if (data.users.length < 200) break
}
if (!demoId) {
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Demo Reviewer' },
  })
  if (error) fail('Creating the demo user', error)
  demoId = data.user.id
  console.log('Created the demo user.')
}

// 2. Real product snapshots, priced like the app: the discounted price, rounded per unit.
const res = await fetch('https://dummyjson.com/products?limit=0')
if (!res.ok) fail('Loading the catalog', res.status)
const catalog = (await res.json()).products
const product = (id) => catalog.find((p) => p.id === id)
const salePrice = (p) => Math.round(p.price * (100 - p.discountPercentage)) / 100
const line = (id, quantity, placedAt) => {
  const p = product(id)
  return {
    productId: p.id,
    title: p.title,
    thumbnail: p.thumbnail,
    price: salePrice(p),
    quantity,
    shippingInformation: p.shippingInformation,
    returnPolicy: p.returnPolicy,
    estimate: estimateDelivery(p.shippingInformation, new Date(placedAt)),
  }
}

const now = Date.now()
const ago = (minutes) => new Date(now - minutes * 60_000).toISOString()
const DAY = 24 * 60

const addresses = [
  { full_name: 'Demo Reviewer', line1: '1 Sample Street', line2: '', city: 'Springfield', region: 'IL', postal_code: '62701' },
  { full_name: 'Demo Reviewer', line1: '200 Example Avenue', line2: 'Suite 5', city: 'Portland', region: 'OR', postal_code: '97201' },
  { full_name: 'Pat Example', line1: '12 Elm Road', line2: '', city: 'Austin', region: 'TX', postal_code: '78701' },
]
const shipTo = { fullName: 'Demo Reviewer', line1: '1 Sample Street', line2: '', city: 'Springfield', region: 'IL', postalCode: '62701' }

// Lasting states. (Preparing and Shipped only last minutes, so the app adds those
// when the demo signs in with nothing on its way.)
const orders = [
  // Delivered, with a refunded return on one item and a "No returns" item.
  // (Calvin Klein CK One: 90-day returns; Essence Mascara: no returns.)
  { id: 'PL-DEMO0001', placed_at: ago(3 * DAY), lines: [line(6, 1, ago(3 * DAY)), line(1, 2, ago(3 * DAY))] },
  // Delivered yesterday: an item that can still be returned (60-day returns).
  { id: 'PL-DEMO0002', placed_at: ago(DAY), lines: [line(14, 1, ago(DAY))] },
  // Cancelled a minute after it was placed.
  { id: 'PL-DEMO0003', placed_at: ago(2 * DAY), cancelled_at: ago(2 * DAY - 1), lines: [line(4, 1, ago(2 * DAY))] },
].map((o) => ({
  user_id: demoId,
  id: o.id,
  placed_at: o.placed_at,
  cancelled_at: o.cancelled_at ?? null,
  address: shipTo,
  lines: o.lines,
  total: Math.round(o.lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100,
}))

// 3. Replace the demo's data (order returns go with their orders).
for (const [table, column] of [['orders', 'user_id'], ['profiles', 'id'], ['addresses', 'user_id']]) {
  const { error } = await admin.from(table).delete().eq(column, demoId)
  if (error) fail(`Clearing ${table}`, error)
}
const { data: insertedAddresses, error: addressError } = await admin
  .from('addresses')
  .insert(addresses.map((a, i) => ({ ...a, user_id: demoId, created_at: ago(10 * DAY - i) })))
  .select('id, line1')
if (addressError) fail('Adding addresses', addressError)
const defaultId = insertedAddresses.find((a) => a.line1 === '1 Sample Street').id
const { error: profileError } = await admin.from('profiles').insert({ id: demoId, full_name: 'Demo Reviewer', phone: '', default_address_id: defaultId })
if (profileError) fail('Adding the profile', profileError)
const { error: orderError } = await admin.from('orders').insert(orders)
if (orderError) fail('Adding orders', orderError)
const { error: returnError } = await admin
  .from('order_returns')
  .insert({ user_id: demoId, order_id: 'PL-DEMO0001', product_id: 6, reason: 'Changed my mind', requested_at: ago(2 * DAY) })
if (returnError) fail('Adding the return', returnError)

console.log(`Demo account reset: ${addresses.length} addresses, ${orders.length} orders, 1 return.`)
