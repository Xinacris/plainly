// Delivery estimates. DummyJSON's `shippingInformation` says when an item *ships*
// ("Ships in 1-2 business days"), not when it arrives, so an estimate is:
//   ship window (from the data) + TRANSIT (Plainly's stated assumption).
// Every estimate is labeled as an estimate wherever it's shown.

type Unit = 'business' | 'calendar'

interface Window {
  min: number
  max: number
  unit: Unit
}

// Transit time isn't in the data. This assumption is shown on the checkout page.
export const TRANSIT: Window = { min: 2, max: 5, unit: 'business' }

// The six phrasings in the catalog. Anything else gets no estimate rather than a guess.
const SHIP_WINDOWS: Record<string, Window> = {
  'Ships overnight': { min: 1, max: 1, unit: 'business' },
  'Ships in 1-2 business days': { min: 1, max: 2, unit: 'business' },
  'Ships in 3-5 business days': { min: 3, max: 5, unit: 'business' },
  'Ships in 1 week': { min: 7, max: 7, unit: 'calendar' },
  'Ships in 2 weeks': { min: 14, max: 14, unit: 'calendar' },
  'Ships in 1 month': { min: 30, max: 30, unit: 'calendar' },
}

/** A date range as local calendar dates, "YYYY-MM-DD". Strings so they persist cleanly. */
export interface Estimate {
  earliest: string
  latest: string
}

function addDays(date: Date, days: number, unit: Unit): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (unit === 'calendar') {
    next.setDate(next.getDate() + days)
    return next
  }
  let left = days
  while (left > 0) {
    next.setDate(next.getDate() + 1)
    const day = next.getDay()
    if (day !== 0 && day !== 6) left--
  }
  return next
}

function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function estimateDelivery(shippingInformation: string, from: Date = new Date()): Estimate | undefined {
  const ship = SHIP_WINDOWS[shippingInformation]
  if (!ship) return undefined
  const earliest = addDays(addDays(from, ship.min, ship.unit), TRANSIT.min, TRANSIT.unit)
  const latest = addDays(addDays(from, ship.max, ship.unit), TRANSIT.max, TRANSIT.unit)
  return { earliest: toIsoDate(earliest), latest: toIsoDate(latest) }
}

/** The date by which every estimated item should have arrived. */
export function latestArrival(estimates: (Estimate | undefined)[]): string | undefined {
  const known = estimates.filter((e): e is Estimate => e !== undefined).map((e) => e.latest)
  return known.length ? known.sort().at(-1) : undefined
}

const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return dateFormat.format(new Date(y, m - 1, d))
}
