export function Placeholder({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-2 text-muted">{children ?? 'Coming in the next build block.'}</div>
    </section>
  )
}
