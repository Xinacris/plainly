import { tr } from '../i18n/tr'
import { DEPARTMENTS, departmentName, findDepartment } from './departments'
import { formatCategory } from './format'

// Search that understands categories. When the whole query names a category, a
// department, or a common synonym ("tee", "phone", "perfume"), search applies
// that category instead of matching the words as text, and the page shows it as
// a removable chip. Only whole-query matches count: "phone case" stays a text
// search, because "phone" there means an accessory, not a smartphone.

export interface QueryIntent {
  /** What the chip says, in the current language, e.g. "Smartphones" or "Tops, Mens shirts". */
  label: string
  categories: string[]
}

interface Term {
  categories: string[]
  /** Set when the term names a whole department, so the chip says its name. */
  department?: string
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
  // Turkish. Diacritics are folded before matching, so "tisort" finds "tişört" too.
  [['telefon', 'telefonlar', 'cep telefonu', 'akıllı telefon'], ['smartphones']],
  [['tişört', 'tişörtler', 'gömlek', 'gömlekler'], ['mens-shirts']],
  [['parfüm', 'parfümler'], ['fragrances']],
  [['dizüstü', 'dizüstü bilgisayar', 'dizüstü bilgisayarlar'], ['laptops']],
]

/**
 * Lowercase and without diacritics, so Turkish letters match with or without them:
 * "Tişört" and "tisort" both become "tisort", "DİZÜSTÜ" becomes "dizustu".
 */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
}

// "Dresses" → "dress", "watches" → "watch", "accessories" → "accessory", "shoes" → "shoe".
function singular(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (/(ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

export function normalizeTerm(text: string): string {
  return fold(text)
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .join(' ')
}

// Names count in both languages, whichever is showing: "smartphones" and "akıllı
// telefonlar" find the same category.
function buildTerms(): Map<string, Term> {
  const terms = new Map<string, Term>()
  const add = (term: string, value: Term) => terms.set(normalizeTerm(term), value)
  for (const [words, categories] of SYNONYMS) words.forEach((w) => add(w, { categories }))
  for (const d of DEPARTMENTS) {
    for (const c of d.categories) {
      add(c, { categories: [c] })
      if (tr.categories[c]) add(tr.categories[c], { categories: [c] })
    }
  }
  // Departments last, so "beauty" means the whole Beauty department, not just its first category.
  for (const d of DEPARTMENTS) {
    add(d.name, { categories: d.categories, department: d.slug })
    add(tr.departments[d.slug], { categories: d.categories, department: d.slug })
  }
  return terms
}

const TERMS = buildTerms()

/** Every synonym and name above, for the spelling correction's vocabulary. */
export const INTENT_WORDS: string[] = [
  ...SYNONYMS.flatMap(([words]) => words),
  ...DEPARTMENTS.flatMap((d) => [d.name, tr.departments[d.slug], ...d.categories, ...d.categories.map((c) => tr.categories[c] ?? '')]),
]

export function interpretQuery(query: string): QueryIntent | undefined {
  const term = TERMS.get(normalizeTerm(query))
  if (!term) return undefined
  const department = findDepartment(term.department)
  const label = department ? departmentName(department) : term.categories.map(formatCategory).join(', ')
  return { label, categories: term.categories }
}
