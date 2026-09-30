// Turns DummyJSON's policy strings into short facts for the decision card.
// Anything that doesn't match a known phrasing is shown exactly as written.

export interface Fact {
  text: string
  /** True when the fact counts against buying, e.g. no returns. */
  flagged: boolean
}

export function returnFact(policy: string): Fact {
  if (policy === 'No return policy') return { text: 'No returns', flagged: true }
  const days = policy.match(/^(\d+) days? return policy$/)?.[1]
  return { text: days ? `${days}-day returns` : policy, flagged: false }
}

export function warrantyFact(warranty: string): Fact {
  if (warranty === 'No warranty') return { text: 'None', flagged: false }
  return { text: warranty.replace(/ warranty$/, ''), flagged: false }
}
