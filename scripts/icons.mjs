// Renders the PNG favicon fallbacks from public/favicon.svg, plus a 16/32 px
// legibility sheet in both color schemes for review.
//
//   node scripts/icons.mjs [--sheet=path.png]
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const svg = fs.readFileSync('public/favicon.svg', 'utf8')
const sheetArg = process.argv.find((a) => a.startsWith('--sheet='))?.split('=')[1]

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const cache = path.join(process.env.HOME, '.cache/ms-playwright')
  const dir = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().at(-1)
  const sub = fs.readdirSync(path.join(cache, dir)).find((d) => d.startsWith('chrome-'))
  return path.join(cache, dir, sub, 'chrome')
}

const browser = await chromium.launch({ executablePath: chromiumPath() })
const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`

async function render(file, size, { padding = 0, background = 'transparent', scheme = 'light' } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, colorScheme: scheme })
  const inner = size - padding * 2
  await page.setContent(
    `<body style="margin:0;background:${background};display:grid;place-items:center;height:${size}px">` +
      `<img src="${dataUrl}" width="${inner}" height="${inner}"></body>`,
  )
  await page.screenshot({ path: file, omitBackground: background === 'transparent' })
  await page.close()
}

// Browser-tab fallback: the mark alone, transparent. Apple touch icons must be
// opaque, so that one sits on the light page background with some padding.
await render('public/favicon-32.png', 32)
await render('public/apple-touch-icon.png', 180, { padding: 28, background: '#f8f7f3' })

if (sheetArg) {
  // Actual-size 16 and 32 px icons on typical tab colors, then scaled up 8x
  // (pixelated) so the rasterized result can be inspected.
  const tile = (scheme, bg) =>
    `<div style="background:${bg};padding:12px;display:flex;gap:12px;align-items:center;color-scheme:${scheme}">` +
    `<img src="${dataUrl}" width="16" height="16"><img src="${dataUrl}" width="32" height="32"></div>`
  const page = await browser.newPage({ viewport: { width: 200, height: 140 } })
  await page.setContent(`<body style="margin:0">${tile('light', '#ffffff')}${tile('dark', '#202124')}</body>`)
  const light = await page.screenshot({ clip: { x: 0, y: 0, width: 80, height: 56 } })
  await page.emulateMedia({ colorScheme: 'dark' })
  const dark = await page.screenshot({ clip: { x: 0, y: 56, width: 80, height: 56 } })
  const zoom = await browser.newPage({ viewport: { width: 640, height: 900 } })
  const b64 = (buf) => `data:image/png;base64,${buf.toString('base64')}`
  await zoom.setContent(
    `<body style="margin:0;image-rendering:pixelated"><img src="${b64(light)}" width="640"><img src="${b64(dark)}" width="640"></body>`,
  )
  await zoom.screenshot({ path: sheetArg, fullPage: true })
}

await browser.close()
