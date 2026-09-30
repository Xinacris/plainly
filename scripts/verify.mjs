// Layout + flow verification for Plainly.
//
//   node scripts/verify.mjs [baseUrl] [--changed=home,search,...] [--out=dir]
//   node scripts/verify.mjs <liveUrl> --smoke
//
// Run the full verification against a local preview build (`vite preview`). The live
// URL only ever gets --smoke: one page, light, 1440, no flows. Heavy automated
// traffic triggered Vercel's Security Checkpoint (see DECISIONS.md, Deployment notes).
//
// Pages listed in --changed (or all pages with --changed=all) get the full matrix:
// 1440 / 1024 / 390 px in light and dark. Every other page gets a quick check at
// 1440 (light) and 390 (dark). Each scene waits for DOMContentLoaded plus a selector
// for its main content (never networkidle), has a 15 s limit, and the whole run has
// a 2-minute budget. Failures are logged and the run moves on.
//
// Needs a Chromium binary: CHROMIUM_PATH, or the Playwright cache in ~/.cache/ms-playwright.
import { chromium } from 'playwright-core'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const base = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173'
const shotDir = flag('out') ?? 'verify-shots'
const changedArg = flag('changed') ?? ''
const smoke = args.includes('--smoke')
// --only=<text>: run just the flows whose name contains <text>, and no layout scenes (for debugging).
const only = flag('only')
// axe-core checks WCAG A/AA rules on the 1440-light and 390-dark scenes.
const AXE_SOURCE = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
fs.mkdirSync(shotDir, { recursive: true })

const SCENE_TIMEOUT = 15_000
const BUDGET = 120_000
const CONCURRENCY = 6
const startedAt = Date.now()

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const cache = path.join(process.env.HOME, '.cache/ms-playwright')
  const dir = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().at(-1)
  const sub = fs.readdirSync(path.join(cache, dir)).find((d) => d.startsWith('chrome-'))
  return path.join(cache, dir, sub, 'chrome')
}

const CART = JSON.stringify({
  state: { lines: [{ productId: 14, quantity: 2 }, { productId: 9, quantity: 1 }, { productId: 1, quantity: 10 }] },
  version: 1,
})

const compareIds = (...ids) => JSON.stringify({ state: { ids }, version: 1 })

const ADDRESS = { fullName: 'Ada Lovelace', line1: '12 St James’s Square', line2: 'Flat 4', city: 'Springfield', region: 'IL', postalCode: '62701' }
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString()
const line = (productId, title, thumb, price, quantity, shippingInformation, estimate, returnPolicy = '30 days return policy') => ({
  productId, title, price, quantity, shippingInformation, returnPolicy,
  thumbnail: `https://cdn.dummyjson.com/product-images/${thumb}/thumbnail.webp`, estimate,
})
const BOOK = JSON.stringify({ state: { addresses: [{ id: 'a1', ...ADDRESS }, { id: 'a2', fullName: 'Grace Hopper', line1: '200 Navy Way', line2: '', city: 'Arlington', region: 'VA', postalCode: '22201' }], defaultId: 'a2' }, version: 1 })
const ORDERS = JSON.stringify({
  state: {
    orders: [
      { id: 'PL-TEST0002', placedAt: daysAgo(0), address: ADDRESS, total: 639.97,
        lines: [line(14, 'Knoll Saarinen Executive Conference Chair', 'furniture/knoll-saarinen-executive-conference-chair', 499.99, 1, 'Ships overnight', { earliest: '2026-10-05', latest: '2026-10-08' }),
                line(9, 'Dolce Shine Eau de', 'fragrances/dolce-shine-eau-de', 69.99, 2, 'Ships in 1 month', { earliest: '2026-11-02', latest: '2026-11-05' })] },
      { id: 'PL-TEST0001', placedAt: daysAgo(40), address: ADDRESS, total: 17.93,
        lines: [line(1, 'Essence Mascara Lash Princess', 'beauty/essence-mascara-lash-princess', 8.94, 1, 'Ships in some odd way', undefined, 'No return policy'),
                line(9, 'Dolce Shine Eau de', 'fragrances/dolce-shine-eau-de', 8.99, 1, 'Ships in 1 month', undefined, '7 days return policy')] },
    ],
  },
  version: 1,
})

// `page` groups scenes for --changed; `ready` is the selector that proves main content rendered.
const SCENES = [
  { name: 'home', page: 'home', url: '/', ready: 'main a:has-text("See all")' },
  { name: 'search-all', page: 'search', url: '/search', ready: 'main li h2 a' },
  { name: 'search-phone', page: 'search', url: '/search?q=phone', ready: 'main li h2 a' },
  { name: 'search-none', page: 'search', url: '/search?q=xyzzy', ready: 'main h2:has-text("No products match")' },
  { name: 'search-department', page: 'search', url: '/search?department=electronics', ready: 'main li h2 a' },
  { name: 'search-sale-view', page: 'search', url: '/search?view=sale&sort=discount', ready: 'main li h2 a' },
  { name: 'search-sale-filter', page: 'search', url: '/search?department=beauty&sale=1', ready: 'main li h2 a' },
  { name: 'search-dept-filter', page: 'search', url: '/search?dept=electronics&category=laptops', ready: 'main li h2 a' },
  { name: 'search-corrected', page: 'search', url: '/search?q=lptop', ready: 'main li h2 a' },
  { name: 'search-intent', page: 'search', url: '/search?q=t-shirt', ready: 'main li h2 a' },
  { name: 'search-department-filtered', page: 'search', url: '/search?department=electronics&brand=Apple&sale=1', ready: 'main li h2 a' },
  { name: 'search-filtered', page: 'search', url: '/search?category=beauty&category=fragrances&rating=4&stock=in&min=5&max=80', ready: 'main li h2 a' },
  { name: 'search-filter-empty', page: 'search', url: '/search?min=100&max=1', ready: 'main h2:has-text("No products match these filters")' },
  { name: 'search-sheet', page: 'search', url: '/search?q=watch&brand=Rolex', ready: 'main li h2 a', widths: [390],
    before: async (page) => { await page.getByRole('button', { name: /^Filters/ }).click(); await page.getByRole('dialog').waitFor() } },
  { name: 'product-1', page: 'product', url: '/product/1', ready: 'main article h1' },
  { name: 'product-167-gallery', page: 'product', url: '/product/167', ready: 'main article h1' },
  { name: 'product-78-breadcrumb', page: 'product', url: '/product/78', ready: 'main article h1' },
  { name: 'product-108-long-crumbs', page: 'product', url: '/product/108', ready: 'main article h1' },
  { name: 'menu-open', page: 'header', url: '/', ready: 'main a:has-text("See all")', widths: [390],
    before: async (page) => { await page.getByRole('button', { name: 'Menu' }).click(); await page.getByRole('dialog', { name: 'Menu' }).waitFor() } },
  { name: 'product-22-no-warranty', page: 'product', url: '/product/22', ready: 'main article h1' },
  { name: 'product-117-oos', page: 'product', url: '/product/117', ready: 'main article h1' },
  { name: 'product-9999', page: 'product', url: '/product/9999', ready: 'main h1:has-text("Product not found")' },
  { name: 'cart-empty', page: 'cart', url: '/cart', ready: 'main h1:has-text("Your cart is empty")' },
  { name: 'cart-items', page: 'cart', url: '/cart', cart: CART, ready: 'main aside[aria-label="Order summary"]' },
  { name: 'checkout', page: 'checkout', url: '/checkout', cart: CART, ready: 'main aside[aria-label="Order summary"] button' },
  { name: 'checkout-prefilled', page: 'checkout', url: '/checkout', cart: CART, orders: ORDERS, ready: 'main aside[aria-label="Order summary"] button' },
  { name: 'checkout-empty', page: 'checkout', url: '/checkout', ready: 'main h1:has-text("Your cart is empty")' },
  { name: 'confirmation', page: 'orders', url: '/orders/PL-TEST0002/confirmation', orders: ORDERS, ready: 'main h1:has-text("Order placed")' },
  { name: 'confirmation-missing', page: 'orders', url: '/orders/PL-NOPE/confirmation', ready: 'main h1:has-text("Order not found")' },
  { name: 'orders', page: 'orders', url: '/orders', orders: ORDERS, ready: 'main h1:has-text("Your orders")' },
  { name: 'orders-delivered', page: 'orders', url: '/orders?tab=delivered', orders: ORDERS, ready: 'main article' },
  { name: 'addresses', page: 'addresses', url: '/addresses', addresses: BOOK, ready: 'main ul > li' },
  { name: 'addresses-empty', page: 'addresses', url: '/addresses', ready: 'main h1:has-text("Addresses")' },
  { name: 'checkout-picker', page: 'checkout', url: '/checkout', cart: CART, addresses: BOOK, ready: 'main aside[aria-label="Order summary"] button' },
  { name: 'orders-empty', page: 'orders', url: '/orders', ready: 'main h1:has-text("No orders yet")' },
  { name: 'compare-3', page: 'compare', url: '/compare', compare: compareIds(1, 3, 5), ready: 'main table' },
  { name: 'compare-2-oos', page: 'compare', url: '/compare', compare: compareIds(113, 117), ready: 'main table' },
  { name: 'compare-1', page: 'compare', url: '/compare', compare: compareIds(1), ready: 'main h1:has-text("Add one more product")' },
  { name: 'compare-empty', page: 'compare', url: '/compare', ready: 'main h1:has-text("Nothing to compare yet")' },
  { name: 'search-tray', page: 'compare', url: '/search?q=mascara', compare: compareIds(1, 9), ready: 'section[aria-label="Compare"] a:has-text("Compare")' },
  { name: 'compare-prompt', page: 'compare', url: '/product/14', compare: compareIds(1), ready: 'section[aria-label="Compare"] li img',
    before: async (page) => { await page.getByRole('button', { name: 'Add to compare' }).click(); await page.getByRole('dialog').waitFor() } },
  { name: 'compare-mixed', page: 'compare', url: '/search?q=chair', compare: compareIds(1, 14, 3), ready: 'section[aria-label="Compare"] li img' },
  { name: 'product-tray', page: 'compare', url: '/product/1', compare: compareIds(1), ready: 'section[aria-label="Compare"] li img' },
  { name: 'not-found', page: 'not-found', url: '/nope', ready: 'main h1:has-text("Page not found")' },
]

const changed = new Set(changedArg === 'all' ? SCENES.map((s) => s.page) : changedArg.split(',').filter(Boolean))
const FULL = [1440, 1024, 390].flatMap((width) => ['light', 'dark'].map((theme) => ({ width, theme })))
const QUICK = [{ width: 1440, theme: 'light' }, { width: 390, theme: 'dark' }]

// Runs in the page: horizontal scroll, clipped text, overlapping elements, low-contrast text.
function audit() {
  const issues = []
  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent || el.getAttribute('aria-label') || el.alt || '').trim().slice(0, 40)}"`
  const visible = (el) => {
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    // Content of a closed <details> isn't rendered, though it still has a box.
    const inClosedDetails = el.closest('details:not([open])') && !el.closest('summary')
    return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 1 && r.height > 1 && !el.closest('.sr-only') && !inClosedDetails
  }
  if (document.documentElement.scrollWidth > innerWidth) issues.push(`horizontal scroll: ${document.documentElement.scrollWidth} > ${innerWidth}`)

  // Boxes are cut to their nearest scroll container, so rows scrolled out of view
  // (e.g. under a sheet's sticky footer) don't count as overlapping it.
  // Also any overflow-clipped box: the gallery hides its other slides with overflow: hidden.
  const clipToScroller = (el) => {
    const r = el.getBoundingClientRect()
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a)
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue
      const c = a.getBoundingClientRect()
      return { left: Math.max(r.left, c.left), right: Math.min(r.right, c.right), top: Math.max(r.top, c.top), bottom: Math.min(r.bottom, c.bottom) }
    }
    return r
  }
  const inFixed = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return true
    return false
  }
  // With a modal open, the page behind it is inert and covered, so only the modal is audited.
  const root = document.querySelector('dialog[open]') ?? document.body
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
  const textEls = [...root.querySelectorAll('*')].filter((el) => hasOwnText(el) && visible(el))

  for (const el of textEls) {
    const r = el.getBoundingClientRect()
    // Items in a sideways-scrolling row (product rows, the department bar) are meant to be off-screen.
    const inScroller = (e) => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll') return true } return false }
    if ((r.right > innerWidth + 1 || r.left < -1) && !inScroller(el)) issues.push(`off-screen: ${describe(el)}`)
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a)
      // Content that scrolls inside an overflow:auto box isn't clipped; hidden/clip is.
      if (s.overflowY === 'auto' || s.overflowY === 'scroll') break
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const ar = a.getBoundingClientRect()
        if (r.right > ar.right + 1 || r.bottom > ar.bottom + 1) issues.push(`clipped: ${describe(el)}`)
        break
      }
    }
    // Ellipsis truncation with the full text in a title (breadcrumbs) is on purpose.
    const intentional = getComputedStyle(el).textOverflow === 'ellipsis' && el.title === el.textContent
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' && !intentional) issues.push(`truncated: ${describe(el)}`)
  }

  const boxes = [...root.querySelectorAll('img, button, input, select, a, h1, h2, h3, p, output, label')]
    .filter(visible)
    .map((el) => ({ el, r: clipToScroller(el), fixed: inFixed(el) }))
    .filter(({ r }) => r.right > r.left && r.bottom > r.top)
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const { el: a, r: ra } = boxes[i], { el: b, r: rb } = boxes[j]
      if (ra.bottom <= rb.top || rb.bottom <= ra.top || ra.right <= rb.left || rb.right <= ra.left) continue
      if (a.contains(b) || b.contains(a)) continue
      // Page content scrolls under a fixed bar (the compare tray) by design.
      if (boxes[i].fixed !== boxes[j].fixed) continue
      // An absolutely positioned control on its sibling (a corner × on a thumbnail) is placed on purpose.
      const placed = (x, y) => getComputedStyle(x).position === 'absolute' && x.parentElement?.contains(y)
      if (placed(a, b) || placed(b, a)) continue
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (w > 2 && h > 2) issues.push(`overlap: ${describe(a)} × ${describe(b)}`)
    }
  }

  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number)
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor)
      if (c.length === 3 || (c.length === 4 && c[3] > 0.9)) return c.slice(0, 3)
    }
    return [255, 255, 255]
  }
  for (const el of textEls) {
    if (el.closest(':disabled, [aria-hidden="true"] img')) continue
    const s = getComputedStyle(el)
    const fg = parse(s.color).slice(0, 3)
    const [l1, l2] = [lum(fg), lum(bgOf(el))].sort((x, y) => y - x)
    const ratio = (l1 + 0.05) / (l2 + 0.05)
    const size = parseFloat(s.fontSize)
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700)
    if (ratio < (large ? 3 : 4.5)) issues.push(`low contrast ${ratio.toFixed(2)}: ${describe(el)}`)
  }
  return [...new Set(issues)]
}

