import { useRef, type KeyboardEvent } from 'react'
import { useTheme, type ThemeChoice } from '../theme/theme'

const options: { value: ThemeChoice; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light theme',
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    value: 'dark',
    label: 'Dark theme',
    icon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  },
  {
    value: 'system',
    label: 'Match system theme',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  },
]

// A radio group by the ARIA pattern: one Tab stop (the checked option), and the
// arrow keys move and select, wrapping around.
export function ThemeToggle() {
  const choice = useTheme((s) => s.choice)
  const setChoice = useTheme((s) => s.setChoice)
  const group = useRef<HTMLDivElement>(null)

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const index = options.findIndex((o) => o.value === choice)
    const next = (index + step + options.length) % options.length
    setChoice(options[next].value)
    group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div ref={group} role="radiogroup" aria-label="Theme" onKeyDown={onKeyDown} className="flex rounded-full border border-border bg-surface p-0.5">
      {options.map((o) => {
        const checked = choice === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            aria-label={o.label}
            title={o.label}
            onClick={() => setChoice(o.value)}
            className={`grid size-8 place-items-center rounded-full transition-colors ${
              checked ? 'bg-action text-on-action' : 'text-muted hover:text-text'
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {o.icon}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
