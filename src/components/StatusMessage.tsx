import type { ReactNode } from 'react'

interface Props {
  title: string
  children?: ReactNode
  action?: ReactNode
  /** Use "alert" for errors so screen readers announce them. */
  role?: 'alert' | 'status'
  /** h2 when the page already has its own h1. */
  level?: 'h1' | 'h2'
}

export function StatusMessage({ title, children, action, role, level: Heading = 'h1' }: Props) {
  return (
    <section role={role} className="mx-auto max-w-xl px-4 py-16 text-center">
      <Heading className="text-2xl font-bold tracking-tight">{title}</Heading>
      {children && <div className="mt-2 text-muted">{children}</div>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </section>
  )
}