async function axeIssues(page) {
  await page.addScriptTag({ content: AXE_SOURCE })
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })
    return result.violations.map((v) => `axe ${v.impact} ${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)
  })
  return violations
}

const report = { layout: {}, failures: [], flows: [], errors: [] }
const log = (line) => process.stdout.write(`${line}\n`)
const elapsed = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`

function withTimeout(promise, ms, what) {
  let timer
  const timeout = new Promise((_, reject) => (timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms / 1000}s`)), ms)))
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function finish(reason) {
  log(`\n=== ${reason} after ${elapsed()} ===`)
  log(JSON.stringify(report, null, 1))
  const failed = report.failures.length || report.flows.some((f) => f.startsWith('FAIL')) || Object.keys(report.layout).length || report.errors.length
  process.exit(failed ? 1 : 0)
}
const budgetTimer = setTimeout(() => {
  report.failures.push(`total budget of ${BUDGET / 1000}s exceeded; remaining scenes skipped`)
  finish('BUDGET EXCEEDED')
}, BUDGET)

const browser = await chromium.launch({ executablePath: chromiumPath() })

async function newPage(theme, width, { cart, orders, compare, addresses, allowErrors = false } = {}) {
  const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } })
  if (cart) await ctx.addInitScript((s) => localStorage.setItem('plainly-cart', s), cart)
  if (orders) await ctx.addInitScript((s) => localStorage.setItem('plainly-orders', s), orders)
  if (compare) await ctx.addInitScript((s) => localStorage.setItem('plainly-compare', s), compare)
  if (addresses) await ctx.addInitScript((s) => localStorage.setItem('plainly-addresses', s), addresses)
  const page = await ctx.newPage()
  page.setDefaultTimeout(SCENE_TIMEOUT)
  page.setDefaultNavigationTimeout(SCENE_TIMEOUT)
  if (!allowErrors) {
    page.on('pageerror', (e) => report.errors.push(`${page.url()}: ${e}`))
    page.on('console', (m) => m.type() === 'error' && report.errors.push(`${page.url()}: ${m.text().split('\n')[0]}`))
  }
  return { ctx, page }
}

async function runScene({ scene, width, theme }) {
  const label = `${scene.name} ${theme} ${width}`
  const t0 = Date.now()
  const { ctx, page } = await newPage(theme, width, scene)
  try {
    await withTimeout(
      (async () => {
        await page.goto(base + scene.url, { waitUntil: 'domcontentloaded' })
        await page.locator(scene.ready).first().waitFor()
        if (scene.before) await scene.before(page)
        // Give visible images a moment to paint for the screenshot, but never block on them.
        await withTimeout(page.evaluate(() => Promise.all([...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight).map((i) => i.decode().catch(() => {})))), 3000, 'images').catch(() => {})
        const issues = await page.evaluate(audit)
        if ((width === 1440 && theme === 'light') || (width === 390 && theme === 'dark')) issues.push(...(await axeIssues(page)))
        if (issues.length) report.layout[label] = issues
        await page.screenshot({ path: path.join(shotDir, `${scene.name}-${theme}-${width}.png`), fullPage: !scene.before })
        log(`${issues.length ? '!' : '✓'} ${label}  ${Date.now() - t0}ms${issues.length ? `  (${issues.length} layout issues)` : ''}`)
      })(),
      SCENE_TIMEOUT,
      label,
    )
  } catch (e) {
    report.failures.push(`${label}: ${e.message.split('\n')[0]}`)
    log(`✗ ${label}  ${Date.now() - t0}ms  ${e.message.split('\n')[0]}`)
  } finally {
    await ctx.close().catch(() => {})
  }
}

async function pool(items, worker) {
  const queue = [...items]
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await worker(queue.shift())
  }))
}

// 1. Layout audit. --smoke checks the home page once and skips everything else.
const jobs = only ? [] : smoke
  ? [{ scene: SCENES.find((s) => s.name === 'home'), width: 1440, theme: 'light' }]
  : SCENES.flatMap((scene) =>
  (changed.has(scene.page) ? FULL : QUICK).filter((v) => !scene.widths || scene.widths.includes(v.width)).map((v) => ({ scene, ...v })),
)
log(`Layout: ${jobs.length} scenes (full matrix for: ${[...changed].join(', ') || 'none'})`)
await pool(jobs, runScene)

// 2. Flows (light, desktop), also bounded and parallel.
const expect = (cond, msg) => { if (!cond) throw new Error(msg) }

// Tab through an open modal. Past its last control a native <dialog> hands focus
// to the browser's own UI (document.body here) and then back in; what must never
// happen is focus reaching page content behind the modal.
async function expectFocusTrapped(page, dialog, presses) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press('Tab')
    const inside = await dialog.evaluate((d) => d.contains(document.activeElement) || document.activeElement === document.body)
    expect(inside, `Tab ${i + 1} moved focus behind the modal`)
  }
}
const FLOWS = {
  'search, sort, show more': async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('searchbox').fill('phones')
    await page.getByRole('searchbox').press('Enter')
    await page.waitForURL(/\/search\?q=phones/)
    await page.locator('main li h2 a').first().waitFor()
    await page.getByLabel('Sort by').selectOption('price-asc')
    await page.waitForURL(/sort=price-asc/)
    const prices = await page.locator('main li .text-lg').allTextContents()
    const nums = prices.map((p) => Number(p.replace(/[^\d.]/g, '')))
    expect(nums.length > 0 && nums.every((n, i) => i === 0 || n >= nums[i - 1]), `prices not ascending: ${nums}`)
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' })
    await page.locator('main li h2 a').first().waitFor()
    expect((await page.locator('main li h2 a').count()) === 24, 'first page is not 24')
    await page.getByRole('button', { name: /Show 24 more/ }).click()
    expect((await page.locator('main li h2 a').count()) === 48, 'show more did not add 24')
  },
  'add to cart, header count, persistence, stepper, remove': async (page) => {
    await page.goto(base + '/product/14', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Quantity').selectOption('2')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.getByRole('region', { name: 'Cart update' }).getByText('2 added to your cart').waitFor()
    await page.getByRole('link', { name: 'Cart, 2 items' }).waitFor()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Cart, 2 items' }).waitFor()
    await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Increase quantity' }).click()
    await page.getByRole('link', { name: 'Cart, 3 items' }).waitFor()
    await page.getByText(/Subtotal \(3 items\)/).waitFor()
    await page.getByRole('button', { name: /^Remove/ }).click()
    await page.getByRole('heading', { name: 'Your cart is empty' }).waitFor()
    await page.getByRole('link', { name: 'Cart, 0 items' }).waitFor()
  },
  'stock cap (product 9 has 4 left)': async (page) => {
    await page.goto(base + '/product/9', { waitUntil: 'domcontentloaded' })
    await page.getByText('Only 4 left').waitFor()
    const options = await page.getByLabel('Quantity').locator('option').count()
    expect(options === 4, `expected 4 quantity options, got ${options}`)
    await page.getByLabel('Quantity').selectOption('4')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.getByText('You can’t add more: that’s the most you can buy (only 4 in stock).').waitFor()
    await page.getByText('4 in your cart').waitFor()
    expect((await page.getByRole('button', { name: 'Add to cart' }).count()) === 0, 'add button still shown at cap')
  },
  'out of stock has no add button': async (page) => {
    await page.goto(base + '/product/117', { waitUntil: 'domcontentloaded' })
    await page.getByText('Out of stock', { exact: true }).waitFor()
    expect((await page.getByRole('button', { name: 'Add to cart' }).count()) === 0, 'add button on OOS product')
  },
  'rating truncates and matches reviews': async (page) => {
    await page.goto(base + '/product/2', { waitUntil: 'domcontentloaded' }) // reviews 4,3,3 → 3.33 → "3.3"
    await page.getByText('Rated 3.3 out of 5 from 3 reviews').first().waitFor({ state: 'attached' })
  },
  'error boundary: Try again refetches': async (page) => {
    await page.route('https://dummyjson.com/**', (r) => r.abort())
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Something went wrong' }).waitFor()
    await page.unroute('https://dummyjson.com/**')
    let refetched = false
    page.on('request', (r) => r.url().startsWith('https://dummyjson.com/products') && (refetched = true))
    await page.getByRole('button', { name: 'Try again' }).click()
    await page.locator('main li h2 a').first().waitFor()
    expect(refetched, 'Try again did not refetch')
  },
  'stored cart quantity is clamped to stock': async (page) => {
    await page.addInitScript(() => localStorage.setItem('plainly-cart', JSON.stringify({ state: { lines: [{ productId: 9, quantity: 50 }] }, version: 1 })))
    await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' })
    await page.getByText(/Subtotal \(4 items\)/).waitFor()
  },
  'deep link + gallery': async (page) => {
    const res = await page.goto(base + '/product/167', { waitUntil: 'domcontentloaded' })
    expect(res.status() === 200, `status ${res.status()}`)
    await page.getByRole('button', { name: 'Show image 6 of 6' }).click()
    expect((await page.getByRole('button', { name: 'Show image 6 of 6' }).getAttribute('aria-pressed')) === 'true', 'gallery did not switch')
  },
  'checkout: validation, place, confirmation, cart cleared, snapshot, prefill': async (page) => {
    await page.addInitScript(() => localStorage.getItem('plainly-cart') || localStorage.setItem('plainly-cart', JSON.stringify({ state: { lines: [{ productId: 9, quantity: 2 }] }, version: 1 })))
    await page.goto(base + '/checkout', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.getByText('Enter your full name.').waitFor()
    await page.getByText('Enter your ZIP or postal code.').waitFor()
    expect(await page.getByLabel('Full name').evaluate((el) => el === document.activeElement), 'first invalid field not focused')
    expect(!page.url().includes('/orders/'), 'order placed with an empty address')
    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByLabel('Street address').fill('1 Main St')
    await page.getByLabel('City').fill('Springfield')
    await page.getByLabel('State or region').fill('IL')
    await page.getByLabel('ZIP or postal code').fill('62701')
    expect((await page.getByText(/^Enter your/).count()) === 0, 'errors stay after fixing fields')
    await page.getByText(/Estimated delivery/).first().waitFor()
    await page.locator('main').getByText('Payment is simulated', { exact: false }).waitFor()
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.waitForURL(/\/orders\/PL-[A-Z0-9]{8}\/confirmation$/)
    await page.getByRole('heading', { name: 'Order placed' }).waitFor()
    await page.getByText('$139.12').first().waitFor() // 2 × $69.56: the discounted price is what's charged
    await page.getByRole('link', { name: 'Cart, 0 items' }).waitFor()
    await page.getByRole('link', { name: 'See your orders' }).click()
    await page.getByRole('heading', { name: /^Order PL-/ }).first().waitFor()
    // Back button from confirmation must not land on a checkout for an order already placed.
    await page.goBack()
    expect(page.url().includes('/confirmation'), `back from orders went to ${page.url()}, not the confirmation`)
    // "Save this address for later" was ticked, so the next checkout preselects it.
    await page.goto(base + '/product/14', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.goto(base + '/checkout', { waitUntil: 'domcontentloaded' })
    const saved = page.getByRole('radio', { name: /Ada Lovelace/ })
    await saved.waitFor()
    expect(await saved.isChecked(), 'saved default address not preselected')
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.getByRole('heading', { name: 'Order placed' }).waitFor()
    await page.goto(base + '/orders', { waitUntil: 'domcontentloaded' })
    const headings = await page.getByRole('heading', { level: 2, name: /^Order PL-/ }).count()
    expect(headings === 2, `expected 2 orders, got ${headings}`)
    const firstTotal = await page.locator('main article').first().locator('header').textContent()
    expect(!firstTotal.includes('$139.12'), 'orders not newest first')
  },
  'filters: sidebar, URL sync, chips, reload, clear': async (page) => {
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' })
    const sidebar = page.getByRole('complementary', { name: 'Filters' })
    await sidebar.getByRole('button', { name: /^Beauty/ }).click() // step 1: the department
    await page.waitForURL(/dept=beauty/)
    await sidebar.getByRole('checkbox', { name: /^Beauty/ }).check() // step 2: its category
    await page.waitForURL(/category=beauty/)
    await page.getByRole('button', { name: 'Remove filter: Beauty department' }).waitFor()
    await page.getByRole('button', { name: 'Remove filter: Beauty', exact: true }).waitFor()
    expect((await page.locator('main li h2 a').count()) === 5, 'beauty should have 5 products')
    await sidebar.getByRole('radio', { name: /^4 and up/ }).check()
    await page.waitForURL(/rating=4/)
    await sidebar.getByLabel('Max').fill('10')
    await page.waitForURL(/max=10/)
    const n = await page.locator('main li h2 a').count()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('main li h2 a').first().waitFor()
    expect((await page.locator('main li h2 a').count()) === n, 'results changed after reload')
    expect(await sidebar.getByRole('checkbox', { name: /^Beauty/ }).isChecked(), 'checkbox not restored from URL')
    expect((await sidebar.getByLabel('Max').inputValue()) === '10', 'max price not restored from URL')
    await page.getByRole('button', { name: 'Remove filter: Up to $10.00' }).click()
    await page.waitForURL((u) => !u.search.includes('max='))
    // The URL changes before React re-renders, so wait for the input rather than reading it once.
    await sidebar.getByLabel('Max').evaluate((el) => new Promise((ok) => { const t = setInterval(() => el.value === '' && (clearInterval(t), ok()), 20) }))
    await page.getByRole('button', { name: 'Clear all', exact: true }).click()
    await page.waitForURL((u) => u.search === '')
    await page.goto(base + '/search?q=phone&category=smartphones&sort=price-asc', { waitUntil: 'domcontentloaded' })
    await page.locator('main li h2 a').first().waitFor()
    expect((await page.getByLabel('Sort by').inputValue()) === 'price-asc', 'sort not read from URL')
    const prices = (await page.locator('main li .text-lg').allTextContents()).map((p) => Number(p.replace(/[^\d.]/g, '')))
    expect(prices.every((x, i) => i === 0 || x >= prices[i - 1]), `filtered prices not ascending: ${prices}`)
  },
  'filters: bottom sheet traps focus, Escape closes and returns focus': Object.assign(async (page) => {
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' })
    await page.locator('main li h2 a').first().waitFor()
    expect(!(await page.getByRole('complementary', { name: 'Filters' }).isVisible()), 'sidebar visible on phone')
    const opener = page.getByRole('button', { name: /^Filters/ })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Filters' })
    await dialog.waitFor()
    await expectFocusTrapped(page, dialog, 45)
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    expect(await opener.evaluate((b) => b === document.activeElement), 'focus not returned to Filters button')
    await opener.click()
    await dialog.getByRole('checkbox', { name: /^In stock only/ }).check()
    await page.waitForURL(/stock=in/)
    await dialog.getByRole('button', { name: /^Show \d+ results$/ }).click()
    await dialog.waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Remove filter: In stock' }).waitFor()
    await page.getByRole('button', { name: 'Filters, 1 applied' }).waitFor()
  }, { width: 390, theme: 'dark' }),
  'cards: real discount, list price, no badges': async (page) => {
    await page.goto(base + '/search?q=mascara', { waitUntil: 'domcontentloaded' })
    const card = page.locator('main li', { has: page.getByRole('link', { name: 'Essence Mascara Lash Princess' }) })
    await card.getByText('$8.94').waitFor() // 9.99 × (1 − 10.48%)
    await card.getByText('10% off').waitFor() // truncated, never rounded up
    await card.getByText('$9.99').waitFor()
    const text = await page.locator('main').innerText()
    for (const word of ['Best Seller', 'Choice', 'Sponsored', 'Deal', 'Limited time']) expect(!text.includes(word), `badge text "${word}"`)
    await page.goto(base + '/search?q=dolce', { waitUntil: 'domcontentloaded' }) // 0.62% off: not presented as a discount
    const dolce = page.locator('main li', { has: page.getByRole('link', { name: 'Dolce Shine Eau de' }) })
    await dolce.getByText('$69.56').waitFor()
    await dolce.getByText('Only 4 left').waitFor()
    expect((await dolce.getByText(/% off|List price/).count()) === 0, 'sub-1% discount shown')
  },
  'decision card facts': async (page) => {
    await page.goto(base + '/product/1', { waitUntil: 'domcontentloaded' })
    const card = page.getByRole('region', { name: 'Price and key facts' })
    await card.getByText('No returns').waitFor()
    await card.getByText('1 week').waitFor()
    await card.getByText('10% off').waitFor()
    await card.getByText(/^Estimate: ships in 3-5 business days, plus 2–5 business days in transit\.$/).waitFor()
    await page.goto(base + '/product/22', { waitUntil: 'domcontentloaded' })
    await card.getByText('60-day returns').waitFor()
    await card.getByText('None', { exact: true }).waitFor()
    await page.goto(base + '/product/117', { waitUntil: 'domcontentloaded' })
    await card.getByText('Not available while out of stock').waitFor()
    await page.getByRole('heading', { name: 'Reviews (3)' }).waitFor()
    expect((await page.locator('details[open] li').count()) === 3, 'not all 3 reviews shown')
    await page.getByText('Shipping, returns and warranty').click()
    await page.getByText('These are the seller’s own words', { exact: false }).waitFor()
  },
  'compare: add from cards, cap at 3, differences, only-differences, remove, persist': async (page) => {
    await page.goto(base + '/search?category=beauty', { waitUntil: 'domcontentloaded' })
    await page.locator('main li h2 a').first().waitFor()
    const toggles = page.getByRole('button', { name: /^Compare / })
    for (let i = 0; i < 3; i++) await toggles.nth(i).click()
    expect((await toggles.nth(0).getAttribute('aria-pressed')) === 'true', 'card toggle not pressed')
    const tray = page.getByRole('region', { name: 'Compare' })
    await tray.getByText('3 of 3').waitFor()
    await toggles.nth(3).click()
    await tray.getByText('You can compare up to 3').waitFor()
    await tray.getByText('3 of 3').waitFor()
    expect((await toggles.nth(3).getAttribute('aria-pressed')) === 'false', 'a 4th product was added')
    await tray.getByRole('link', { name: 'Compare' }).click()
    await page.waitForURL(/\/compare$/)
    await page.getByRole('heading', { level: 1, name: 'Comparing in Beauty' }).waitFor()
    expect((await page.locator('thead th[scope=col]').count()) === 3, 'expected 3 product columns')
    const differing = await page.locator('tbody[data-differs]').count()
    const total = await page.locator('main tbody').count()
    expect(differing > 0 && differing < total, `differing rows ${differing} of ${total}`)
    await page.getByText(`${differing} of ${total} facts differ`, { exact: false }).waitFor()
    expect((await page.locator('tbody[data-differs] tr:not(.sm\\:hidden)').first().evaluate((r) => getComputedStyle(r).backgroundColor)) !== 'rgba(0, 0, 0, 0)', 'differing row not highlighted')
    await page.getByLabel('Show only what differs').check()
    expect((await page.locator('main tbody').count()) === differing, 'same rows still shown')
    await page.getByRole('button', { name: /^Remove / }).first().click()
    expect((await page.locator('thead th[scope=col]').count()) === 2, 'remove did not drop a column')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('main table').waitFor()
    expect((await page.locator('thead th[scope=col]').count()) === 2, 'compare not persisted')
    // The tray stays out of the compare page and checkout.
    expect((await page.getByRole('region', { name: 'Compare' }).count()) === 0, 'tray shown on /compare')
    await page.goto(base + '/checkout', { waitUntil: 'domcontentloaded' })
    await page.locator('main h1').waitFor()
    expect((await page.getByRole('region', { name: 'Compare' }).count()) === 0, 'tray shown on /checkout')
  },
  'compare: product page button': async (page) => {
    await page.goto(base + '/product/1', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Add to compare' }).click()
    await page.getByRole('button', { name: 'Added to compare' }).waitFor()
    const tray = page.getByRole('region', { name: 'Compare' })
    await tray.getByText('Add 1 more product to compare').waitFor()
    await tray.getByRole('button', { name: 'Remove Essence Mascara Lash Princess from compare' }).click()
    await page.getByRole('button', { name: 'Add to compare' }).waitFor()
    await tray.waitFor({ state: 'detached' })
  },
  'compare: phone, tray never hides the end of the page': Object.assign(async (page) => {
    await page.goto(base + '/search?q=mascara', { waitUntil: 'domcontentloaded' })
    await page.locator('main li h2 a').first().waitFor()
    await page.getByRole('button', { name: /^Compare / }).first().click()
    const tray = page.getByRole('region', { name: 'Compare' })
    await tray.waitFor()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(350) // let the slide-up finish before measuring
    const trayTop = await tray.evaluate((t) => t.getBoundingClientRect().top)
    const lastBottom = await page.locator('main li').last().evaluate((el) => el.getBoundingClientRect().bottom)
    expect(lastBottom <= trayTop, `last card ends at ${Math.round(lastBottom)}, tray starts at ${Math.round(trayTop)}`)
    await page.goto(base + '/compare', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Add one more product to compare' }).waitFor()
  }, { width: 390, theme: 'dark' }),
  'orders: return window per item, from the order date': async (page) => {
    await page.addInitScript((s) => localStorage.setItem('plainly-orders', s), ORDERS)
    await page.goto(base + '/orders', { waitUntil: 'domcontentloaded' }) // Active: the order placed just now
    const recent = page.locator('main article').first()
    await recent.getByText('Return window open').first().waitFor()
    await recent.getByText(/until .+ \(30 days from the order date\)/).first().waitFor()
    await page.getByRole('link', { name: /^Delivered/ }).click() // the 40-day-old order
    const old = page.locator('main article').first()
    await old.getByText('No returns for this item.').waitFor()
    await old.getByText(/Return window closed on .+ \(7 days from the order date\)\./).waitFor()
    expect((await old.getByRole('button', { name: /^Return this item/ }).evaluateAll((bs) => bs.every((b) => b.disabled))), 'a return offered where none is possible')
  },
  'home: departments, tiles, rows, footer, department search': async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    const departments = page.getByRole('region', { name: 'Departments' })
    await departments.getByRole('heading', { level: 2 }).first().waitFor()
    expect((await departments.getByRole('heading', { level: 2 }).count()) === 8, 'expected 8 department cards')
    for (const card of await departments.locator(':scope > ul > li').all()) {
      expect((await card.locator('ul > li').count()) === 4, `a department card doesn't have 4 tiles`)
    }
    const groceries = departments.locator(':scope > ul > li', { has: page.getByRole('heading', { name: /^Groceries/ }) })
    expect((await groceries.locator('a[href="/search?department=groceries&category=groceries"]').count()) === 1, 'groceries category tile')
    expect((await groceries.locator('ul a[href^="/product/"]').count()) === 3, 'groceries should fill 3 tiles with products')
    await page.getByRole('heading', { name: 'Biggest discounts right now' }).waitFor()
    await page.getByText('Sorted by real discount %', { exact: false }).waitFor()
    await page.getByText('Each rating is the average of just 3 reviews', { exact: false }).waitFor()
    await page.getByRole('contentinfo').getByRole('link', { name: 'Source on GitHub' }).waitFor()
    await departments.getByRole('link', { name: 'See all in Electronics' }).click()
    await page.waitForURL(/department=electronics/)
    await page.getByRole('heading', { level: 1, name: 'Electronics' }).waitFor()
    await page.locator('main p[role=status]').getByText('38 results').waitFor() // 16 smartphones + 5 laptops + 3 tablets + 14 accessories
    expect((await page.getByRole('button', { name: 'Remove filter: Electronics' }).count()) === 0, 'department shown as a chip')
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'All products' }).waitFor()
    const nav = page.getByRole('navigation', { name: 'Departments' })
    expect((await nav.getByRole('link', { name: 'Electronics' }).getAttribute('aria-current')) === 'page', 'category bar not marking the department')
    expect((await page.title()) === 'Electronics · Plainly', `title was ${await page.title()}`)
  },
  'keyboard: skip link, theme radio group': async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('region', { name: 'Departments' }).waitFor()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to main content' })
    expect(await skip.evaluate((a) => a === document.activeElement), 'first Tab is not the skip link')
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => document.activeElement?.id === 'main'), 'skip link did not move focus to main')
    const radios = page.getByRole('radio')
    expect((await page.locator('[role=radio][tabindex="0"]').count()) === 1, 'theme toggle should be one Tab stop')
    await page.locator('[role=radio][tabindex="0"]').focus()
    await page.keyboard.press('ArrowLeft') // system → dark
    expect((await radios.nth(1).getAttribute('aria-checked')) === 'true', 'ArrowLeft did not select dark')
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'dark theme not applied')
    expect(await radios.nth(1).evaluate((r) => r === document.activeElement), 'focus did not follow the selection')
    await page.keyboard.press('ArrowLeft') // dark → light
    expect(!(await page.evaluate(() => document.documentElement.classList.contains('dark'))), 'light theme not applied')
  },
  'scroll: new pages start at the top, filters keep position': async (page) => {
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' })
    await page.locator('main li h2 a').nth(20).waitFor()
    // Scroll a little, then use a checkbox that's still in view, so Playwright doesn't scroll to it.
    await page.evaluate(() => window.scrollTo(0, 100))
    await page.getByRole('complementary', { name: 'Filters' }).getByRole('button', { name: /^Beauty/ }).click()
    await page.waitForURL(/dept=beauty/)
    await page.waitForTimeout(100)
    expect((await page.evaluate(() => window.scrollY)) === 100, 'a filter change moved the scroll position')
    await page.getByRole('button', { name: 'Remove filter: Beauty department' }).click()
    await page.waitForURL((u) => !u.search.includes('dept'))
    await page.locator('main li h2 a').nth(20).scrollIntoViewIfNeeded()
    await page.locator('main li h2 a').nth(20).click()
    await page.locator('main article h1').waitFor()
    expect((await page.evaluate(() => window.scrollY)) === 0, 'product page did not start at the top')
    expect((await page.title()).endsWith(' · Plainly') && !(await page.title()).startsWith('Plainly'), `product title: ${await page.title()}`)
  },
  'error: catalog down with items in compare still shows the error page': async (page) => {
    await page.addInitScript((s) => localStorage.setItem('plainly-compare', s), compareIds(1, 3))
    await page.route('https://dummyjson.com/**', (r) => r.abort())
    await page.goto(base + '/product/1', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Something went wrong' }).waitFor()
    await page.getByRole('banner').getByRole('link', { name: 'Plainly, home' }).waitFor()
  },
  'phone: intro is one line, current department scrolled into the bar': Object.assign(async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    const intro = page.getByRole('heading', { level: 1, name: 'Shop without the noise.' })
    const lines = await intro.evaluate((h) => {
      const strip = getComputedStyle(h.parentElement)
      const content = h.parentElement.getBoundingClientRect().height - parseFloat(strip.paddingTop) - parseFloat(strip.paddingBottom)
      return Math.round(content / parseFloat(getComputedStyle(h).lineHeight))
    })
    expect(lines === 1, `intro strip wraps to ${lines} lines`)
    await page.goto(base + '/search?department=vehicles', { waitUntil: 'domcontentloaded' })
    const link = page.getByRole('navigation', { name: 'Departments' }).getByRole('link', { name: 'Vehicles' })
    await link.waitFor()
    const box = await link.boundingBox()
    expect(box.x >= 0 && box.x + box.width <= 390, `active department at x=${Math.round(box.x)} is outside the bar`)
  }, { width: 390, theme: 'dark' }),
  'sale view is context: heading, breadcrumb, current in bar, Clear all keeps it': async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    const bar = page.getByRole('navigation', { name: 'Departments' })
    const barLinks = await bar.getByRole('link').allTextContents()
    expect(barLinks[0] === 'All products' && barLinks[1] === '10%+ off', `bar starts ${barLinks.slice(0, 2)}`)
    const colors = await bar.getByRole('link', { name: '10%+ off' }).evaluate((a) => [getComputedStyle(a).color, getComputedStyle(document.documentElement).getPropertyValue('--sale').trim()])
    const hex = '#' + colors[0].match(/\d+/g).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
    expect(hex === colors[1], `sale link color ${hex}, token ${colors[1]}`)
    // The home row's "See all" opens the same view, as context.
    await page.getByRole('region', { name: 'Departments' }).waitFor()
    await page.getByRole('link', { name: 'See all biggest discounts right now' }).click()
    await page.waitForURL(/view=sale/)
    expect(page.url().includes('sort=discount') && !page.url().includes('sale=1'), `home See all opened ${page.url()}`)
    await page.getByRole('heading', { level: 1, name: '10%+ off' }).waitFor()
    const crumbs = await page.getByRole('navigation', { name: 'Breadcrumb' }).locator('li:not([aria-hidden])').allTextContents()
    expect(crumbs.join(' › ') === 'All products › 10%+ off', `crumbs: ${crumbs}`)
    expect((await bar.getByRole('link', { name: '10%+ off' }).getAttribute('aria-current')) === 'page', 'bar does not mark the sale view')
    expect((await bar.getByRole('link', { name: 'All products' }).getAttribute('aria-current')) === null, '"All products" also marked current')
    await page.locator('main p[role=status]').getByText('104 results').waitFor()
    expect((await page.getByRole('button', { name: /^Remove filter: 10%\+ off/ }).count()) === 0, 'sale view shown as a chip')
    const sidebar = page.getByRole('complementary', { name: 'Filters' })
    expect((await sidebar.getByRole('checkbox', { name: /^10%\+ off/ }).count()) === 0, 'sale checkbox shown inside the sale view')
    while (await page.getByRole('button', { name: /Show \d+ more/ }).count()) await page.getByRole('button', { name: /Show \d+ more/ }).click()
    const pcts = (await page.locator('main li').getByText(/^\d+% off$/).allTextContents()).map((t) => parseInt(t))
    expect(pcts.length === 104 && pcts.every((p) => p >= 10), `sale view: ${pcts.length} products, min ${Math.min(...pcts)}%`)
    // Filters inside the view are normal filters, and Clear all keeps the view.
    await sidebar.getByRole('button', { name: /^Beauty/ }).click()
    await sidebar.getByRole('checkbox', { name: /^In stock only/ }).check()
    await page.getByRole('button', { name: 'Remove filter: Beauty department' }).waitFor()
    await page.getByRole('button', { name: 'Clear all', exact: true }).click()
    await page.waitForURL((u) => !u.search.includes('dept') && !u.search.includes('stock'))
    expect(page.url().includes('view=sale'), `Clear all left the sale view: ${page.url()}`)
    await page.getByRole('heading', { level: 1, name: '10%+ off' }).waitFor()
    // A department (or All products) in the bar leaves the sale view.
    await bar.getByRole('link', { name: 'Beauty' }).click()
    await page.waitForURL((u) => u.search === '?department=beauty')
    await page.getByRole('heading', { level: 1, name: 'Beauty' }).waitFor()
    expect((await bar.getByRole('link', { name: '10%+ off' }).getAttribute('aria-current')) === null, 'sale still marked after leaving')
    await page.goto(base + '/search?view=sale', { waitUntil: 'domcontentloaded' })
    await bar.getByRole('link', { name: 'All products' }).click()
    await page.waitForURL((u) => u.pathname === '/search' && u.search === '')
    await page.getByRole('heading', { level: 1, name: 'All products' }).waitFor()
  },
  'sale checked on the page is a filter: chip, Clear all removes it': async (page) => {
    await page.goto(base + '/search?department=beauty', { waitUntil: 'domcontentloaded' })
    const sidebar = page.getByRole('complementary', { name: 'Filters' })
    await sidebar.getByRole('checkbox', { name: /^10%\+ off/ }).check()
    await page.waitForURL(/sale=1/)
    await page.getByRole('button', { name: 'Remove filter: 10%+ off' }).waitFor()
    await page.getByRole('heading', { level: 1, name: 'Beauty' }).waitFor()
    await sidebar.getByRole('checkbox', { name: /^In stock only/ }).check()
    await page.getByRole('button', { name: 'Clear all', exact: true }).click()
    await page.waitForURL((u) => u.search === '?department=beauty')
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' })
    await sidebar.getByRole('checkbox', { name: /^10%\+ off/ }).check()
    await page.getByRole('button', { name: 'Remove filter: 10%+ off' }).click()
    await page.waitForURL((u) => u.search === '')
  },
  'typos: corrected query says so, undo searches the typed words': async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('searchbox').fill('lptop')
    await page.getByRole('searchbox').press('Enter')
    await page.waitForURL(/q=lptop/)
    await page.getByText('Showing results for laptop', { exact: false }).waitFor()
    await page.getByRole('heading', { level: 1, name: 'Results for “laptop”' }).waitFor()
    await page.getByRole('button', { name: 'Remove filter: Laptops (from “laptop”)' }).waitFor()
    await page.locator('main p[role=status]').getByText('5 results').waitFor()
    await page.getByRole('link', { name: 'Search instead for lptop' }).click()
    await page.waitForURL(/literal=1/)
    await page.getByRole('heading', { name: 'No products match “lptop”' }).waitFor()
    // A corrected word that names a category still gets the category chip.
    await page.goto(base + '/search?q=smartphnes', { waitUntil: 'domcontentloaded' })
    const chip = page.getByRole('button', { name: 'Remove filter: Smartphones (from “smartphones”)' })
    await chip.waitFor()
    await page.locator('main p[role=status]').getByText('16 results').waitFor()
    await chip.click()
    await page.waitForURL((u) => u.searchParams.get('q') === 'smartphones' && u.searchParams.get('literal') === '1')
    await page.locator('main li h2 a').first().waitFor()
    expect((await page.getByText('Showing results for', { exact: false }).count()) === 0, 'correction note after undoing the chip')
    await page.goto(base + '/search?q=iphnoe', { waitUntil: 'domcontentloaded' })
    await page.getByText('Showing results for iphone', { exact: false }).waitFor()
    await page.goto(base + '/search?q=aple%20watch', { waitUntil: 'domcontentloaded' })
    await page.getByText('Showing results for apple watch', { exact: false }).waitFor()
    // Exact queries are never touched.
    for (const q of ['laptop', 'mascara', 'watc', 'red']) {
      await page.goto(base + `/search?q=${q}`, { waitUntil: 'domcontentloaded' })
      await page.locator('main li h2 a').first().waitFor()
      expect((await page.getByText('Showing results for', { exact: false }).count()) === 0, `"${q}" was corrected`)
    }
  },
  'department is context: no chip, Clear all keeps it, breadcrumb leaves it': async (page) => {
    await page.goto(base + '/search?department=electronics&brand=Apple&sale=1', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1, name: 'Electronics' }).waitFor()
    await page.getByRole('button', { name: 'Remove filter: Apple' }).waitFor() // chips render once the catalog loads
    const chips = await page.getByRole('list', { name: 'Applied filters' }).getByRole('button').allTextContents()
    expect(chips.length === 2 && !chips.some((c) => c.includes('Electronics')), `chips: ${chips}`)
    await page.getByRole('button', { name: 'Clear all', exact: true }).click()
    await page.waitForURL((u) => u.search === '?department=electronics')
    await page.getByRole('heading', { level: 1, name: 'Electronics' }).waitFor()
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'All products' }).click()
    await page.waitForURL((u) => u.pathname === '/search' && u.search === '')
    await page.getByRole('heading', { level: 1, name: 'All products' }).waitFor()
  },
  'search understands categories, chip undoes it': async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('searchbox').fill('phone')
    await page.getByRole('searchbox').press('Enter')
    await page.waitForURL(/\/search\?q=phone$/)
    const chip = page.getByRole('button', { name: 'Remove filter: Smartphones (from “phone”)' })
    await chip.waitFor()
    await page.locator('main p[role=status]').getByText('16 results').waitFor()
    await chip.click()
    await page.waitForURL(/literal=1/)
    expect(page.url().includes('q=phone'), 'undo dropped the query')
    const literal = Number((await page.locator('main p[role=status]').textContent()).match(/\d+/)[0])
    expect(literal !== 16 && literal > 0, `text search for "phone" gave ${literal}`)
    await page.goto(base + '/search?q=t-shirt', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Remove filter: Mens shirts (from “t-shirt”)' }).waitFor()
    await page.locator('main p[role=status]').getByText('5 results').waitFor()
    await page.goto(base + '/search?q=Perfumes', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Remove filter: Fragrances/ }).waitFor()
    await page.goto(base + '/search?q=phone%20case', { waitUntil: 'domcontentloaded' })
    await page.locator('main li h2 a').first().waitFor()
    expect((await page.getByRole('button', { name: /from “phone case”/ }).count()) === 0, '"phone case" should stay a text search')
  },
  'breadcrumbs: department › category › brand › product': async (page) => {
    await page.goto(base + '/product/78', { waitUntil: 'domcontentloaded' })
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' })
    await crumbs.waitFor()
    const steps = await crumbs.locator('li:not([aria-hidden])').allTextContents()
    expect(steps.join(' › ') === 'Electronics › Laptops › Apple › Apple MacBook Pro 14 Inch Space Grey', `crumbs: ${steps}`)
    expect((await crumbs.getByRole('link').count()) === 3, 'product step should not be a link')
    const brandHref = await crumbs.getByRole('link', { name: 'Apple' }).getAttribute('href')
    expect(brandHref === '/search?department=electronics&category=laptops&brand=Apple', `brand link ${brandHref}`)
    await crumbs.getByRole('link', { name: 'Apple' }).click()
    await page.getByRole('button', { name: 'Remove filter: Laptops' }).waitFor()
    await page.getByRole('button', { name: 'Remove filter: Apple' }).waitFor()
    await page.goto(base + '/product/22', { waitUntil: 'domcontentloaded' }) // no brand
    await page.getByRole('heading', { level: 1, name: 'Dog Food' }).waitFor()
    const plain = await page.getByRole('navigation', { name: 'Breadcrumb' }).locator('li:not([aria-hidden])').allTextContents()
    expect(plain.join(' › ') === 'Groceries › Groceries › Dog Food', `no-brand crumbs: ${plain}`)
  },
  'phone: breadcrumb is one line and truncates': Object.assign(async (page) => {
    await page.goto(base + '/product/108', { waitUntil: 'domcontentloaded' })
    const ol = page.getByRole('navigation', { name: 'Breadcrumb' }).locator('ol')
    await ol.waitFor()
    const { height, lineHeight, overflow } = await ol.evaluate((el) => ({ height: el.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(el).lineHeight), overflow: el.scrollWidth - el.clientWidth }))
    expect(height < lineHeight * 1.5, `breadcrumb is ${height}px tall`)
    expect(overflow <= 1, `breadcrumb overflows by ${overflow}px`)
    const last = ol.locator('[aria-current=page]')
    expect(await last.evaluate((el) => el.scrollWidth > el.clientWidth), 'long product name should be truncated at 390')
    // The product name gives way first, so the steps before it stay readable.
    const cut = await ol.getByRole('link').evaluateAll((links) => links.filter((a) => a.scrollWidth > a.clientWidth).map((a) => a.textContent))
    expect(cut.length === 0, `ancestor steps truncated: ${cut}`)
  }, { width: 390, theme: 'light' }),
  'phone header: two rows, cart one tap, menu with Orders and theme': Object.assign(async (page) => {
    await page.goto(base + '/product/1', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Add to cart' }).click()
    const header = page.getByRole('banner')
    const logo = await header.getByRole('link', { name: 'Plainly, home' }).boundingBox()
    const cart = await header.getByRole('link', { name: 'Cart, 1 item' }).boundingBox()
    const menu = await header.getByRole('button', { name: 'Menu' }).boundingBox()
    const search = await header.getByRole('searchbox').boundingBox()
    expect(Math.abs(logo.y + logo.height / 2 - (cart.y + cart.height / 2)) < 4 && Math.abs(cart.y - menu.y) < 2, 'logo, cart and menu not on one row')
    expect(search.y > cart.y + cart.height && search.width > 280, 'search is not a full-width second row')
    expect((await header.getByRole('link', { name: 'Orders' }).count()) === 0, 'Orders visible in the phone header')
    expect((await header.getByRole('radiogroup', { name: 'Theme' }).count()) === 0, 'theme toggle visible in the phone header')
    const opener = header.getByRole('button', { name: 'Menu' })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Menu' })
    await dialog.getByRole('link', { name: 'Orders' }).waitFor()
    await expectFocusTrapped(page, dialog, 12)
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    expect(await opener.evaluate((b) => b === document.activeElement), 'focus not returned to the menu button')
    await opener.click()
    await dialog.getByRole('radio', { name: 'Dark' }).click()
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'menu theme choice not applied')
    await dialog.getByRole('link', { name: 'Orders' }).click()
    await page.getByRole('heading', { name: 'No orders yet' }).waitFor()
    await dialog.waitFor({ state: 'hidden' })
  }, { width: 390, theme: 'light' }),
  'desktop header unchanged at 640 and up': Object.assign(async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    const header = page.getByRole('banner')
    await header.getByRole('link', { name: 'Orders' }).waitFor()
    await header.getByRole('radiogroup', { name: 'Theme' }).waitFor()
    expect((await header.getByRole('button', { name: 'Menu' }).count()) === 0, 'menu button shown on desktop')
    const tops = await Promise.all(['Plainly, home', 'Orders'].map(async (n) => (await header.getByRole('link', { name: n }).boundingBox()).y))
    const search = (await header.getByRole('searchbox').boundingBox()).y
    expect(Math.abs(tops[0] - tops[1]) < 12 && Math.abs(search - tops[1]) < 12, 'desktop header is not one row')
  }, { width: 640, theme: 'light' }),
  'two-step category filter: departments, then categories, back, chips, focus': async (page) => {
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' })
    const sidebar = page.getByRole('complementary', { name: 'Filters' })
    const category = sidebar.getByRole('group', { name: 'Category' })
    await category.getByRole('button', { name: /^Electronics/ }).waitFor()
    expect((await category.locator('[data-department]').count()) === 8, 'step 1 should list 8 departments')
    expect((await category.getByRole('checkbox').count()) === 0, 'step 1 should not list categories')
    const electronics = await category.getByRole('button', { name: /^Electronics/ }).textContent()
    expect(/38/.test(electronics), `Electronics count: ${electronics}`)
    await category.getByRole('button', { name: /^Electronics/ }).click()
    await page.waitForURL(/dept=electronics/)
    const back = category.getByRole('button', { name: 'All departments' })
    await back.waitFor()
    expect(await back.evaluate((b) => b === document.activeElement), 'focus not moved to "All departments"')
    const counts = Object.fromEntries(
      (await category.getByRole('checkbox').evaluateAll((boxes) => boxes.map((b) => b.closest('label').textContent))).map((t) => [t.replace(/\d+$/, ''), Number(t.match(/\d+$/)[0])]),
    )
    expect(JSON.stringify(counts) === JSON.stringify({ 'Laptops': 5, 'Mobile accessories': 14, 'Smartphones': 16, 'Tablets': 3 }), `step 2: ${JSON.stringify(counts)}`)
    await page.getByRole('button', { name: 'Remove filter: Electronics department' }).waitFor()
    await page.getByRole('heading', { level: 1, name: 'All products' }).waitFor() // a filter, not context
    await page.locator('main p[role=status]').getByText('38 results').waitFor()
    await category.getByRole('checkbox', { name: /^Laptops/ }).check()
    await page.locator('main p[role=status]').getByText('5 results').waitFor()
    await back.click()
    await page.waitForURL((u) => !u.search.includes('dept') && !u.search.includes('category'))
    const electronicsButton = category.getByRole('button', { name: /^Electronics/ })
    await electronicsButton.waitFor()
    expect(await electronicsButton.evaluate((b) => b === document.activeElement), 'focus not returned to the department')
    // Removing the department chip also drops the categories picked inside it.
    await electronicsButton.click()
    await category.getByRole('checkbox', { name: /^Tablets/ }).check()
    await page.getByRole('button', { name: 'Remove filter: Electronics department' }).click()
    await page.waitForURL((u) => !u.search.includes('dept') && !u.search.includes('category'))
    // And "Clear all" removes it like any filter.
    await category.getByRole('button', { name: /^Home/ }).click()
    await sidebar.getByRole('checkbox', { name: /^In stock only/ }).check()
    await page.getByRole('button', { name: 'Clear all', exact: true }).click()
    await page.waitForURL((u) => u.search === '')
  },
  'two-step counts match results, with other filters and in the sale view': async (page) => {
    for (const url of ['/search?view=sale', '/search?rating=4&stock=in', '/search?q=phone&literal=1']) {
      await page.goto(base + url, { waitUntil: 'domcontentloaded' })
      const category = page.getByRole('complementary', { name: 'Filters' }).getByRole('group', { name: 'Category' })
      await category.locator('[data-department]').first().waitFor()
      const departments = await category.locator('[data-department]').evaluateAll((bs) => bs.map((b) => ({ slug: b.dataset.department, count: Number(b.textContent.match(/\d+/)[0]) })))
      for (const { slug, count } of departments.slice(0, 3)) {
        await category.locator(`[data-department="${slug}"]`).click()
        await page.waitForURL(new RegExp(`dept=${slug}`))
        const shown = Number((await page.locator('main p[role=status]').last().textContent()).match(/\d+/)[0])
        expect(shown === count, `${url}: ${slug} listed ${count}, gave ${shown}`)
        await category.getByRole('button', { name: 'All departments' }).click()
        await category.locator(`[data-department="${slug}"]`).waitFor()
      }
    }
    // Inside a department context the categories are listed directly.
    await page.goto(base + '/search?department=electronics', { waitUntil: 'domcontentloaded' })
    const category = page.getByRole('complementary', { name: 'Filters' }).getByRole('group', { name: 'Category' })
    await category.getByRole('checkbox', { name: /^Laptops/ }).waitFor()
    expect((await category.locator('[data-department]').count()) === 0, 'department step shown inside a department')
    expect((await category.getByRole('button', { name: 'All departments' }).count()) === 0, '"All departments" shown inside a department')
  },
  'two-step category filter in the phone sheet': Object.assign(async (page) => {
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' })
    await page.locator('main li h2 a').first().waitFor()
    await page.getByRole('button', { name: /^Filters/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    const category = sheet.getByRole('group', { name: 'Category' })
    await category.getByRole('button', { name: /^Home/ }).click()
    await page.waitForURL(/dept=home/)
    expect(await category.getByRole('button', { name: 'All departments' }).evaluate((b) => b === document.activeElement), 'focus not moved in the sheet')
    await category.getByRole('checkbox', { name: /^Furniture/ }).check()
    await sheet.getByRole('button', { name: /^Show \d+ results?$/ }).click()
    await sheet.waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Remove filter: Home department' }).waitFor()
    await page.getByRole('button', { name: 'Remove filter: Furniture' }).waitFor()
    await page.getByRole('button', { name: 'Filters, 2 applied' }).waitFor()
  }, { width: 390, theme: 'dark' }),
  'compare within one department: prompt, Cancel, Escape, Start new': async (page) => {
    await page.goto(base + '/product/1', { waitUntil: 'domcontentloaded' }) // Beauty
    await page.getByRole('button', { name: 'Add to compare' }).click()
    const tray = page.getByRole('region', { name: 'Compare' })
    await tray.getByText('Comparing in Beauty').waitFor()
    await page.goto(base + '/product/14', { waitUntil: 'domcontentloaded' }) // Home
    const add = page.getByRole('button', { name: 'Add to compare' })
    await add.click()
    const dialog = page.getByRole('dialog', { name: 'Start a new comparison?' })
    await dialog.getByText('Compare works within one department. Start a new comparison with this item?').waitFor()
    await dialog.getByText('You’re comparing in Beauty; Knoll Saarinen Executive Conference Chair is in Home.', { exact: false }).waitFor()
    expect(await dialog.getByRole('button', { name: 'Cancel' }).evaluate((b) => b === document.activeElement), 'Cancel should have focus')
    expect((await page.getByRole('button', { name: 'Added to compare' }).count()) === 0, 'button claims it was added while asking')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await dialog.waitFor({ state: 'hidden' })
    expect(await add.evaluate((b) => b === document.activeElement), 'focus not returned after Cancel')
    await tray.getByText('Comparing in Beauty').waitFor()
    await tray.getByText('1 of 3').waitFor()
    await add.click()
    await dialog.waitFor()
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await tray.getByText('Comparing in Beauty').waitFor()
    await add.click()
    await dialog.getByRole('button', { name: 'Start new' }).click()
    await dialog.waitFor({ state: 'hidden' })
    await tray.getByText('Comparing in Home').waitFor()
    await tray.getByText('1 of 3').waitFor()
    const added = page.getByRole('button', { name: 'Added to compare' })
    await added.waitFor()
    expect(await added.evaluate((b) => b === document.activeElement), 'focus not returned after Start new')
  },
  'compare: cards from another department never look added': async (page) => {
    await page.addInitScript((s) => localStorage.getItem('plainly-compare') || localStorage.setItem('plainly-compare', s), compareIds(1))
    await page.goto(base + '/search?department=home', { waitUntil: 'domcontentloaded' })
    const toggle = page.getByRole('button', { name: /^Compare / }).first()
    await toggle.waitFor()
    await toggle.click()
    const dialog = page.getByRole('dialog', { name: 'Start a new comparison?' })
    await dialog.waitFor()
    expect((await toggle.getAttribute('aria-pressed')) === 'false', 'card looks added while the prompt is open')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await dialog.waitFor({ state: 'hidden' })
    expect((await toggle.getAttribute('aria-pressed')) === 'false', 'card looks added after Cancel')
    expect((await page.getByRole('button', { name: /^Compare / }).evaluateAll((bs) => bs.filter((b) => b.getAttribute('aria-pressed') === 'true').length)) === 0, 'a Home card is pressed')
  },
  'compare: a saved mixed selection keeps the first department, says so once': async (page) => {
    await page.addInitScript((s) => localStorage.getItem('plainly-compare') || localStorage.setItem('plainly-compare', s), compareIds(1, 14, 3))
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' })
    const tray = page.getByRole('region', { name: 'Compare' })
    await tray.getByText('Comparing in Beauty').waitFor()
    await tray.getByText('2 of 3').waitFor()
    await tray.getByText('Your saved comparison mixed departments, so only the Beauty items were kept.').waitFor()
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('plainly-compare')).state)
    expect(JSON.stringify(saved) === JSON.stringify({ ids: [1, 3], department: 'beauty' }), `saved: ${JSON.stringify(saved)}`)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await tray.getByText('2 of 3').waitFor()
    expect((await tray.getByText('mixed departments', { exact: false }).count()) === 0, 'notice shown again after the fix')
  },
  'cart toast: what was added, running total, updates in place, actions, position': async (page) => {
    await page.goto(base + '/product/14', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Quantity').selectOption('3')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    const toast = page.getByRole('region', { name: 'Cart update' })
    await toast.getByText('3 added to your cart').waitFor()
    await toast.getByText('Knoll Saarinen Executive Conference Chair').waitFor()
    expect((await toast.getByText(/You now have/).count()) === 0, 'running total shown when it equals what was added')
    await page.locator('p[aria-live="polite"].sr-only').getByText('3 added to your cart', { exact: false }).waitFor({ state: 'attached' })
    const box = await toast.boundingBox()
    const header = await page.getByRole('banner').boundingBox()
    const cart = await page.getByRole('banner').getByRole('link', { name: /^Cart, 3 items/ }).boundingBox()
    expect(box.y >= header.y + header.height, `toast top ${box.y} overlaps the header (ends ${header.y + header.height})`)
    // Top right, aligned with the page's right edge, so the cart link sits right above it.
    const cartCenter = cart.x + cart.width / 2
    expect(cartCenter > box.x && cartCenter < box.x + box.width, `cart link (x=${cartCenter}) isn't above the toast (${box.x}–${box.x + box.width})`)
    await page.getByLabel('Quantity').selectOption('2')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await toast.getByText('2 added to your cart').waitFor()
    await toast.getByText('You now have 5 of these in your cart.').waitFor()
    expect((await page.getByRole('region', { name: 'Cart update' }).count()) === 1, 'a second toast stacked')
    await toast.getByRole('link', { name: 'View cart' }).waitFor()
    await toast.getByRole('link', { name: 'Checkout' }).waitFor()
    await page.getByText('5 in your cart').waitFor()
    await page.getByText('You can add up to 5 more (limit 10 per item).').waitFor()
    await toast.getByRole('button', { name: 'Close' }).click()
    await toast.waitFor({ state: 'detached' })
  },
  'cart toast: dismisses itself after about 5 seconds': async (page) => {
    await page.goto(base + '/product/3', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Add to cart' }).click()
    const toast = page.getByRole('region', { name: 'Cart update' })
    await toast.waitFor()
    const t0 = Date.now()
    await toast.waitFor({ state: 'detached', timeout: 7000 })
    const took = Date.now() - t0
    expect(took > 4000 && took < 6500, `dismissed after ${took}ms`)
  },
  'cart toast: stays while hovered': async (page) => {
    await page.goto(base + '/product/3', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Add to cart' }).click()
    const toast = page.getByRole('region', { name: 'Cart update' })
    await toast.hover()
    await page.waitForTimeout(5800)
    expect(await toast.isVisible(), 'toast left while hovered')
  },
  'cart toast: stays while focused': async (page) => {
    await page.goto(base + '/product/3', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Add to cart' }).click()
    const toast = page.getByRole('region', { name: 'Cart update' })
    await toast.getByRole('link', { name: 'View cart' }).focus()
    await page.waitForTimeout(5800)
    expect(await toast.isVisible(), 'toast left while focused')
  },
  'cart toast on phones: near the top, clear of the compare tray': Object.assign(async (page) => {
    await page.goto(base + '/product/1', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Add to compare' }).click()
    await page.getByRole('button', { name: 'Add to cart' }).click()
    const toast = page.getByRole('region', { name: 'Cart update' })
    await toast.waitFor()
    const box = await toast.boundingBox()
    const header = await page.getByRole('banner').boundingBox()
    const tray = await page.getByRole('region', { name: 'Compare' }).boundingBox()
    expect(box.y >= header.y + header.height && box.y < 300, `toast at y=${box.y}`)
    expect(box.y + box.height <= tray.y, 'toast overlaps the compare tray')
    expect(box.width >= 350, `toast is ${box.width}px wide on a phone`)
  }, { width: 390, theme: 'dark' }),
  'in-cart line and limits on the product page': async (page) => {
    await page.goto(base + '/product/9', { waitUntil: 'domcontentloaded' }) // 4 in stock
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.getByText('1 in your cart').waitFor()
    await page.getByText('You can add up to 3 more (only 4 in stock).').waitFor()
    const options = await page.getByLabel('Quantity').locator('option').count()
    expect(options === 3, `offers ${options} more, 3 left`)
    await page.locator('main').getByRole('link', { name: 'View cart' }).waitFor()
    await page.getByLabel('Quantity').selectOption('3')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.getByText('4 in your cart').waitFor()
    await page.getByText('You can’t add more: that’s the most you can buy (only 4 in stock).').waitFor()
    expect((await page.getByLabel('Quantity').count()) === 0, 'quantity offered at the limit')
    await page.goto(base + '/product/14', { waitUntil: 'domcontentloaded' }) // 26 in stock: the per-item limit applies
    await page.getByLabel('Quantity').selectOption('10')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.getByText('You can’t add more: that’s the most you can buy (limit 10 per item).').waitFor()
  },
  'mini-cart: hover delays, contents, no overlap with the toast, keyboard, Escape': async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    const cart = page.getByRole('banner').getByRole('link', { name: /^Cart, / })
    const preview = page.getByRole('region', { name: 'Cart preview' })
    // Passing over quickly doesn't open it.
    const c = await cart.boundingBox()
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2)
    await page.waitForTimeout(60)
    await page.mouse.move(c.x + c.width / 2, c.y + 400)
    await page.waitForTimeout(400)
    expect((await preview.count()) === 0, 'preview opened on a quick pass')
    await cart.hover()
    await preview.getByText('Your cart is empty').waitFor()
    await page.mouse.move(10, 600)
    await preview.waitFor({ state: 'detached' })
    // With items, and the toast gives way when the preview opens.
    await page.goto(base + '/product/14', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Quantity').selectOption('2')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    const toast = page.getByRole('region', { name: 'Cart update' })
    await toast.waitFor()
    await cart.hover()
    await preview.getByText('Knoll Saarinen Executive Conference Chair').waitFor()
    await toast.waitFor({ state: 'detached' })
    await preview.getByText('Qty 2').waitFor()
    await preview.getByText('$979.88').first().waitFor() // 2 × $489.94
    await preview.getByText('Subtotal (2 items)').waitFor()
    await preview.getByRole('link', { name: 'Checkout' }).waitFor()
    // Moving into the panel keeps it open.
    await preview.getByRole('link', { name: 'View cart' }).hover()
    await page.waitForTimeout(500)
    expect(await preview.isVisible(), 'preview closed while the pointer was in it')
    await page.mouse.move(10, 700)
    await preview.waitFor({ state: 'detached' })
    // Keyboard: opens on focus, Escape closes and returns focus.
    await page.getByRole('banner').getByRole('button', { name: 'Account' }).focus() // the control right before Cart
    await page.keyboard.press('Tab')
    await preview.waitFor()
    expect((await cart.getAttribute('aria-expanded')) === 'true', 'cart link not marked expanded')
    await page.keyboard.press('Escape')
    await preview.waitFor({ state: 'detached' })
    expect(await cart.evaluate((a) => a === document.activeElement), 'focus not returned to the cart link')
  },
}

// Touch has no hover: tapping the cart link goes straight to the cart, no preview first.
FLOWS['mini-cart on touch: a tap goes straight to the cart'] = async () => {
  const context = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width: 1024, height: 768 } })
  const page = await context.newPage()
  page.setDefaultTimeout(SCENE_TIMEOUT)
  try {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    const cart = page.getByRole('banner').getByRole('link', { name: /^Cart, / })
    await cart.waitFor()
    await page.evaluate(() => {
      window.__previewSeen = false
      new MutationObserver(() => document.querySelector('[data-mini-cart]') && (window.__previewSeen = true)).observe(document.body, { subtree: true, childList: true })
    })
    await cart.tap()
    await page.waitForURL(/\/cart$/)
    await page.getByRole('heading', { name: 'Your cart is empty' }).waitFor()
    await page.waitForTimeout(400)
    expect(!(await page.evaluate(() => window.__previewSeen)), 'the preview opened on a tap')
  } finally {
    await context.close()
  }
}

