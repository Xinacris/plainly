import { t } from '../i18n'

// Turns DummyJSON's policy strings into short facts for the decision card, in the
// current language. Anything that doesn't match a known phrasing is shown exactly as
// written (in English, like the rest of the product data).

export interface Fact {
  text: string
  /** True when the fact counts against buying, e.g. no returns. */
  flagged: boolean
}

export function returnFact(policy: string): Fact {
  if (policy === 'No return policy') return { text: t.facts.noReturns, flagged: true }
  const days = returnDays(policy)
  return { text: days ? t.facts.returnDays(days) : policy, flagged: false }
}

export function warrantyFact(warranty: string): Fact {
  if (warranty === 'No warranty') return { text: t.facts.noWarranty, flagged: false }
  if (warranty === 'Lifetime warranty') return { text: t.facts.lifetime, flagged: false }
  const period = warranty.match(/^(\d+) (week|month|year)s? warranty$/)
  if (period) return { text: t.facts.warrantyPeriod(Number(period[1]), period[2] as 'week' | 'month' | 'year'), flagged: false }
  return { text: warranty.replace(/ warranty$/, ''), flagged: false }
}

export type ReturnWindow =
  | { kind: 'none' }
  | { kind: 'open'; lastDay: Date; days: number }
  | { kind: 'closed'; lastDay: Date; days: number }
  | { kind: 'unknown' }

export function returnDays(policy: string): number | undefined {
  const days = policy.match(/^(\d+) days? return policy$/)?.[1]
  return days ? Number(days) : undefined
}

// The window is counted from the order date, and stays open through its last day.
export function returnWindow(policy: string, placedAt: string, now: Date = new Date()): ReturnWindow {
  if (policy === 'No return policy') return { kind: 'none' }
  const days = returnDays(policy)
  if (days === undefined) return { kind: 'unknown' }
  const placed = new Date(placedAt)
  const lastDay = new Date(placed.getFullYear(), placed.getMonth(), placed.getDate() + days)
  const endOfLastDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1)
  return { kind: now < endOfLastDay ? 'open' : 'closed', lastDay, days }
}
