const REPO_URL = 'https://github.com/Xinacris/plainly'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted">
        <p>
          <span className="font-semibold text-text">Plainly</span> · A demo store: products and reviews come from
          DummyJSON’s mock API, payment is simulated, and orders stay in this browser.
        </p>
        <a href={REPO_URL} className="font-medium text-action underline underline-offset-2 hover:text-action-hover">
          Source on GitHub
        </a>
      </div>
    </footer>
  )
}
