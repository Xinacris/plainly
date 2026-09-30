import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// A small modal <dialog>, by the same overlay rules as the sheets: focus stays
// inside, Escape cancels, and focus returns to whatever opened it. Cancel gets the
// initial focus, because confirming here is the step that throws something away.
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const confirmed = useRef(false)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null
      confirmed.current = false
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (confirmed.current) onConfirm()
        else onCancel()
        opener.current?.focus()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-surface p-5 text-text backdrop:bg-black/50"
    >
      <h2 id={titleId} className="text-lg font-bold tracking-tight">
        {title}
      </h2>
      <div className="mt-2 text-sm">{children}</div>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          autoFocus
          onClick={() => ref.current?.close()}
          className="inline-flex h-11 items-center rounded-lg border border-border-strong px-4 font-semibold hover:border-action hover:text-action"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            confirmed.current = true
            ref.current?.close()
          }}
          className="inline-flex h-11 items-center rounded-lg bg-action px-4 font-semibold text-on-action hover:bg-action-hover"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