for (const motion of ['reduce', 'no-preference']) {
  FLOWS[`cart toast motion: ${motion}`] = async (page) => {
    await page.emulateMedia({ reducedMotion: motion })
    await page.goto(base + '/product/3', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Add to cart' }).click()
    const duration = await page.getByRole('region', { name: 'Cart update' }).evaluate((t) => getComputedStyle(t).transitionDuration)
    expect(motion === 'reduce' ? duration === '0s' : duration === '0.2s', `toast transition ${duration} with reduced motion ${motion}`)
  }
}

// Address book, checkout picker and the Account menu.
Object.assign(FLOWS, {
  'addresses: validate, add, default, edit, delete (next becomes default)': async (page) => {
    await page.goto(base + '/addresses', { waitUntil: 'domcontentloaded' })
    await page.getByText('No saved addresses yet.', { exact: false }).waitFor()
    await page.getByRole('button', { name: 'Add an address' }).click()
    await page.getByRole('button', { name: 'Save address' }).click()
    await page.getByText('Enter your full name.').waitFor()
    expect(await page.getByLabel('Full name').evaluate((el) => el === document.activeElement), 'first invalid field not focused')
    const fill = async (name, city) => {
      await page.getByLabel('Full name').fill(name)
      await page.getByLabel('Street address').fill('1 Main St')
      await page.getByLabel('City').fill(city)
      await page.getByLabel('State or region').fill('IL')
      await page.getByLabel('ZIP or postal code').fill('62701')
    }
    await fill('Ada Lovelace', 'Springfield')
    await page.getByRole('button', { name: 'Save address' }).click()
    const cards = page.locator('main ul > li')
    await cards.first().getByText('Default').waitFor()
    await page.getByRole('button', { name: 'Add an address' }).click()
    await fill('Grace Hopper', 'Arlington')
    await page.getByRole('button', { name: 'Save address' }).click()
    await page.getByRole('button', { name: 'Make default (Grace Hopper)' }).click()
    expect((await cards.first().textContent()).includes('Grace Hopper'), 'new default not listed first')
    await page.getByRole('button', { name: 'Edit address for Ada Lovelace' }).click()
    await page.getByLabel('City').fill('Shelbyville')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByText('Shelbyville, IL 62701').waitFor()
    await page.getByRole('button', { name: 'Delete address for Grace Hopper' }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete this address?' })
    await dialog.getByText('The next address becomes your default.', { exact: false }).waitFor()
    await dialog.getByRole('button', { name: 'Delete' }).click()
    await dialog.waitFor({ state: 'hidden' })
    await cards.filter({ hasText: 'Grace Hopper' }).waitFor({ state: 'detached' })
    expect((await cards.count()) === 1, 'address not deleted')
    await cards.first().getByText('Default').waitFor()
    await cards.first().locator('address').getByText('Ada Lovelace').waitFor()
  },
  'checkout picker: default preselected, new address inline, save for later, orders keep their copy': async (page) => {
    const book = JSON.stringify({ state: { addresses: [{ id: 'a1', ...ADDRESS }, { id: 'a2', fullName: 'Grace Hopper', line1: '200 Navy Way', line2: '', city: 'Arlington', region: 'VA', postalCode: '22201' }], defaultId: 'a2' }, version: 1 })
    await page.addInitScript((b) => localStorage.getItem('plainly-addresses') || localStorage.setItem('plainly-addresses', b), book)
    const cart = JSON.stringify({ state: { lines: [{ productId: 3, quantity: 1 }] }, version: 1 })
    const addToCart = () => page.evaluate((c) => localStorage.setItem('plainly-cart', c), cart)
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    await addToCart()
    await page.goto(base + '/checkout', { waitUntil: 'domcontentloaded' })
    const radios = page.getByRole('group', { name: 'Choose a shipping address' }).getByRole('radio')
    await radios.first().waitFor()
    expect((await radios.count()) === 3, 'expected 2 saved addresses and "Add a new address"')
    expect(await page.getByRole('radio', { name: /Grace Hopper/ }).isChecked(), 'default address not preselected')
    expect((await page.getByLabel('Full name').count()) === 0, 'new-address form shown before choosing it')
    await page.getByRole('radio', { name: 'Add a new address' }).check()
    const save = page.getByRole('checkbox', { name: 'Save this address for later' })
    expect(await save.isChecked(), 'save for later should start ticked')
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.getByText('Enter your full name.').waitFor() // same validation as before
    await page.getByLabel('Full name').fill('Katherine Johnson')
    await page.getByLabel('Street address').fill('1 NASA Rd')
    await page.getByLabel('City').fill('Hampton')
    await page.getByLabel('State or region').fill('VA')
    await page.getByLabel('ZIP or postal code').fill('23666')
    await save.uncheck()
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.getByRole('heading', { name: 'Order placed' }).waitFor()
    await page.getByText('Katherine Johnson').waitFor()
    let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('plainly-addresses')).state.addresses.length)
    expect(stored === 2, `unticked address was saved (${stored})`)
    // Ticked this time: saved, and orders keep their own copy after it's deleted.
    await addToCart()
    await page.goto(base + '/checkout', { waitUntil: 'domcontentloaded' })
    await page.getByRole('radio', { name: 'Add a new address' }).check()
    await page.getByLabel('Full name').fill('Mary Jackson')
    await page.getByLabel('Street address').fill('2 NASA Rd')
    await page.getByLabel('City').fill('Hampton')
    await page.getByLabel('State or region').fill('VA')
    await page.getByLabel('ZIP or postal code').fill('23666')
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.getByRole('heading', { name: 'Order placed' }).waitFor()
    stored = await page.evaluate(() => JSON.parse(localStorage.getItem('plainly-addresses')).state.addresses.length)
    expect(stored === 3, `ticked address not saved (${stored})`)
    await page.goto(base + '/addresses', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Delete address for Mary Jackson' }).click()
    await page.getByRole('dialog', { name: 'Delete this address?' }).getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await page.goto(base + '/orders', { waitUntil: 'domcontentloaded' })
    await page.locator('main article').first().getByText('Mary Jackson').waitFor()
  },
  'account menu: desktop disclosure and phone menu': async (page) => {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    const account = page.getByRole('banner').getByRole('button', { name: 'Account' })
    await account.click()
    expect((await account.getAttribute('aria-expanded')) === 'true', 'Account not expanded')
    await page.getByRole('banner').getByRole('link', { name: 'Addresses' }).waitFor()
    await page.keyboard.press('Escape')
    expect((await account.getAttribute('aria-expanded')) === 'false', 'Escape did not close it')
    expect(await account.evaluate((b) => b === document.activeElement), 'focus not returned to Account')
    await account.click()
    await page.getByRole('banner').getByRole('link', { name: 'Addresses' }).click()
    await page.getByRole('heading', { level: 1, name: 'Addresses' }).waitFor()
    expect((await page.getByRole('banner').getByRole('link', { name: 'Addresses' }).count()) === 0, 'menu stayed open after navigating')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Menu' }).click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await menu.getByRole('navigation', { name: 'Account' }).getByRole('link', { name: 'Orders' }).click()
    await page.waitForURL(/\/orders$/)
  },
})

// Simulated status: a fake clock moves an order from Preparing to Shipped to Delivered.
FLOWS['orders: status moves by time (simulated); cancel only while preparing'] = async (page) => {
  const now = Date.now()
  await page.clock.install({ time: now })
  const order = (id, placedAt) => ({ id, placedAt: new Date(placedAt).toISOString(), address: ADDRESS, total: 13.51, lines: [line(3, 'Powder Canister', 'beauty/powder-canister', 13.51, 1, 'Ships in 1-2 business days', { earliest: '2026-10-05', latest: '2026-10-08' })] })
  const orders = JSON.stringify({ state: { orders: [order('PL-KEEP0001', now), order('PL-GONE0002', now - 60_000)] }, version: 1 })
  await page.addInitScript((o) => localStorage.getItem('plainly-orders') || localStorage.setItem('plainly-orders', o), orders)
  await page.goto(base + '/orders', { waitUntil: 'domcontentloaded' })
  const keep = page.locator('main article', { has: page.getByRole('heading', { name: 'Order PL-KEEP0001' }) })
  const gone = page.locator('main article', { has: page.getByRole('heading', { name: 'Order PL-GONE0002' }) })
  await page.getByText('Status is simulated.', { exact: false }).waitFor()
  await keep.locator('[aria-current=step]').getByText('Preparing').waitFor()
  // Cancel: a confirmation first; Escape keeps the order.
  await gone.getByRole('button', { name: /^Cancel order/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Cancel this order?' })
  await dialog.waitFor()
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  await gone.getByRole('button', { name: /^Cancel order/ }).click()
  await dialog.getByRole('button', { name: 'Cancel order' }).click()
  await page.getByRole('link', { name: 'Cancelled (1)' }).waitFor()
  // Time moves on: shipped after 2 minutes (no cancelling any more), delivered after 5.
  await page.clock.fastForward('02:05')
  await keep.locator('[aria-current=step]').getByText('Shipped').waitFor()
  expect((await keep.getByRole('button', { name: /^Cancel order/ }).count()) === 0, 'cancel offered after shipping')
  await page.clock.fastForward('03:05')
  await page.getByRole('link', { name: 'Active (0)' }).waitFor()
  await page.getByRole('link', { name: /^Delivered \(1\)/ }).click()
  await keep.locator('[aria-current=step]').getByText('Delivered').waitFor()
  await page.getByRole('link', { name: /^Cancelled/ }).click()
  await gone.getByText(/^Cancelled /).waitFor()
  await gone.getByText('Powder Canister').waitFor() // details kept
}

// Returns: per item, after delivery, within the window; reason and confirmation; simulated refund.
FLOWS['orders: return per item with a reason, "No returns" disabled, Requested then Refunded'] = async (page) => {
  const now = Date.now()
  await page.clock.install({ time: now })
  const delivered = {
    id: 'PL-RETN0001', placedAt: new Date(now - 10 * 60_000).toISOString(), address: ADDRESS, total: 22.45,
    lines: [
      line(3, 'Powder Canister', 'beauty/powder-canister', 13.51, 1, 'Ships in 1-2 business days', undefined, '30 days return policy'),
      line(1, 'Essence Mascara Lash Princess', 'beauty/essence-mascara-lash-princess', 8.94, 1, 'Ships in 3-5 business days', undefined, 'No return policy'),
    ],
  }
  await page.addInitScript((o) => localStorage.getItem('plainly-orders') || localStorage.setItem('plainly-orders', o), JSON.stringify({ state: { orders: [delivered] }, version: 1 }))
  await page.goto(base + '/orders?tab=delivered', { waitUntil: 'domcontentloaded' })
  const card = page.locator('main article')
  const noReturn = card.getByRole('button', { name: 'Return this item: Essence Mascara Lash Princess' })
  await noReturn.waitFor()
  expect(await noReturn.isDisabled(), '"No returns" item offers a return')
  await card.getByText('No returns for this item.').waitFor()
  await card.getByText(/Return window open until/).waitFor()
  await card.getByRole('button', { name: 'Return this item: Powder Canister' }).click()
  const dialog = page.getByRole('dialog', { name: 'Return this item?' })
  await dialog.getByLabel('Reason').selectOption('Arrived damaged')
  await dialog.getByRole('button', { name: 'Request return' }).click()
  await dialog.waitFor({ state: 'hidden' })
  await card.getByText('Return requested').waitFor()
  await card.getByText('Arrived damaged', { exact: false }).waitFor()
  expect((await card.getByRole('button', { name: 'Return this item: Powder Canister' }).count()) === 0, 'return offered twice')
  await page.getByRole('link', { name: 'Returns (1)' }).click()
  await page.locator('main li').getByText('Requested', { exact: true }).waitFor()
  await page.clock.fastForward('02:05')
  await page.locator('main li').getByText('Refunded', { exact: true }).waitFor()
  await page.locator('main li').getByText('$13.51 back (simulated)', { exact: false }).waitFor()
}

// "System" shows the device's icon: phone, tablet or monitor, by media query.
FLOWS['theme toggle: System icon follows the device, live on rotation'] = async () => {
  const visibleIcon = (page) => page.getByRole('radio', { name: 'System' }).first().evaluate((b) =>
    ['phone', 'tablet', 'desktop'].filter((k) => getComputedStyle(b.querySelector(`.device-icon-${k}`)).display !== 'none'))
  const cases = [
    { device: 'phone', ctx: { isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } }, rotated: { width: 844, height: 390 } },
    { device: 'tablet', ctx: { isMobile: true, hasTouch: true, viewport: { width: 820, height: 1180 } }, rotated: { width: 1180, height: 820 } },
    { device: 'desktop', ctx: { viewport: { width: 1440, height: 900 } }, rotated: { width: 1024, height: 768 } },
  ]
  for (const { device, ctx, rotated } of cases) {
    const context = await browser.newContext(ctx)
    const page = await context.newPage()
    page.setDefaultTimeout(SCENE_TIMEOUT)
    try {
      await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
      if (ctx.viewport.width < 640) await page.getByRole('button', { name: 'Menu' }).click() // the toggle lives in the menu
      const radio = page.getByRole('radio', { name: 'System' }).first()
      await radio.waitFor()
      const before = await visibleIcon(page)
      const box = await radio.boundingBox()
      expect(before.length === 1 && before[0] === device, `${device}: showing ${before}`)
      await page.setViewportSize(rotated)
      if (ctx.viewport.width < 640) {
        // Turned sideways past sm, the menu closes and the page isn't left inert.
        // CSS hides the menu's container at once; the close follows on the media-query change.
        await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 2000 }).catch(() => {})
        expect(!(await page.evaluate(() => document.querySelector('dialog[open]'))), 'a modal is still open after rotating')
      }
      const after = await visibleIcon(page)
      expect(after.length === 1 && after[0] === device, `${device} rotated: showing ${after}`)
      if (ctx.viewport.width >= 640) {
        const box2 = await radio.boundingBox()
        expect(box.width === box2.width && box.height === box2.height, 'icon swap changed the button size')
      }
    } finally {
      await context.close()
    }
  }
}

