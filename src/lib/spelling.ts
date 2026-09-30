import type { Product } from './catalog'
import { INTENT_WORDS, interpretQuery, type QueryIntent } from './queryIntent'
import { searchProducts } from './search'

// Typo tolerance, entirely in the browser. It only runs when the query as typed
// finds nothing, so exact queries are never mixed with loose matches. Then each
// word that doesn't start any real word in the catalog (descriptions included) is
// swapped for the closest word from the catalog's titles, brands and categories
// (plus the category synonyms), within a small edit distance. A substring hit
// inside some description ("aple" in "maple") doesn't make a typo a real word.
// The page always says when this happened.

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)
}

interface Vocabulary {
  /** Correction candidates → how many products use them, so a tie goes to the more common word. */
  candidates: Map<string, number>
  /** Every word in the catalog, descriptions included, to tell real words from typos. */
  known: string[]
}

const vocabularies = new WeakMap<Product[], Vocabulary>()

function vocabulary(catalog: Product[]): Vocabulary {
  const cached = vocabularies.get(catalog)
  if (cached) return cached
  const candidates = new Map<string, number>()
  const known = new Set<string>()
  for (const p of catalog) {
    for (const w of new Set(words(`${p.title} ${p.brand ?? ''} ${p.category}`))) candidates.set(w, (candidates.get(w) ?? 0) + 1)
    words(p.description).forEach((w) => known.add(w))
  }
  for (const w of INTENT_WORDS.flatMap(words)) if (!candidates.has(w)) candidates.set(w, 1)
  const result = { candidates, known: [...known, ...candidates.keys()] }
  vocabularies.set(catalog, result)
  return result
}

function isKnown(word: string, vocab: Vocabulary): boolean {
  return vocab.known.some((w) => w.startsWith(word))
}

/** Edit distance counting a swap of two neighbours as one edit ("iphnoe" → "iphone"). */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      rowMin = Math.min(rowMin, d[i][j])
    }
    if (rowMin > max) return max + 1
  }
  return d[a.length][b.length]
}

// Short words are too ambiguous to correct. One edit up to 5 letters, two from 6,
// and a two-edit fix must keep the first letter.
function closestWord(word: string, vocab: Map<string, number>): string | undefined {
  if (word.length < 4) return undefined
  const max = word.length >= 6 ? 2 : 1
  let best: { word: string; distance: number; count: number } | undefined
  for (const [candidate, count] of vocab) {
    const distance = editDistance(word, candidate, max)
    if (distance > max || (distance === 2 && candidate[0] !== word[0])) continue
    const better =
      !best || distance < best.distance || (distance === best.distance && (count > best.count || (count === best.count && candidate < best.word)))
    if (better) best = { word: candidate, distance, count }
  }
  return best?.word
}

export interface ResolvedQuery {
  /** The query actually searched: the typed one, or its correction. */
  text: string
  /** Set when the typed query found nothing and a corrected one is used instead. */
  corrected?: string
  /** Set when the (corrected) query names a category; see queryIntent.ts. */
  intent?: QueryIntent
}

/** `literal` means "take my words as typed": no category matching, no correction. */
export function resolveQuery(query: string, literal: boolean, catalog: Product[]): ResolvedQuery {
  if (!query || literal) return { text: query }
  const intent = interpretQuery(query)
  if (intent) return { text: query, intent }
  if (searchProducts(catalog, query).length > 0) return { text: query }

  const vocab = vocabulary(catalog)
  const fixed = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (isKnown(w, vocab) ? w : (closestWord(w.replace(/[^a-z0-9]/g, ''), vocab.candidates) ?? w)))
    .join(' ')
  if (fixed === query.toLowerCase()) return { text: query }
  const fixedIntent = interpretQuery(fixed)
  if (!fixedIntent && searchProducts(catalog, fixed).length === 0) return { text: query }
  return { text: fixed, corrected: fixed, intent: fixedIntent }
}
