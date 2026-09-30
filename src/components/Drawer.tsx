import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

// A modal <dialog> that slides in from the right, about 85% of the screen wide,
// over a dimmed backdrop. Like BottomSheet: showModal() makes the rest of the page
// inert (focus stays inside), Escape closes it, a tap on the backdrop closes it, and
// focus goes back to whatever opened it. The slide is skipped with reduced motion.
export function Drawer({ open, onClose, title, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
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
      // A tap on the backdrop lands on the <dialog> itself.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="my-0 mr-0 ml-auto flex h-dvh max-h-none w-[85%] max-w-sm flex-col bg-surface p-0 text-text shadow-xl backdrop:bg-black/50 not-open:hidden motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out starting:open:translate-x-full"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="grid size-11 place-items-center rounded-full text-muted hover:bg-bg hover:text-text"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{open && children}</div>
      {open && footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </dialog>
  )
}