// The tray slides up only when motion is welcome.
for (const motion of ['reduce', 'no-preference']) {
  FLOWS[`compare tray motion: ${motion}`] = async (page) => {
    await page.emulateMedia({ reducedMotion: motion })
    await page.goto(base + '/product/3', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Add to compare' }).click()
    const duration = await page.getByRole('region', { name: 'Compare' }).evaluate((t) => getComputedStyle(t).transitionDuration)
    expect(motion === 'reduce' ? duration === '0s' : duration === '0.3s', `transition-duration ${duration} with reduced motion ${motion}`)
  }
}

// Desktop: the decision card's facts are on the first screen, with no scrolling.
// (Phones put the photo first; see the next test.)
for (const [width, height] of [[1440, 900], [1024, 768]]) {
  FLOWS[`decision card above the fold at ${width}×${height}`] = Object.assign(async (page) => {
    await page.setViewportSize({ width, height })
    for (const id of [14, 1, 117]) { // longest title, flagged returns, out of stock
      await page.goto(base + `/product/${id}`, { waitUntil: 'domcontentloaded' })
      const facts = page.getByRole('region', { name: 'Price and key facts' }).locator('dl')
      await facts.waitFor()
      const bottom = await facts.evaluate((el) => el.getBoundingClientRect().bottom)
      expect(bottom <= height, `product ${id}: facts end at ${Math.round(bottom)}px, viewport is ${height}px`)
    }
  }, { width })
}

// Phones: the photo comes first below the header, then the title, then the price,
// and the price is still on the first screen.
FLOWS['phone product page: image first, price on the first screen at 390×844'] = Object.assign(async (page) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const id of [14, 1, 117, 167]) { // longest title, one photo, out of stock, six photos
    await page.goto(base + `/product/${id}`, { waitUntil: 'domcontentloaded' })
    const article = page.locator('main article')
    await article.locator('h1').waitFor()
    const m = await page.evaluate(() => {
      const box = (el) => el.getBoundingClientRect()
      const header = box(document.querySelector('header'))
      const image = box(document.querySelector('main article img').parentElement) // the photo's tile
      const title = box(document.querySelector('main article h1'))
      const price = box(document.querySelector('[aria-label="Price and key facts"] .text-3xl'))
      return { header: header.bottom, imageTop: image.top, imageHeight: image.height, tile: box(document.querySelector('main article img').parentElement).height, title: title.top, price: price.bottom }
    })
    expect(m.imageTop - m.header < 40, `product ${id}: image starts ${Math.round(m.imageTop - m.header)}px below the header`)
    expect(m.imageTop < m.title && m.title < m.price, `product ${id}: order is not image, title, price`)
    expect(m.tile >= 0.38 * 844 && m.tile <= 0.46 * 844, `product ${id}: photo tile is ${Math.round(m.tile)}px (${Math.round((m.tile / 844) * 100)}% of the height)`)
    expect(m.price <= 844, `product ${id}: price ends at ${Math.round(m.price)}px, below the first screen`)
  }
}, { width: 390, theme: 'light' })

