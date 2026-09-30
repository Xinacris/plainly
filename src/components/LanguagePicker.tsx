import { useEffect, useRef, type KeyboardEvent } from 'react'
import { LOCALES, setLocale, t, useLocale, type Locale } from '../i18n'
import { markSwitch, takeRefocus } from '../i18n/switching'

// Each language is named in itself, so it's findable whatever is showing.
const NAMES: Record<Locale, string> = { en: 'English', tr: 'Türkçe' }
const SHORT: Record<Locale, string> = { en: 'EN', tr: 'TR' }

// A radio group by the ARIA pattern, like the theme toggle: one Tab stop, arrow keys
// move and select. `labelled` shows full names, for the phone menu; the header shows
// EN / TR with the full names as accessible names.
export function LanguagePicker({ labelled = false }: { labelled?: boolean }) {
  const locale = useLocale((s) => s.locale)
  const group = useRef<HTMLDivElement>(null)
  const variant = labelled ? 'labelled' : 'compact'

  // After a switch, the picker that was used takes focus back (see i18n/switching.ts).
  useEffect(() => {
    if (takeRefocus(variant)) group.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
  }, [variant])

  const choose = (next: Locale) => {
    if (next === locale) return
    markSwitch(variant)
    setLocale(next)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    const step = steps[e.key]
    if (!step) return
    e.preventDefault()
    const index = LOCALES.indexOf(locale)
    choose(LOCALES[(index + step + LOCALES.length) % LOCALES.length])
  }

  const groupClass = labelled
    ? 'grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1'
    : 'flex rounded-full border border-border bg-surface p-0.5'
  const buttonShape = labelled ? 'flex h-11 items-center justify-center rounded-lg text-sm font-medium' : 'grid h-8 min-w-8 place-items-center rounded-full px-1.5 text-xs font-bold'

  return (
    <div ref={group} role="radiogroup" aria-label={t.language.label} onKeyDown={onKeyDown} className={groupClass}>
      {LOCALES.map((l) => {
        const checked = l === locale
        return (
          <button
            key={l}
            type="button"
            role="radio"
            lang={l}
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            aria-label={labelled ? undefined : NAMES[l]}
            title={labelled ? undefined : NAMES[l]}
            onClick={() => choose(l)}
            className={`${buttonShape} transition-colors ${checked ? 'bg-action text-on-action' : 'text-muted hover:text-text'}`}
          >
            {labelled ? NAMES[l] : SHORT[l]}
          </button>
        )
      })}
    </div>
  )
}
