import { en, type Messages } from './en'
import { tr } from './tr'
import { currentLocale, saveLocale, useLocale, type Locale } from './state'

export * from './state'
export type { Messages }

const CATALOGS: Record<Locale, Messages> = { en, tr }

/**
 * The current language's messages. A live binding: switching language replaces it
 * and remounts the app (see main.tsx), so every string and format is read again.
 */
export let t: Messages = CATALOGS[currentLocale()]

function applyLang(locale: Locale) {
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}
applyLang(currentLocale())

export function setLocale(locale: Locale): void {
  if (locale === currentLocale()) return
  saveLocale(locale)
  t = CATALOGS[locale]
  applyLang(locale)
  useLocale.setState({ locale })
}