// Phones: swipe between photos (a real touch gesture via CDP), dots follow and can be tapped.
FLOWS['phone gallery: swipe, dots, one photo at a time, no sideways page scroll'] = async () => {
  const context = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.setDefaultTimeout(SCENE_TIMEOUT)
  try {
    await page.goto(base + '/product/167', { waitUntil: 'domcontentloaded' })
    const gallery = page.getByRole('region', { name: /photos, \d of 6$/ })
    await gallery.waitFor()
    const dots = page.getByRole('list', { name: 'Choose a photo' }).getByRole('button')
    expect((await dots.count()) === 6, 'expected 6 dots')
    expect((await page.getByRole('list', { name: 'Product images' }).isVisible()) === false, 'desktop thumbnails shown on a phone')
    const layout = await gallery.evaluate((g) => ({ width: g.clientWidth, slide: g.firstElementChild.getBoundingClientRect().width, page: document.documentElement.scrollWidth }))
    expect(Math.abs(layout.slide - layout.width) < 1, `slide ${layout.slide}px vs gallery ${layout.width}px: more than one photo visible`)
    expect(layout.page <= 390, `page scrolls sideways: ${layout.page}px`)
    const settled = (i) => gallery.evaluate((g, i) => new Promise((ok, fail) => {
      const t0 = Date.now()
      const check = () => (Math.abs(g.scrollLeft - i * g.clientWidth) < 2 ? ok() : Date.now() - t0 > 3000 ? fail(new Error(`scrollLeft ${g.scrollLeft}, want ${i * g.clientWidth}`)) : setTimeout(check, 50))
      check()
    }), i)
    // A real finger swipe: raw touch events, so native scrolling and snapping do the work.
    const box = await gallery.boundingBox()
    const cdp = await context.newCDPSession(page)
    const y = Math.round(box.y + box.height / 2)
    const swipe = async (fromX, toX) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fromX, y }] })
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(fromX + ((toX - fromX) * i) / 10), y }] })
        await page.waitForTimeout(16)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    const dotPressed = (i) => page.waitForFunction((i) => document.querySelectorAll('[aria-label="Choose a photo"] button')[i].getAttribute('aria-pressed') === 'true', i)
    await swipe(Math.round(box.x + box.width * 0.85), Math.round(box.x + box.width * 0.2)) // swipe left: next photo
    await settled(1)
    await dotPressed(1)
    await swipe(Math.round(box.x + box.width * 0.2), Math.round(box.x + box.width * 0.85)) // swipe right: back
    await settled(0)
    await dotPressed(0)
    await dots.nth(3).tap()
    await settled(3)
    expect((await dots.nth(3).getAttribute('aria-pressed')) === 'true', 'tapped dot not marked')
    expect((await dots.evaluateAll((ds) => ds.filter((d) => d.getAttribute('aria-pressed') === 'true').length)) === 1, 'more than one dot marked')
    expect((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'page scrolls sideways after swiping')
    // One photo: no dots and nothing to swipe.
    await page.goto(base + '/product/1', { waitUntil: 'domcontentloaded' })
    await page.locator('main article h1').waitFor()
    expect((await page.getByRole('list', { name: 'Choose a photo' }).count()) === 0, 'dots shown for a single photo')
    expect((await page.locator('main article img').count()) === 1, 'single-photo product renders more than one photo')
  } finally {
    await context.close()
  }
}

