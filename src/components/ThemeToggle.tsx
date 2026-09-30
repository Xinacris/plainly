import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useTheme, type ThemeChoice } from '../theme/theme'

function Icon({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`col-start-1 row-start-1 size-4 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// Three icons stacked in one cell; CSS in index.css shows the one for this device.
function SystemIcon() {
  return (
    <span className="grid">
      <Icon className="device-icon device-icon-desktop">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </Icon>
      <Icon className="device-icon device-icon-tablet">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M11 18h2" />
      </Icon>
      <Icon className="device-icon device-icon-phone">
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M11 18h2" />
      </Icon>
    </span>
  )
}

const options: { value: ThemeChoice; label: string; icon: ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </Icon>
    ),
  },
  { value: 'dark', label: 'Dark', icon: <Icon><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></Icon> },
  { value: 'system', label: 'System', icon: <SystemIcon /> },
]

// A radio group by the ARIA pattern: one Tab stop (the checked option), and the
// arrow keys move and select, wrapping around. `labelled` shows the names next to
// the icons, for the mobile menu; the header shows icons only, named by aria-label.
export function ThemeToggle({ labelled = false }: { labelled?: boolean }) {
  const choice = useTheme((s) => s.choice)
  const setChoice = useTheme((s) => s.setChoice)
  const group = useRef<HTMLDivElement>(null)

  const onKeyDown = (e: KeyboardEvent) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    const step = steps[e.key]
    if (!step) return
    e.preventDefault()
    const index = options.findIndex((o) => o.value === choice)
    const next = (index + step + options.length) % options.length
    setChoice(options[next].value)
    group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }

  const groupClass = labelled
    ? 'grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1'
    : 'flex rounded-full border border-border bg-surface p-0.5'
  const buttonShape = labelled ? 'flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium' : 'grid size-8 place-items-center rounded-full'

  return (
    <div ref={group} role="radiogroup" aria-label="Theme" onKeyDown={onKeyDown} className={groupClass}>
      {options.map((o) => {
        const checked = choice === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            aria-label={labelled ? undefined : o.label}
            title={labelled ? undefined : o.label}
            onClick={() => setChoice(o.value)}
            className={`${buttonShape} transition-colors ${checked ? 'bg-action text-on-action' : 'text-muted hover:text-text'}`}
          >
            {o.icon}
            {labelled && o.label}
          </button>
        )
      })}
    </div>
  )
}
