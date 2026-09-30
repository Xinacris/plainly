// Layout + flow verification for Plainly.
//
//   node scripts/verify.mjs [baseUrl] [--changed=home,search,...] [--out=dir]
//
// Pages listed in --changed (or all pages with --changed=all) get the full matrix:
// 1440 / 1024 / 390 px in light and dark. Every other page gets a quick check at
// 1440 (light) and 390 (dark). Each scene waits for DOMContentLoaded plus a selector
// for its main content (never networkidle), has a 15 s limit, and the whole run has
// a 2-minute budget. Failures are logged and the run moves on.
//
// Needs a Chromium binary: CHROMIUM_PATH, or the Playwright cache in ~/.cache/ms-playwright.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const base = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173'
const shotDir = flag('out') ?? 'verify-shots'
const changedArg = flag('changed') ?? ''
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

// `page` groups scenes for --changed; `ready` is the selector that proves main content rendered.
const SCENES = [
  { name: 'home', page: 'home', url: '/', ready: 'main a:has-text("Browse all")' },
  { name: 'search-all', page: 'search', url: '/search', ready: 'main li h2 a' },
  { name: 'search-phone', page: 'search', url: '/search?q=phone', ready: 'main li h2 a' },
  { name: 'search-none', page: 'search', url: '/search?q=xyzzy', ready: 'main h1:has-text("No products match")' },
  { name: 'product-1', page: 'product', url: '/product/1', ready: 'main article h1' },
  { name: 'product-167-gallery', page: 'product', url: '/product/167', ready: 'main article h1' },
  { name: 'product-117-oos', page: 'product', url: '/product/117', ready: 'main article h1' },
  { name: 'product-9999', page: 'product', url: '/product/9999', ready: 'main h1:has-text("Product not found")' },
  { name: 'cart-empty', page: 'cart', url: '/cart', ready: 'main h1:has-text("Your cart is empty")' },
  { name: 'cart-items', page: 'cart', url: '/cart', cart: CART, ready: 'main aside[aria-label="Order summary"]' },
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
    return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 1 && r.height > 1 && !el.closest('.sr-only')
  }
  if (document.documentElement.scrollWidth > innerWidth) issues.push(`horizontal scroll: ${document.documentElement.scrollWidth} > ${innerWidth}`)

  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
  const textEls = [...document.body.querySelectorAll('*')].filter((el) => hasOwnText(el) && visible(el))

  for (const el of textEls) {
    const r = el.getBoundingClientRect()
    if (r.right > innerWidth + 1 || r.left < -1) issues.push(`off-screen: ${describe(el)}`)
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a)
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const ar = a.getBoundingClientRect()
        if (r.right > ar.right + 1 || r.bottom > ar.bottom + 1) issues.push(`clipped: ${describe(el)}`)
        break
      }
    }
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') issues.push(`truncated: ${describe(el)}`)
  }

  const boxes = [...document.body.querySelectorAll('img, button, input, select, a, h1, h2, h3, p, output, label')]
    .filter(visible)
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const { el: a, r: ra } = boxes[i], { el: b, r: rb } = boxes[j]
      if (ra.bottom <= rb.top || rb.bottom <= ra.top || ra.right <= rb.left || rb.right <= ra.left) continue
      if (a.contains(b) || b.contains(a)) continue
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

async function newPage(theme, width, cart, { allowErrors = false } = {}) {
  const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } })
  if (cart) await ctx.addInitScript((s) => localStorage.setItem('plainly-cart', s), cart)
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
  const { ctx, page } = await newPage(theme, width, scene.cart)
  try {
    await withTimeout(
      (async () => {
        await page.goto(base + scene.url, { waitUntil: 'domcontentloaded' })
        await page.locator(scene.ready).first().waitFor()
        // Give visible images a moment to paint for the screenshot, but never block on them.
        await withTimeout(page.evaluate(() => Promise.all([...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight).map((i) => i.decode().catch(() => {})))), 3000, 'images').catch(() => {})
        const issues = await page.evaluate(audit)
        if (issues.length) report.layout[label] = issues
        await page.screenshot({ path: path.join(shotDir, `${scene.name}-${theme}-${width}.png`), fullPage: true })
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

// 1. Layout audit.
const jobs = SCENES.flatMap((scene) => (changed.has(scene.page) ? FULL : QUICK).map((v) => ({ scene, ...v })))
log(`Layout: ${jobs.length} scenes (full matrix for: ${[...changed].join(', ') || 'none'})`)
await pool(jobs, runScene)

// 2. Flows (light, desktop), also bounded and parallel.
const expect = (cond, msg) => { if (!cond) throw new Error(msg) }
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
    expect((await page.locator('main li').count()) === 24, 'first page is not 24')
    await page.getByRole('button', { name: /Show 24 more/ }).click()
    expect((await page.locator('main li').count()) === 48, 'show more did not add 24')
  },
  'add to cart, header count, persistence, stepper, remove': async (page) => {
    await page.goto(base + '/product/14', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Quantity').selectOption('2')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.getByText('Added 2 to your cart.').waitFor()
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
    await page.getByText('You have the most you can buy (4) in your cart.').waitFor()
    expect((await page.getByRole('button', { name: 'Add to cart' }).count()) === 0, 'add button still shown at cap')
  },
  'out of stock has no add button': async (page) => {
    await page.goto(base + '/product/117', { waitUntil: 'domcontentloaded' })
    await page.getByText('Out of stock').waitFor()
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
}

log(`\nFlows: ${Object.keys(FLOWS).length}`)
await pool(Object.entries(FLOWS), async ([name, fn]) => {
  const t0 = Date.now()
  // The error-boundary flow blocks the API on purpose, so its console errors are expected.
  const { ctx, page } = await newPage('light', 1440, undefined, { allowErrors: name.startsWith('error boundary') })
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