// Every photo centered in the frame after each swipe, at real phone sizes. Heights
// include short ones (browser bars showing), where the 45dvh cap kicks in: that's
// where the tile used to shrink narrower than the slide and leave a gap on the right.
for (const [width, heights] of [[360, [640, 780]], [390, [664, 844]], [414, [715, 896]]]) {
  FLOWS[`phone gallery at ${width}px: every photo centered, snap aligned, no focus ring after a tap`] = async () => {
    for (const height of heights) {
      const context = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width, height } })
      const page = await context.newPage()
      page.setDefaultTimeout(SCENE_TIMEOUT)
      try {
        await page.goto(base + '/product/167', { waitUntil: 'domcontentloaded' })
        const gallery = page.getByRole('region', { name: /photos, \d of 6$/ })
        await gallery.waitFor()
        await gallery.scrollIntoViewIfNeeded()
        const box = await gallery.boundingBox()
        const cdp = await context.newCDPSession(page)
        const y = Math.round(box.y + box.height / 2)
        const swipeLeft = async () => {
          const [from, to] = [Math.round(box.x + box.width * 0.85), Math.round(box.x + box.width * 0.2)]
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y }] })
          for (let i = 1; i <= 10; i++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(from + ((to - from) * i) / 10), y }] })
            await page.waitForTimeout(16)
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        }
        // One surface: square, background-less slides and tiles with no gap between them,
        // inside a rounded frame that clips (isolated and composited, for iOS Safari).
        const structure = await gallery.evaluate((g) => {
          const slides = [...g.children]
          return {
            frame: (({ borderTopLeftRadius, overflowX, isolation, transform, backgroundColor }) => ({ borderTopLeftRadius, overflowX, isolation, transform, backgroundColor }))(getComputedStyle(g)),
            rounded: slides.flatMap((s) => [s, s.firstElementChild]).filter((el) => getComputedStyle(el).borderTopLeftRadius !== '0px' || getComputedStyle(el).borderBottomRightRadius !== '0px').length,
            painted: slides.flatMap((s) => [s, s.firstElementChild]).filter((el) => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)').length,
            gaps: slides.slice(1).map((s, i) => s.offsetLeft - (slides[i].offsetLeft + slides[i].offsetWidth)).filter((gap) => Math.abs(gap) > 0.5),
          }
        })
        const at0 = `${width}×${height}`
        expect(structure.rounded === 0, `${at0}: ${structure.rounded} slides/tiles still have rounded corners`)
        expect(structure.painted === 0, `${at0}: ${structure.painted} slides/tiles paint their own background`)
        expect(structure.gaps.length === 0, `${at0}: gaps between slides: ${structure.gaps}`)
        const f = structure.frame
        expect(f.borderTopLeftRadius !== '0px' && f.overflowX !== 'visible' && f.isolation === 'isolate' && f.transform !== 'none' && f.backgroundColor !== 'rgba(0, 0, 0, 0)',
          `${at0}: frame doesn't clip to its rounded tile: ${JSON.stringify(f)}`)
        for (let i = 0; i < 6; i++) {
          if (i > 0) await swipeLeft()
          const m = await gallery.evaluate((g, i) => new Promise((ok) => {
            const t0 = Date.now()
            const measure = () => {
              const frame = g.getBoundingClientRect()
              const inner = { left: frame.left + g.clientLeft, width: g.clientWidth }
              const slide = g.children[i].getBoundingClientRect()
              const tile = g.children[i].firstElementChild.getBoundingClientRect()
              const img = g.children[i].querySelector('img').getBoundingClientRect()
              return { scroll: g.scrollLeft, want: i * g.clientWidth, frameCenter: inner.left + inner.width / 2, innerWidth: inner.width, slideLeft: slide.left - inner.left, slideWidth: slide.width, tileWidth: tile.width, photoCenter: img.left + img.width / 2 }
            }
            const check = () => { const r = measure(); if (Math.abs(r.scroll - r.want) < 1 || Date.now() - t0 > 3000) ok(r); else setTimeout(check, 50) }
            check()
          }), i)
          const at = `${width}×${height}, photo ${i + 1}`
          expect(Math.abs(m.scroll - m.want) < 1, `${at}: snapped to ${m.scroll}, want ${m.want}`)
          expect(Math.abs(m.slideLeft) < 1 && Math.abs(m.slideWidth - m.innerWidth) < 1, `${at}: slide at ${m.slideLeft.toFixed(1)}, ${m.slideWidth.toFixed(1)}px wide in a ${m.innerWidth}px frame`)
          expect(Math.abs(m.tileWidth - m.innerWidth) < 1, `${at}: photo tile ${m.tileWidth.toFixed(1)}px wide in a ${m.innerWidth}px frame`)
          expect(Math.abs(m.photoCenter - m.frameCenter) <= 1, `${at}: photo center ${m.photoCenter.toFixed(1)}, frame center ${m.frameCenter.toFixed(1)}`)
        }
        // A tap (on the photo or a dot) must not leave a focus ring.
        const ringed = () => page.evaluate(() => [document.querySelector('[aria-label$=" of 6"][role=region]'), ...document.querySelectorAll('[aria-label="Choose a photo"] button')]
          .filter((el) => getComputedStyle(el).outlineStyle !== 'none' || el.matches(':focus-visible')).map((el) => el.getAttribute('aria-label')))
        await gallery.tap()
        const afterPhoto = await ringed()
        expect(afterPhoto.length === 0, `${width}×${height}: focus ring after tapping the photo: ${afterPhoto}`)
        await page.getByRole('button', { name: 'Show image 2 of 6' }).tap()
        const afterDot = await ringed()
        expect(afterDot.length === 0, `${width}×${height}: focus ring after tapping a dot: ${afterDot}`)
      } finally {
        await context.close()
      }
    }
  }
}

