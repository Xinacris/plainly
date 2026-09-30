import { create } from 'zustand'

// The language: English or Turkish. The first visit follows the browser's preferred
// languages (the first of them Plainly has), falling back to English; a choice made
// in the picker is remembered in this browser. <html lang> always matches.
export type Locale = 'en' | 'tr'

export const LOCALES: Locale[] = ['en', 'tr']
const KEY = 'plainly-locale'
const TAGS: Record<Locale, string> = { en: 'en-US', tr: 'tr-TR' }

function fromBrowser(): Locale {
  const preferred = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const language of preferred) {
    const base = language?.toLowerCase().split('-')[0]
    if (base === 'en' || base === 'tr') return base
  }
  return 'en'
}

function initial(): Locale {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'tr') return saved
  } catch {
    // No storage: follow the browser every time.
  }
  return fromBrowser()
}

export const useLocale = create<{ locale: Locale }>(() => ({ locale: initial() }))

export const currentLocale = (): Locale => useLocale.getState().locale
/** The BCP 47 tag for Intl: prices, dates and plurals. */
export const localeTag = (): string => TAGS[currentLocale()]

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(KEY, locale)
  } catch {
    // Kept for this visit only.
  }
}

// Intl objects are cached per locale and options.
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.PluralRules>()
function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.PluralRules>(kind: string, options: object, make: (tag: string) => T): T {
  const tag = localeTag()
  const key = `${kind}|${tag}|${JSON.stringify(options)}`
  let value = cache.get(key) as T | undefined
  if (!value) {
    value = make(tag)
    cache.set(key, value)
  }
  return value
}

/** Plural forms by CLDR category; "#" is replaced by the formatted count. */
export interface PluralForms {
  one: string
  other: string
}

export function plural(count: number, forms: PluralForms): string {
  const rules = cached('plural', {}, (tag) => new Intl.PluralRules(tag))
  const form = rules.select(count) === 'one' ? forms.one : forms.other
  return form.replace('#', formatNumber(count))
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return cached('number', options, (tag) => new Intl.NumberFormat(tag, options)).format(value)
}

/** Prices stay in US dollars; only the formatting follows the language. */
export function formatPrice(amount: number): string {
  return formatNumber(amount, { style: 'currency', currency: 'USD' })
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return cached('date', options, (tag) => new Intl.DateTimeFormat(tag, options)).format(date)
}
