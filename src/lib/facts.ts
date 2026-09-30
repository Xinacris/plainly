// Turns DummyJSON's policy strings into short facts for the decision card.
// Anything that doesn't match a known phrasing is shown exactly as written.

export interface Fact {
  text: string
  /** True when the fact counts against buying, e.g. no returns. */
  flagged: boolean
}

export function returnFact(policy: string): Fact {
  if (policy === 'No return policy') return { text: 'No returns', flagged: true }
  const days = returnDays(policy)
  return { text: days ? `${days}-day returns` : policy, flagged: false }
}

export function warrantyFact(warranty: string): Fact {
  if (warranty === 'No warranty') return { text: 'None', flagged: false }
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