// Mid-swipe, pixel by pixel (dark mode, where the page and the light tile contrast):
// where two slides meet there's tile color all the way to the frame's edge (no notch,
// no seam), and the frame's own corner shows the page, so it clips to its radius.
FLOWS['phone gallery mid-swipe: one continuous surface, rounded frame clips'] = async () => {
  const context = await browser.newContext({ isMobile: true, hasTouch: true, deviceScaleFactor: 1, colorScheme: 'dark', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.setDefaultTimeout(SCENE_TIMEOUT)
  try {
    await page.goto(base + '/product/167', { waitUntil: 'domcontentloaded' })
    const gallery = page.getByRole('region', { name: /photos, \d of 6$/ })
    await gallery.waitFor()
    await page.waitForFunction(() => [...document.querySelectorAll('main article img')].slice(0, 2).every((i) => i.complete))
    const box = await gallery.boundingBox()
    const cdp = await context.newCDPSession(page)
    const y = Math.round(box.y + box.height / 2)
    const from = Math.round(box.x + box.width * 0.85)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y }] })
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(from - (box.width * 0.4 * i) / 6), y }] })
      await page.waitForTimeout(16)
    }
    await page.waitForTimeout(150) // finger still down: the swipe is held halfway
    const seam = await gallery.evaluate((g) => Math.round(g.children[1].getBoundingClientRect().left))
    expect(seam > box.x + 20 && seam < box.x + box.width - 20, `not mid-swipe: slides meet at x=${seam}`)
    const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const points = [
      ...[-2, -1, 0, 1].map((dx) => ({ name: `seam top ${dx}`, x: seam - box.x + dx, y: 1 })),
      ...[-2, -1, 0, 1].map((dx) => ({ name: `seam bottom ${dx}`, x: seam - box.x + dx, y: box.height - 2 })),
      { name: 'frame corner', x: 0, y: 0 },
    ]
    const colors = await page.evaluate(async ({ b64, points }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height })
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const hex = (v) => v.trim()
      const css = getComputedStyle(document.documentElement)
      return {
        tile: hex(css.getPropertyValue('--image-tile')),
        page: hex(css.getPropertyValue('--bg')),
        samples: points.map((p) => ({ name: p.name, rgb: [...ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data.slice(0, 3)] })),
      }
    }, { b64: shot.toString('base64'), points })
    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    const distance = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])))
    const [tile, pageBg] = [rgb(colors.tile), rgb(colors.page)]
    for (const sample of colors.samples) {
      const want = sample.name === 'frame corner' ? pageBg : tile
      expect(distance(sample.rgb, want) <= 12, `${sample.name}: rgb(${sample.rgb}) should be ${sample.name === 'frame corner' ? 'the page' : 'the tile'} ${want === tile ? colors.tile : colors.page}`)
    }
  } finally {
    await context.close()
  }
}

