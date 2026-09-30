import { useEffect, useId, useRef, type ReactNode } from 'react'
import { t } from '../i18n'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  /** Defaults to "Cancel" in the current language. */
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

// A small modal <dialog>, by the same overlay rules as the sheets: focus stays
// inside, Escape cancels, and focus returns to whatever opened it. Cancel gets the
// initial focus, because confirming here is the step that throws something away.
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = t.common.cancel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  // Set when a button already ran its action, so the close event doesn't run one again.
  const handled = useRef(false)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null
      handled.current = false
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Escape (or any close without a button) counts as Cancel. The buttons run their
      // action right away, not on the close event, which fires a moment later.
      onClose={() => {
        if (!handled.current) onCancel()
        handled.current = false
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
          onClick={() => {
            handled.current = true
            onCancel()
            ref.current?.close()
          }}
          className="inline-flex h-11 items-center rounded-lg border border-border-strong px-4 font-semibold hover:border-action hover:text-action"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            handled.current = true
            onConfirm()
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
