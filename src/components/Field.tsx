import { useId, type InputHTMLAttributes } from 'react'

// A labelled text input with an optional hint, used by the account pages.
const input = 'h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-text'

export function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={input} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