FLOWS['desktop gallery: thumbnails and arrow keys'] = async (page) => {
  await page.goto(base + '/product/167', { waitUntil: 'domcontentloaded' })
  const gallery = page.getByRole('region', { name: /photos, \d of 6$/ })
  await gallery.waitFor()
  const pressed = async () => (await page.getByRole('list', { name: 'Product images' }).getByRole('button').evaluateAll((bs) => bs.findIndex((b) => b.getAttribute('aria-pressed') === 'true'))) + 1
  expect((await page.getByRole('list', { name: 'Choose a photo' }).isVisible()) === false, 'phone dots shown on desktop')
  await gallery.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  expect((await pressed()) === 3, `ArrowRight twice showed image ${await pressed()}`)
  await page.getByRole('region', { name: /photos, 3 of 6$/ }).waitFor() // the region's name says where you are
  await page.keyboard.press('ArrowLeft')
  expect((await pressed()) === 2, 'ArrowLeft did not go back')
  await page.getByRole('button', { name: 'Show image 5 of 6' }).click()
  await page.keyboard.press('ArrowRight')
  expect((await pressed()) === 6, 'ArrowRight from a thumbnail did not move')
  expect(await page.getByRole('button', { name: 'Show image 6 of 6' }).evaluate((b) => b === document.activeElement), 'focus did not follow to the new thumbnail')
  await page.keyboard.press('ArrowRight')
  expect((await pressed()) === 6, 'ArrowRight past the last photo moved')
  // Arrow keys scroll smoothly, so let it land before checking which photo shows.
  const shown = await gallery.evaluate((g) => new Promise((ok) => {
    const t0 = Date.now()
    const check = () => { const i = Math.round(g.scrollLeft / g.clientWidth) + 1; if (i === 6 || Date.now() - t0 > 2000) ok(i); else setTimeout(check, 50) }
    check()
  }))
  expect(shown === 6, `photo ${shown} is showing, thumbnail 6 is marked`)
}

// Full path, home → search → product → cart → checkout → orders, in both themes.
// Screenshots of every step land in <out>/path-<variant>-<n>-<step>.png.
function pathFlow(theme, width) {
  const flow = async (page) => {
    let step = 0
    const shot = (name) => page.screenshot({ path: path.join(shotDir, `path-${theme}-${width}-${++step}-${name}.png`) })
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Plainly, home' }).waitFor()
    await shot('home')
    await page.getByRole('searchbox').fill('lipstick')
    await page.getByRole('searchbox').press('Enter')
    await page.locator('main li h2 a').first().waitFor()
    await shot('search')
    await page.locator('main li h2 a').first().click()
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.getByRole('region', { name: 'Cart update' }).getByText('1 added to your cart').waitFor()
    await shot('product')
    await page.getByRole('region', { name: 'Cart update' }).getByRole('button', { name: 'Close' }).click()
    await page.getByRole('link', { name: /^Cart, 1 item/ }).click()
    await page.getByRole('link', { name: 'Go to checkout' }).waitFor()
    await shot('cart')
    await page.getByRole('link', { name: 'Go to checkout' }).click()
    await page.getByRole('heading', { name: 'Checkout' }).waitFor()
    await page.getByLabel('Full name').fill('Grace Hopper')
    await page.getByLabel('Street address').fill('200 Navy Way')
    await page.getByLabel('City').fill('Arlington')
    await page.getByLabel('State or region').fill('VA')
    await page.getByLabel('ZIP or postal code').fill('22201')
    await shot('checkout')
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.getByRole('heading', { name: 'Order placed' }).waitFor()
    await shot('confirmation')
    if (width < 640) await page.getByRole('button', { name: 'Menu' }).click() // Orders lives in the menu on phones
    await page.getByRole('link', { name: 'Orders', exact: true }).click()
    await page.getByRole('heading', { name: 'Your orders' }).waitFor()
    await shot('orders')
    await page.getByRole('link', { name: 'Plainly, home' }).click()
    await page.waitForURL(base + '/')
  }
  return Object.assign(flow, { theme, width })
}
FLOWS['full path light 1440'] = pathFlow('light', 1440)
FLOWS['full path dark 1440'] = pathFlow('dark', 1440)
FLOWS['full path dark 390'] = pathFlow('dark', 390)

if (smoke) for (const name of Object.keys(FLOWS)) delete FLOWS[name]
if (only) for (const name of Object.keys(FLOWS)) if (!name.includes(only)) delete FLOWS[name]
log(`\nFlows: ${Object.keys(FLOWS).length}`)
await pool(Object.entries(FLOWS), async ([name, fn]) => {
  const t0 = Date.now()
  // The error-boundary flow blocks the API on purpose, so its console errors are expected.
  const { ctx, page } = await newPage(fn.theme ?? 'light', fn.width ?? 1440, { allowErrors: name.startsWith('error') })
  try {
    await withTimeout(fn(page), SCENE_TIMEOUT, name)
    report.flows.push(`PASS ${name}`)
    log(`✓ ${name}  ${Date.now() - t0}ms`)
  } catch (e) {
    report.flows.push(`FAIL ${name}: ${e.message.split('\n')[0]}`)
    log(`✗ ${name}  ${Date.now() - t0}ms  ${e.message.split('\n')[0]}`)
    await page.screenshot({ path: path.join(shotDir, `FAIL-${name.replace(/\W+/g, '-')}.png`) }).catch(() => {})
  } finally {
    await ctx.close().catch(() => {})
  }
})

clearTimeout(budgetTimer)
await browser.close()
finish('DONE')
