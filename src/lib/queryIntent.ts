import { DEPARTMENTS } from './departments'
import { formatCategory } from './format'

// Search that understands categories. When the whole query names a category, a
// department, or a common synonym ("tee", "phone", "perfume"), search applies
// that category instead of matching the words as text, and the page shows it as
// a removable chip. Only whole-query matches count: "phone case" stays a text
// search, because "phone" there means an accessory, not a smartphone.

export interface QueryIntent {
  /** What the chip says, e.g. "Smartphones" or "Tops, Mens shirts". */
  label: string
  categories: string[]
}

const SYNONYMS: [string[], string[]][] = [
  // DummyJSON's "tops" holds only frocks and dresses; every shirt is in mens-shirts.
  // Mapping "t-shirt" to tops too would answer it with dresses.
  [['t shirt', 'tshirt', 'tee', 'shirt'], ['mens-shirts']],
  [['phone', 'mobile phone', 'cell phone', 'cellphone'], ['smartphones']],
  [['perfume', 'cologne'], ['fragrances']],
  [['notebook'], ['laptops']],
  [['shoe', 'sneaker'], ['mens-shoes', 'womens-shoes']],
  [['watch'], ['mens-watches', 'womens-watches']],
  [['bag', 'handbag', 'purse'], ['womens-bags']],
  [['dress'], ['womens-dresses']],
  [['jewelry', 'jewellery'], ['womens-jewellery']],
  [['makeup', 'make up', 'cosmetic'], ['beauty']],
  [['skincare'], ['skin-care']],
  [['car'], ['vehicle']],
  [['motorbike'], ['motorcycle']],
  [['shades'], ['sunglasses']],
  [['food', 'grocery'], ['groceries']],
  [['decor', 'home decor'], ['home-decoration']],
  [['kitchen'], ['kitchen-accessories']],
]

// "Dresses" → "dress", "watches" → "watch", "accessories" → "accessory", "shoes" → "shoe".
function singular(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (/(ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

export function normalizeTerm(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .join(' ')
}

function buildTerms(): Map<string, QueryIntent> {
  const terms = new Map<string, QueryIntent>()
  const add = (term: string, intent: QueryIntent) => terms.set(normalizeTerm(term), intent)
  const label = (categories: string[]) => categories.map(formatCategory).join(', ')
  for (const [words, categories] of SYNONYMS) words.forEach((w) => add(w, { label: label(categories), categories }))
  for (const d of DEPARTMENTS) {
    for (const c of d.categories) add(c, { label: formatCategory(c), categories: [c] })
  }
  // Departments last, so "beauty" means the whole Beauty department, not just its first category.
  for (const d of DEPARTMENTS) add(d.name, { label: d.name, categories: d.categories })
  return terms
}

const TERMS = buildTerms()

/** Every synonym and name above, for the spelling correction's vocabulary. */
export const INTENT_WORDS: string[] = [
  ...SYNONYMS.flatMap(([words]) => words),
  ...DEPARTMENTS.flatMap((d) => [d.name, ...d.categories]),
]

export function interpretQuery(query: string): QueryIntent | undefined {
  return TERMS.get(normalizeTerm(query))
}
