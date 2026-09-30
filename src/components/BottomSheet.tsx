import { useEffect, useId, useRef, type ReactNode } from 'react'
import { t } from '../i18n'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

// A modal <dialog>: showModal() makes the rest of the page inert (focus stays
// inside) and Escape closes it. Focus goes back to whatever opened it.
export function BottomSheet({ open, onClose, title, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  // Unique, because the filter sheet and the menu can both be on one page.
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        onClose()
        opener.current?.focus()
      }}
      // A click on the backdrop lands on the <dialog> itself.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="mx-0 mt-auto mb-0 flex max-h-[85dvh] w-full max-w-none flex-col rounded-t-2xl bg-surface p-0 text-text backdrop:bg-black/50 not-open:hidden"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={t.common.close}
          className="grid size-10 place-items-center rounded-full text-muted hover:bg-bg hover:text-text"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{open && children}</div>
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </dialog>
  )
}
